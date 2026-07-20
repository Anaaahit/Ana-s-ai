import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { runAgent, AgentMode, Message } from "./agent-core";
import { runTool, saveUploadedFile, MAX_FILES_PER_REQUEST, MAX_UPLOAD_BYTES } from "./tools";
import {
  registerUser,
  loginUser,
  verifySession,
  invalidateSession,
  createGuestSession,
  updateAvatar,
} from "./auth";
import { getAccountStore, upsertConversation, deleteConversation, PersonaMode } from "./history";

// Resolved relative to process.cwd() — run `npm run server` from the
// project root (day-05), not from inside src.
const __dirname = process.cwd();

const app = express();
app.use(cors());
app.use(express.json({ limit: "8mb" })); // headroom for a few base64 file uploads at once

const publicPath = path.join(__dirname, "src", "public");
app.use(express.static(publicPath));

// List files in the workspace root — powers the file browser panel.
app.get("/files", async (_req, res) => {
  const listing = await runTool("list_files", { path: "." });
  res.json({ listing });
});

// Preview a single file's contents — click-to-view in the browser panel.
app.get("/file", async (req, res) => {
  const filePath = String(req.query.path || "");
  const content = await runTool("read_file", { path: filePath });
  res.json({ path: filePath, content });
});

// Import files from the person's own machine into workspace/uploads/.
// Body shape: { files: [{ name: string, contentBase64: string }] }.
// Per-file extension/size limits live in saveUploadedFile (tools.ts);
// this route only enforces the count cap and shapes the response.
app.post("/upload", async (req, res) => {
  const files = req.body?.files;
  if (!Array.isArray(files) || files.length === 0) {
    res.status(400).json({ error: "No files provided." });
    return;
  }
  if (files.length > MAX_FILES_PER_REQUEST) {
    res.status(400).json({
      error: `Too many files — send at most ${MAX_FILES_PER_REQUEST} at a time.`,
    });
    return;
  }

  const results = files.map((f: any) => saveUploadedFile(f?.name ?? "unnamed", f?.contentBase64 ?? ""));
  res.json({ maxBytesPerFile: MAX_UPLOAD_BYTES, results });
});

// ---- Name + password login (see auth.ts) ----

app.post("/auth/register", (req, res) => {
  const name = String(req.body?.name || "");
  const password = String(req.body?.password || "");
  const result = registerUser(name, password);
  if (!result.ok) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.json({ token: result.token, name: result.name, avatar: result.avatar });
});

app.post("/auth/login", (req, res) => {
  const name = String(req.body?.name || "");
  const password = String(req.body?.password || "");
  const result = loginUser(name, password);
  if (!result.ok) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.json({ token: result.token, name: result.name, avatar: result.avatar });
});

app.post("/auth/session", (req, res) => {
  const token = String(req.body?.token || "");
  const session = verifySession(token);
  if (!session) {
    res.status(401).json({ error: "Session expired or invalid." });
    return;
  }
  res.json({ name: session.name, guest: session.isGuest, avatar: session.avatar });
});

app.post("/auth/logout", (req, res) => {
  const token = String(req.body?.token || "");
  invalidateSession(token);
  res.json({ ok: true });
});

// "Continue without an account" — mints a session for a freshly
// generated guest name straight away, no registration needed. Behaves
// exactly like a normal session everywhere else (same TTL, same
// per-account history), it's just not tied to a name+password the
// person can sign back in with from a different browser/device.
app.post("/auth/guest", (_req, res) => {
  const result = createGuestSession();
  res.json({ token: result.token, name: result.name, guest: true });
});

// Sets the profile picture for whichever account owns this session
// token. Body shape: { token, avatar } where avatar is a data: URL
// (already base64-encoded by the browser's FileReader).
app.post("/profile/avatar", (req, res) => {
  const token = String(req.body?.token || "");
  const avatar = String(req.body?.avatar || "");
  if (!avatar) {
    res.status(400).json({ error: "No image provided." });
    return;
  }
  const result = updateAvatar(token, avatar);
  if (!result.ok) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.json({ ok: true });
});

// ---- Per-account chat history (see history.ts) ----
// The frontend does NOT auto-resume the last conversation on login —
// it always starts a new chat — but it uses this to populate the
// history sidebar with the account's past conversations, and to
// reopen one on request.

function requireSession(req: express.Request, res: express.Response): { name: string } | null {
  const token = String(req.body?.token || req.query.token || "");
  const session = verifySession(token);
  if (!session) {
    res.status(401).json({ error: "Session expired or invalid." });
    return null;
  }
  return session;
}

function toMode(value: any): PersonaMode {
  return value === "friendly" ? "friendly" : "coder";
}

app.get("/history", (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;
  res.json({ store: getAccountStore(session.name) });
});

app.post("/history/conversation", (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;
  const conversation = req.body?.conversation;
  if (!conversation || !conversation.id) {
    res.status(400).json({ error: "Missing conversation." });
    return;
  }
  const store = upsertConversation(session.name, toMode(req.body?.mode), conversation);
  res.json({ store });
});

app.delete("/history/conversation", (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;
  const id = String(req.body?.id || "");
  if (!id) {
    res.status(400).json({ error: "Missing conversation id." });
    return;
  }
  const store = deleteConversation(session.name, toMode(req.body?.mode), id);
  res.json({ store });
});

// The browser sends the FULL conversation so far, which persona to answer
// as ("coder"/"friendly"), and the registered user's name (if any). We run
// the agent loop, then send back the reply plus updated full history.
app.post("/chat", async (req, res) => {
  try {
    const messages: Message[] = req.body.messages || [];
    const mode: AgentMode = req.body.mode === "friendly" ? "friendly" : "coder";
    const userName: string | null = req.body.userName || null;
    const reply = await runAgent(messages, { mode, userName });
    res.json({ reply, messages });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message || "Something went wrong." });
  }
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(PORT, () => {
  console.log(`TealMate server running: http://localhost:${PORT}`);
});