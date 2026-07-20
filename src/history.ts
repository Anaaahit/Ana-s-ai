import * as fs from "fs";
import { Message } from "./agent-core";

// ============================================================
// Per-account chat history.
// ------------------------------------------------------------
// Keyed by "account key" (a registered account's name, or a
// "Guest xxxxxx" label from auth.ts's guest sessions — the caller in
// server.ts always passes session.name, which is either). Each account gets its own set of
// conversations, kept separate per persona ("coder" / "friendly"),
// mirroring the shape the frontend already used to keep in
// localStorage — the difference is this now lives on the server, so
// it survives a different device/browser and a `forget everything`
// on one machine doesn't wipe it on another.
//
// Logging in does NOT resume the last conversation automatically —
// the frontend always starts a fresh "New chat" after sign-in. This
// file only stores the list so it can be shown in the history
// sidebar and reopened on request.
// ============================================================

const HISTORY_FILE = "history.json";

export interface Conversation {
  id: string;
  title: string;
  updatedAt: number;
  messages: Message[];
}

export interface PersonaBucket {
  activeId: string | null;
  conversations: Conversation[];
}

export interface AccountStore {
  coder: PersonaBucket;
  friendly: PersonaBucket;
}

export type PersonaMode = "coder" | "friendly";

type HistoryFile = Record<string, AccountStore>;

function emptyStore(): AccountStore {
  return {
    coder: { activeId: null, conversations: [] },
    friendly: { activeId: null, conversations: [] },
  };
}

function loadAll(): HistoryFile {
  if (!fs.existsSync(HISTORY_FILE)) return {};
  try {
    const raw = fs.readFileSync(HISTORY_FILE, "utf-8").trim();
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (e) {
    console.error("Warning: history.json is corrupted, starting fresh.", e);
    return {};
  }
}

function saveAll(all: HistoryFile): void {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(all, null, 2), "utf-8");
}

// Returns this account's stored conversations (both personas). Never
// returns null — a brand-new account just gets empty buckets.
export function getAccountStore(accountKey: string): AccountStore {
  const all = loadAll();
  return all[accountKey] || emptyStore();
}

// Creates or overwrites a single conversation inside one persona's
// bucket, then returns the account's full (updated) store so the
// caller can send the fresh sidebar list straight back.
export function upsertConversation(
  accountKey: string,
  mode: PersonaMode,
  conversation: Conversation
): AccountStore {
  const all = loadAll();
  const store = all[accountKey] || emptyStore();
  const bucket = store[mode];
  const idx = bucket.conversations.findIndex((c) => c.id === conversation.id);
  if (idx >= 0) bucket.conversations[idx] = conversation;
  else bucket.conversations.unshift(conversation);
  all[accountKey] = store;
  saveAll(all);
  return store;
}

// Removes one conversation from one persona's bucket.
export function deleteConversation(accountKey: string, mode: PersonaMode, id: string): AccountStore {
  const all = loadAll();
  const store = all[accountKey] || emptyStore();
  store[mode].conversations = store[mode].conversations.filter((c) => c.id !== id);
  all[accountKey] = store;
  saveAll(all);
  return store;
}