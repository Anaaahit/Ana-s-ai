import * as crypto from "crypto";
import * as fs from "fs";

// ============================================================
// Name + password login.
// ------------------------------------------------------------
// Flow: registerUser(name, password) creates a brand-new account and
// signs it in. loginUser(name, password) checks the password and
// mints a session token. verifySession(token) / invalidateSession(token)
// back the "stay signed in" + logout behavior in the frontend.
//
// No email, no verification codes — just a name and a password.
// Passwords are hashed with scrypt (Node's built-in, no extra
// dependency) with a random per-user salt, and only the hash + salt
// are ever written to disk.
// ============================================================

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // sessions last 30 days
const USERS_FILE = "users.json";
const SESSIONS_FILE = "sessions.json";

const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 40;
const MIN_PASSWORD_LENGTH = 6;

interface StoredUser {
  name: string; // original casing, as the user typed it at registration
  salt: string;
  passwordHash: string;
  avatar?: string; // data: URL for the profile picture, if one was ever set
}
interface Session {
  name: string;
  expiresAt: number;
  // true for a "continue without an account" guest session — `name`
  // above holds a generated guest label (e.g. "Guest 4f2a") rather
  // than a registered account name in that case.
  isGuest?: boolean;
  // Copied in at session creation from the user's stored avatar (for
  // registered accounts), or set directly via updateAvatar() for guest
  // sessions, which have no persistent user record to keep it in.
  avatar?: string;
}

// Users and sessions are both small and read/written rarely relative
// to a request, so plain read-whole-file/write-whole-file is fine here
// (same approach history.ts and the old auth.ts already used).
type UsersFile = Record<string, StoredUser>; // keyed by lowercased name
type SessionsFile = Record<string, Session>;

function loadUsers(): UsersFile {
  if (!fs.existsSync(USERS_FILE)) return {};
  try {
    const raw = fs.readFileSync(USERS_FILE, "utf-8").trim();
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error("Warning: users.json is corrupted, starting fresh.", e);
    return {};
  }
}
function saveUsers(users: UsersFile): void {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
}

function loadSessions(): SessionsFile {
  if (!fs.existsSync(SESSIONS_FILE)) return {};
  try {
    const raw = fs.readFileSync(SESSIONS_FILE, "utf-8").trim();
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error("Warning: sessions.json is corrupted, starting fresh.", e);
    return {};
  }
}
function saveSessions(sessions: SessionsFile): void {
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), "utf-8");
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function createSession(name: string, isGuest = false, avatar?: string): { token: string } {
  const token = generateToken();
  const sessions = loadSessions();
  sessions[token] = { name, expiresAt: Date.now() + SESSION_TTL_MS, isGuest, avatar };
  saveSessions(sessions);
  return { token };
}

// ---- Validation ----

function validateName(name: string): string | null {
  if (name.length < MIN_NAME_LENGTH) {
    return `Name must be at least ${MIN_NAME_LENGTH} characters.`;
  }
  if (name.length > MAX_NAME_LENGTH) {
    return `Name must be ${MAX_NAME_LENGTH} characters or fewer.`;
  }
  return null;
}

function validatePassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return null;
}

// ---- Register ----

export interface AuthResult {
  ok: boolean;
  error?: string;
  token?: string;
  name?: string;
  avatar?: string;
}

export function registerUser(name: string, password: string): AuthResult {
  const trimmedName = name.trim();
  const nameError = validateName(trimmedName);
  if (nameError) return { ok: false, error: nameError };
  const passwordError = validatePassword(password);
  if (passwordError) return { ok: false, error: passwordError };

  const key = trimmedName.toLowerCase();
  const users = loadUsers();
  if (users[key]) {
    return { ok: false, error: "That name is already taken — try logging in instead." };
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = hashPassword(password, salt);
  users[key] = { name: trimmedName, salt, passwordHash };
  saveUsers(users);

  const { token } = createSession(trimmedName);
  return { ok: true, token, name: trimmedName };
}

// ---- Login ----

export function loginUser(name: string, password: string): AuthResult {
  const trimmedName = name.trim();
  const key = trimmedName.toLowerCase();
  const users = loadUsers();
  const user = users[key];
  if (!user) {
    return { ok: false, error: "No account with that name — register first." };
  }

  const candidateHash = hashPassword(password, user.salt);
  const matches = crypto.timingSafeEqual(
    Buffer.from(candidateHash, "hex"),
    Buffer.from(user.passwordHash, "hex")
  );
  if (!matches) {
    return { ok: false, error: "Incorrect password." };
  }

  const { token } = createSession(user.name, false, user.avatar);
  return { ok: true, token, name: user.name, avatar: user.avatar };
}

export function verifySession(token: string): { name: string; isGuest: boolean; avatar?: string } | null {
  if (!token) return null;
  const sessions = loadSessions();
  const session = sessions[token];
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    delete sessions[token];
    saveSessions(sessions);
    return null;
  }
  return { name: session.name, isGuest: !!session.isGuest, avatar: session.avatar };
}

// Updates the profile picture for whichever account owns this session
// token. Persists to users.json for a registered account (so it
// survives future logins); for a guest session, it's kept only on the
// session record itself, since there's no persistent user to store it
// against.
export function updateAvatar(token: string, avatarDataUrl: string): { ok: boolean; error?: string } {
  if (!token) return { ok: false, error: "Not signed in." };
  if (avatarDataUrl.length > 2_000_000) {
    return { ok: false, error: "That image is too large." };
  }
  const sessions = loadSessions();
  const session = sessions[token];
  if (!session) return { ok: false, error: "Session expired or invalid." };

  session.avatar = avatarDataUrl;
  saveSessions(sessions);

  if (!session.isGuest) {
    const users = loadUsers();
    const key = session.name.toLowerCase();
    if (users[key]) {
      users[key].avatar = avatarDataUrl;
      saveUsers(users);
    }
  }

  return { ok: true };
}

// ============================================================
// Guest sign-in ("continue without an account")
// ------------------------------------------------------------
// Skips registration entirely and just mints a session straight away,
// keyed to a freshly generated guest label instead of a registered
// account. Guest sessions behave exactly like normal sessions
// everywhere else (same TTL, same history storage keyed off `name`),
// so a guest's chat history still persists across restarts as long
// as they hold on to the token — it just isn't tied to a name they
// can log back in with from another device.
// ============================================================

export interface GuestSessionResult {
  ok: boolean;
  token: string;
  name: string;
}

export function createGuestSession(): GuestSessionResult {
  const guestName = "Guest " + crypto.randomBytes(3).toString("hex");
  const { token } = createSession(guestName, true);
  return { ok: true, token, name: guestName };
}

export function invalidateSession(token: string): void {
  if (!token) return;
  const sessions = loadSessions();
  if (sessions[token]) {
    delete sessions[token];
    saveSessions(sessions);
  }
}