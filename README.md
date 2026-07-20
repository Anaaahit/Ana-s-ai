# Day 5: Memory, Context & Planning

> **This is starter code.** Fill in the `TODO` comments as we build together in class.
> Stuck or catching up? The finished version is in [`solutions/day-05`](../solutions/day-05/).


## What We Learned
- Short-term memory (the `messages` array) vs long-term memory (a file)
- Context windows: Claude can read a lot, but not infinitely
- Planning: tell Claude to think before it acts (just a system prompt!)
- Assembled the **complete agent template** — your Week 2 starting point

## Setup
```bash
cd day-05
npm install
cp .env.example .env   # then paste your key into .env
# (or export it directly: export ANTHROPIC_API_KEY="your-key-here")
```

## Scripts
| File | What it does | Run it |
|------|-------------|--------|
| `src/tools.ts` | Shared tools + dispatcher | — |
| `src/01-memory.ts` | File-based long-term memory | `npm run memory` |
| `src/02-planning.ts` | A planning system prompt | `npm run planning` |
| `src/agent.ts` | **The complete agent — fork this for Week 2!** | `npm run agent` |

## The Agent Recipe
Every agent = four ingredients:
1. **Tools** — functions Claude can request
2. **Loop** — call, run tools, repeat
3. **Prompt** — plan + personality + rules
4. **Memory** — remember what matters

## Make It Your Own (Week 2)
1. Edit `SYSTEM_PROMPT` in `agent.ts` to give your agent a job + personality
2. Add your own tools in `tools.ts` (function + definition + dispatcher case)
3. Run `npm run agent` and chat with your creation!
