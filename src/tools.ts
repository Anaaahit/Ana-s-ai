import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { saveMemoryFact, clearMemory } from "./memory";

// A Gemini function declaration: name + description + a raw JSON Schema
// object describing its parameters (Gemini accepts plain JSON Schema here,
// same shape Anthropic's `input_schema` used).
export interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parametersJsonSchema: Record<string, any>;
}

// ============================================================
// Tools for a CODING agent. Each tool is two things:
//   1. a DEFINITION (what Claude sees)
//   2. a FUNCTION (what our code runs)
// The dispatcher at the bottom connects names to functions.
//
// SAFETY: every file/command tool is confined to a "workspace"
// folder so the agent can't wander off and touch random parts of
// your machine. Change WORKSPACE_DIR if you want it to work
// somewhere else.
// ============================================================

export const WORKSPACE_DIR = path.resolve("./workspace");
if (!fs.existsSync(WORKSPACE_DIR)) {
  fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
}

// Resolves a user-given path and makes sure it can't escape the
// workspace folder (blocks things like "../../etc/passwd").
export function safePath(relativePath: string): string {
  const resolved = path.resolve(WORKSPACE_DIR, relativePath);
  if (!resolved.startsWith(WORKSPACE_DIR)) {
    throw new Error("Path escapes the workspace folder — not allowed.");
  }
  return resolved;
}

// ============================================================
// File import (upload) support
// ------------------------------------------------------------
// Lets the person drop a file from their own machine into the
// workspace via the web UI, so the agent can then read/list/edit it
// with its normal tools. Kept deliberately conservative:
//   - text-like extensions only (no binaries, no executables)
//   - a hard size cap per file
//   - a hard count cap per request
//   - filenames are stripped to a basename and sanitized, and land
//     inside workspace/uploads/ rather than wherever the caller says
// ============================================================

export const UPLOAD_SUBDIR = "uploads";
export const MAX_UPLOAD_BYTES = 1_000_000; // 1MB per file
export const MAX_FILES_PER_REQUEST = 5;

// Whitelist, not a blocklist — deliberately excludes anything
// executable. (.py/.js/.ts are included for reading/editing purposes;
// run_command is already sandboxed to the workspace either way.)
const ALLOWED_UPLOAD_EXTENSIONS = new Set([
  ".txt", ".md", ".json", ".csv", ".tsv", ".log",
  ".js", ".ts", ".jsx", ".tsx", ".py", ".html", ".css",
  ".yml", ".yaml", ".xml",
]);

function sanitizeUploadFilename(name: string): string {
  // Strip any directory components the client tries to sneak in, and
  // drop anything that isn't a safe filename character.
  const base = path.basename(name).replace(/[^a-zA-Z0-9._-]/g, "_");
  return base.length > 0 ? base : "unnamed_file";
}

// Avoid silently clobbering an existing upload with the same name —
// append a short numeric suffix instead.
function uniqueUploadPath(dir: string, filename: string): { full: string; finalName: string } {
  const ext = path.extname(filename);
  const stem = filename.slice(0, filename.length - ext.length);
  let candidate = filename;
  let i = 1;
  while (fs.existsSync(path.join(dir, candidate))) {
    candidate = `${stem}_${i}${ext}`;
    i++;
  }
  return { full: path.join(dir, candidate), finalName: candidate };
}

export interface UploadResult {
  ok: boolean;
  name: string;
  finalName?: string;
  workspacePath?: string;
  bytes?: number;
  error?: string;
}

// Saves one base64-encoded file into workspace/uploads/, enforcing the
// extension whitelist and size cap. Does not throw — always returns a
// result so a batch of files can partially succeed.
export function saveUploadedFile(name: string, contentBase64: string): UploadResult {
  const safeName = sanitizeUploadFilename(name);
  const ext = path.extname(safeName).toLowerCase();

  if (!ALLOWED_UPLOAD_EXTENSIONS.has(ext)) {
    return { ok: false, name, error: `File type "${ext || "(none)"}" isn't allowed.` };
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(contentBase64, "base64");
  } catch {
    return { ok: false, name, error: "Couldn't decode file content." };
  }

  if (buffer.length === 0) {
    return { ok: false, name, error: "File is empty." };
  }
  if (buffer.length > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      name,
      error: `File is ${buffer.length} bytes, over the ${MAX_UPLOAD_BYTES} byte limit.`,
    };
  }

  const uploadsDir = safePath(UPLOAD_SUBDIR);
  fs.mkdirSync(uploadsDir, { recursive: true });

  const { full, finalName } = uniqueUploadPath(uploadsDir, safeName);
  fs.writeFileSync(full, buffer);

  return {
    ok: true,
    name,
    finalName,
    workspacePath: `${UPLOAD_SUBDIR}/${finalName}`,
    bytes: buffer.length,
  };
}

// ---- calculator ----
export const calculatorTool: GeminiFunctionDeclaration = {
  name: "calculator",
  description: "Performs basic arithmetic for exact math answers.",
  parametersJsonSchema: {
    type: "object",
    properties: {
      a: { type: "number" },
      b: { type: "number" },
      operation: { type: "string", enum: ["add", "subtract", "multiply", "divide"] },
    },
    required: ["a", "b", "operation"],
  },
};

function runCalculator(input: any): string {
  const { a, b, operation } = input;
  if (operation === "add") return String(a + b);
  if (operation === "subtract") return String(a - b);
  if (operation === "multiply") return String(a * b);
  return String(a / b);
}

// ---- read_file ----
export const readFileTool: GeminiFunctionDeclaration = {
  name: "read_file",
  description:
    "Read the contents of a file inside the workspace folder. Path is relative to the workspace root, e.g. 'src/index.ts'.",
  parametersJsonSchema: {
    type: "object",
    properties: { path: { type: "string" } },
    required: ["path"],
  },
};

function readFile(input: any): string {
  const full = safePath(input.path);
  if (!fs.existsSync(full)) return `Error: file not found: ${input.path}`;
  return fs.readFileSync(full, "utf-8");
}

// ---- write_file ----
export const writeFileTool: GeminiFunctionDeclaration = {
  name: "write_file",
  description:
    "Create or overwrite a file inside the workspace folder with the given content. Creates parent folders if needed.",
  parametersJsonSchema: {
    type: "object",
    properties: {
      path: { type: "string" },
      content: { type: "string" },
    },
    required: ["path", "content"],
  },
};

function writeFile(input: any): string {
  const full = safePath(input.path);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, input.content, "utf-8");
  return `Wrote ${input.content.length} chars to ${input.path}`;
}

// ---- list_files ----
export const listFilesTool: GeminiFunctionDeclaration = {
  name: "list_files",
  description:
    "List files and folders inside a directory in the workspace (non-recursive). Use '.' for the workspace root.",
  parametersJsonSchema: {
    type: "object",
    properties: { path: { type: "string" } },
    required: ["path"],
  },
};

function listFiles(input: any): string {
  const full = safePath(input.path);
  if (!fs.existsSync(full)) return `Error: directory not found: ${input.path}`;
  const entries = fs.readdirSync(full, { withFileTypes: true });
  return entries
    .map((e) => (e.isDirectory() ? `${e.name}/` : e.name))
    .join("\n") || "(empty)";
}

// ---- run_command ----
// Runs a shell command inside the workspace folder — useful for things
// like `npm install`, `npm test`, `node script.js`, `tsc --noEmit`.
// Deliberately NOT sandboxed beyond the cwd + a timeout, so only run
// this agent against code/commands you trust.
export const runCommandTool: GeminiFunctionDeclaration = {
  name: "run_command",
  description:
    "Run a shell command inside the workspace folder (e.g. 'npm install', 'node script.js', 'npm test'). Returns stdout/stderr. 10 second timeout.",
  parametersJsonSchema: {
    type: "object",
    properties: { command: { type: "string" } },
    required: ["command"],
  },
};

function runCommand(input: any): string {
  try {
    const output = execSync(input.command, {
      cwd: WORKSPACE_DIR,
      timeout: 10_000,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return output || "(command produced no output)";
  } catch (e: any) {
    // execSync throws on non-zero exit — surface stdout/stderr so the
    // agent can see the actual error and fix it.
    const out = e.stdout ? e.stdout.toString() : "";
    const err = e.stderr ? e.stderr.toString() : e.message;
    return `Command failed.\nSTDOUT:\n${out}\nSTDERR:\n${err}`;
  }
}

// ---- remember_fact ----
// Actually persists a fact to memory.json, so it survives across
// sessions/restarts (previously nothing wrote to this file at all).
export const rememberFactTool: GeminiFunctionDeclaration = {
  name: "remember_fact",
  description:
    "Save a durable fact about this project or the user to long-term memory (memory.json). Use this when the user tells you something worth remembering for future sessions.",
  parametersJsonSchema: {
    type: "object",
    properties: { fact: { type: "string" } },
    required: ["fact"],
  },
};

// ---- forget_everything ----
// Wipes memory.json. Use this when the user explicitly asks the agent to
// forget everything it has remembered about the project.
export const forgetEverythingTool: GeminiFunctionDeclaration = {
  name: "forget_everything",
  description:
    "Erase all remembered facts in long-term memory (memory.json). Only use this when the user explicitly asks to clear/forget everything remembered.",
  parametersJsonSchema: {
    type: "object",
    properties: {},
    required: [],
  },
};

// All tool definitions Claude can see
export const allTools: GeminiFunctionDeclaration[] = [
  calculatorTool,
  readFileTool,
  writeFileTool,
  listFilesTool,
  runCommandTool,
  rememberFactTool,
  forgetEverythingTool,
];

// The dispatcher: maps a tool name to the real function that runs it.
export async function runTool(name: string, input: any): Promise<string> {
  switch (name) {
    case "calculator":
      return runCalculator(input);
    case "read_file":
      return readFile(input);
    case "write_file":
      return writeFile(input);
    case "list_files":
      return listFiles(input);
    case "run_command":
      return runCommand(input);
    case "remember_fact":
      return saveMemoryFact(input.fact);
    case "forget_everything":
      return clearMemory();
    default:
      return "Error: unknown tool " + name;
  }
}