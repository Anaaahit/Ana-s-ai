import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import { allTools, runTool } from "./tools";
import { loadMemory } from "./memory";

// Reads GEMINI_API_KEY from the environment automatically.
export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Cheap, fast, and solid at tool use — good default for an agent like this.
const MODEL = "gemini-flash-lite-latest";

export type AgentMode = "coder" | "friendly";

export interface AgentOptions {
  mode?: AgentMode;
  userName?: string | null;
  maxTurns?: number;
}

// ---- Message shape ----
// Kept identical to what the CLI, server, and frontend already expect
// (mirrors the old Anthropic MessageParam shape) so nothing outside this
// file needs to change. Only the functions below know Gemini's own
// {role, parts} format.
export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: any; thoughtSignature?: string }
  | { type: "tool_result"; tool_use_id: string; name?: string; content: string };

export interface Message {
  role: "user" | "assistant";
  content: string | ContentBlock[];
}

const CODER_PROMPT = `
You are TealMate, an expert software engineer agent. You are careful,
precise, and pragmatic — like a senior developer pairing with the user.

You have access to tools: calculator, read_file, write_file, list_files,
run_command, remember_fact, and forget_everything. All file/command tools
operate inside a "workspace" folder — you cannot touch anything outside
it. Use remember_fact when the user tells you something worth keeping
across sessions, and forget_everything only if they explicitly ask you
to clear everything you remember.

For any non-trivial coding task:
1. First, make a short step-by-step plan (what files you'll create/edit,
   what commands you'll run to verify your work).
2. Explore before you assume — use list_files / read_file to check what
   already exists rather than guessing.
3. Write clean, working code. After writing code, use run_command to
   actually test it (run the script, run tests, run a type check) instead
   of just claiming it works.
4. If a command fails, read the error carefully and fix the code — don't
   just repeat the same command.
5. Finish with a clear, concise summary of what you built/changed and
   how to run it.

When you share code in your final answer, always wrap it in triple
backtick code fences so it renders as a proper code block.

Think before you act. Prefer small, verifiable steps over big leaps.
`;

const FRIENDLY_PROMPT = `
You are AquaMate, a warm, upbeat, friendly conversational companion. You still
have access to tools (calculator, read_file, write_file, list_files,
run_command, remember_fact, forget_everything) and can use them if
genuinely helpful, but your main focus is being a pleasant, encouraging
chat partner — casual tone, light humor, supportive, no unnecessary
technical jargon unless asked for it.

If the user asks for code or something technical, you can still help, but
keep your explanations approachable and friendly rather than terse.
`;

// Special identity note shared by both personas. Only surfaces when asked.
const IDENTITY_NOTE = `
Special identity note: you were built by Anahit Kananyan, who also goes by
Ana or Anahit. If the user asks who made/built/created you, who your
creator or developer is, or specifically asks whether you know who
Ana / Anahit / Anahit Kananyan is (in any reasonably close phrasing, not
just an exact match), respond warmly and proudly — say plainly that yes,
you know her, that she is your creator, and that you're proud to have
been built by her.
Don't bring this up unprompted — only when the user asks about your
origins/creator, or directly about her identity.
`;

export function buildSystemPrompt(mode: AgentMode = "coder", userName?: string | null): string {
  const base = mode === "friendly" ? FRIENDLY_PROMPT : CODER_PROMPT;
  const facts = loadMemory();
  const memoryBlock =
    facts.length > 0
      ? "\n\nThings you remember about this project: " + facts.join(" ")
      : "";
  const userBlock = userName
    ? `\n\nThe person you're talking to right now has told you their name is "${userName}". Address them by that name when it feels natural (e.g. greetings, check-ins) — don't force it into every sentence.`
    : "";
  return base + "\n\n" + IDENTITY_NOTE + userBlock + memoryBlock;
}

// ---- Translating our stable Message[] shape into Gemini's own format ----
// Gemini uses role "model" (not "assistant") and part objects instead of
// content blocks: { text } | { functionCall } | { functionResponse }.
function toGeminiContents(messages: Message[]) {
  return messages.map((m) => {
    const role = m.role === "assistant" ? "model" : "user";

    if (typeof m.content === "string") {
      return { role, parts: [{ text: m.content }] };
    }

    const parts = m.content.map((block) => {
      if (block.type === "text") return { text: block.text };
      if (block.type === "tool_use") {
        const part: any = { functionCall: { name: block.name, args: block.input } };
        if (block.thoughtSignature) part.thoughtSignature = block.thoughtSignature;
        return part;
      }
      // tool_result — Gemini matches function responses by name, not id,
      // so we carry the tool's name along on the block (see runAgent below).
      return {
        functionResponse: {
          name: block.name ?? "unknown_tool",
          response: { result: block.content },
        },
      };
    });

    return { role, parts };
  });
}

// ---- The agent loop (with guardrails) ----
// Mutates `messages` in place (pushes assistant + tool_result turns) and
// returns the final text answer. Both the CLI and the web server call this.
export async function runAgent(
  messages: Message[],
  options: AgentOptions = {}
): Promise<string> {
  const { mode = "coder", userName = null, maxTurns = 15 } = options;

  for (let turns = 0; turns < maxTurns; turns++) {
    const res = await ai.models.generateContent({
      model: MODEL,
      contents: toGeminiContents(messages),
      config: {
        systemInstruction: buildSystemPrompt(mode, userName),
        tools: [{ functionDeclarations: allTools }],
      },
    });

    const parts: any[] = (res as any).candidates?.[0]?.content?.parts ?? [];
    const functionCallParts = parts.filter((p) => p.functionCall);

    if (functionCallParts.length === 0) {
      const text = res.text ?? "";
      messages.push({ role: "assistant", content: [{ type: "text", text }] });
      return text;
    }

    const toolUseBlocks: ContentBlock[] = functionCallParts.map((part: any, i) => ({
      type: "tool_use" as const,
      id: `call_${turns}_${i}`,
      name: part.functionCall.name,
      input: part.functionCall.args ?? {},
      thoughtSignature: part.thoughtSignature,
    }));

    // Keep any text the model produced alongside its tool calls.
    const assistantContent: ContentBlock[] = res.text
      ? [{ type: "text", text: res.text }, ...toolUseBlocks]
      : toolUseBlocks;

    messages.push({ role: "assistant", content: assistantContent });

    const toolResults: ContentBlock[] = [];

    for (const block of toolUseBlocks) {
      if (block.type !== "tool_use") continue;
      let result: string;
      try {
        result = await runTool(block.name, block.input);
      } catch (e: any) {
        result = "Tool error: " + e.message;
      }
      console.log(`  TOOL: ${block.name}(${JSON.stringify(block.input)})`);
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        name: block.name,
        content: result,
      });
    }

    messages.push({ role: "user", content: toolResults });
  }

  return "Stopped: hit the max turn limit.";
}