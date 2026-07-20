import * as fs from "fs";

const MEMORY_FILE = "memory.json";

// ---- Memory helpers ----
export function loadMemory(): string[] {
  if (!fs.existsSync(MEMORY_FILE)) return [];
  try {
    const raw = fs.readFileSync(MEMORY_FILE, "utf-8").trim();
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Warning: memory.json is corrupted, starting fresh.", e);
    return [];
  }
}

// Appends a new fact to memory.json. This is what was missing before —
// loadMemory() could only ever reflect whatever you'd typed into the file
// by hand, because nothing in the codebase ever called a save function.
export function saveMemoryFact(fact: string): string {
  const facts = loadMemory();
  facts.push(fact);
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(facts, null, 2), "utf-8");
  return `Remembered: ${fact}`;
}

// Removes every stored fact — used when you actually want the agent to
// forget everything in memory.json, as opposed to just clearing chat history.
export function clearMemory(): string {
  fs.writeFileSync(MEMORY_FILE, "[]", "utf-8");
  return "Cleared all remembered facts.";
}