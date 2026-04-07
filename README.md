Discord [here](https://discord.gg/zVemMYTd)

# 🌱 garden-md

Turn your meeting transcripts into a Wiki for your company.

Hi ! We're the founders behind BasaltAI, and when we started using OpenClaw in March 26, it changed the way we work. 

Something truly unlocked this for us: creating a company brain that maps out every meeting, every customer, every product and people, giving Claw or Claude Code unlimited context to answer our questions. 

We quickly realised that Claude knew our company better than we did, and became more proficient at coding, GTM and any day to day task.

So we decided to open-source this. 

Five commands. Under 2 minutes. Your scattered transcripts become a structured, linked, browsable company wiki — all local markdown files, no cloud, lives locally on your machine.

Fork it. Improve it. Make it yours.

*Built by the [Basalt](https://getbasalt.ai) team. 

## Install

```bash
npm install -g garden-md
```

Requires Node.js 18+ and an API key from any supported AI provider.

## Quick Start

```bash
garden init              # set up AI provider + wiki structure
garden connect           # connect Grain, Granola, Fireflies, or any service
garden sync              # pull your transcripts
garden tend              # process everything → linked wiki pages
garden open              # browse your wiki at localhost:4242
garden watch             # auto-sync + tend every 30 min (set it and forget it)
```

## Demo

Connect your data sources. When you run 'garden sync' it will send all new transcripts to the "wildland". Run 'garden tend' to organise the data and add it to your wiki. That's it. Keep that garden clean and organized !

```
$ garden connect

🔌 Connect a data source

? Which service do you want to connect?
❯ Grain — Meeting recordings & transcripts from Grain
  Granola — Meeting notes & transcripts from Granola
  Fireflies — Meeting transcripts & summaries from Fireflies.ai
  Other — connect any service with an API

? API key for Grain: grain_pat_***

✓ Connected to Grain
  419 items in wildland

$ garden tend

🌿 Tending 419 items...
  → Extracted 847 entities
  → Created 312 People pages
  → Created 89 Company pages
  → Created 67 Product pages
  → Generated HTML wiki

✓ Wiki updated. Run `garden open` to browse.
```

## What it does

**garden-md** reads your meeting transcripts and builds a company knowledge base from them:

- **Syncs** transcripts from Grain, Granola, Fireflies, or any API-based service
- **Extracts** entities — people, companies, products/tools — across all your documents
- **Links** mentions as standard markdown links (no content rewriting, no summaries)
- **Creates** stub pages that grow over time as more documents reference them
- **Renders** a Wikipedia-style HTML wiki with sidebar navigation, search, and backlinks
- **Commits** changes to git automatically (optional)

## What it doesn't do

- Rewrite or summarize your content (transcripts stay verbatim)
- Store data in the cloud (everything is local markdown files)
- Require a subscription (BYOK — bring your own AI key)
- Need a database (it's just folders of `.md` files)

## Built-in Connectors

| Service | Type | Status |
|---------|------|--------|
| **Grain** | Meeting recordings & transcripts | ✅ Tested |
| **Granola** | Meeting notes & transcripts | ✅ Built |
| **Fireflies.ai** | Meeting transcripts & summaries | ✅ Built |
| **Other** | Any service with an API | LLM-generated with review |

Built-in connectors use pre-built, tested scripts — no AI code generation. For services not in the list, choose "Other" and provide the service name + API docs URL. The AI will generate a connector script and show it for your review before running.

## Commands

| Command | Description |
|---------|-------------|
| `garden init` | Interactive setup — pick AI provider, configure wiki location, enable git |
| `garden connect` | Connect a data source from the picker (Grain, Granola, Fireflies, Other) |
| `garden connect --repair` | Fix a broken connector (works even if setup failed mid-way) |
| `garden sync` | Run all connectors now |
| `garden sync --schedule` | Set up cron for automatic sync |
| `garden tend` | Process wildland → wiki with entity linking |
| `garden open` | Generate HTML wiki + open in browser |
| `garden config` | Update AI provider, API key, schedule |
| `garden add <folder>` | Add a wiki folder |
| `garden remove <folder>` | Remove a wiki folder |
| `garden rename <a> <b>` | Rename a wiki folder |
| `garden list` | Show wiki folders with page counts |
| `garden watch` | Auto-sync + tend on a loop — set it and forget it |
| `garden watch --interval 15` | Custom interval (default: 30 min) |
| `garden watch --once` | Run one sync+tend cycle and exit |
| `garden uninstall` | Remove config + cron entries (wiki files are kept) |

## Auto-Pilot Mode

Don't want to run `sync` and `tend` manually? Use `watch`:

```bash
garden watch                # sync + tend every 30 minutes
garden watch --interval 15  # every 15 minutes
garden watch --once         # one cycle, then exit (great for cron/CI)
```

It runs immediately on start, then loops. If there are no new transcripts, it skips the tend step. Ctrl+C to stop.

**Set it and forget it:** Start `garden watch` in a tmux/screen session or as a systemd service, and your wiki stays up to date automatically — every new meeting flows in, gets processed, and your AI agents get smarter without you touching anything.

## How it works

### Architecture

```
┌─────────────┐     ┌───────────┐     ┌──────────┐     ┌──────────┐
│  Grain /     │────▶│ Wildland  │────▶│  Wiki    │────▶│  HTML    │
│  Granola /   │sync │ (staging) │tend │ (linked  │open │ (browse) │
│  Fireflies   │     │ raw .md   │     │  .md)    │     │          │
└─────────────┘     └───────────┘     └──────────┘     └──────────┘
```

### `garden tend` in detail

1. Reads raw documents from the **wildland** (staging area)
2. Sends content to your AI provider for **entity extraction**
3. Identifies **people**, **companies**, and **products/tools**
4. Inserts standard markdown links into the original text (no content changes)
5. Creates **stub pages** for new entities with backlinks
6. Updates the **Index.md** with folder-grouped navigation
7. Generates a **Wikipedia-style HTML wiki** with sidebar, search, and backlinks
8. Auto-commits to git (if enabled)

### Wiki structure

```
~/.garden/
├── config.yaml              # AI provider, paths, schedule
└── connectors/              # Sync scripts + API keys
    ├── grain.mjs
    └── grain.key

~/wiki/                      # Your wiki (configurable path)
├── Index.md                 # Root index with recent activity
├── .garden-meta.json        # Display name metadata sidecar
├── Meetings/
│   ├── Index.md             # Auto-generated folder index with descriptions
│   ├── weekly-standup.md    # Linked transcript with entity references
│   └── investor-call.md
├── People/
│   ├── Index.md
│   ├── sarah-chen.md        # Enriched stub: role, context, backlinks
│   └── michael-seibel.md
└── Companies/
    ├── Index.md
    ├── acme-corp.md          # Enriched stub: relationship, relevance
    └── bland-ai.md

~/wiki-wildland/             # Raw synced transcripts (staging area)
~/wiki-html/                 # Generated HTML wiki (served by garden open)
```

**Default folders:** Meetings, People, Companies. Add more with `garden add Products`, `garden add Decisions`, etc.

## AI Providers

| Provider | Model | Notes |
|----------|-------|-------|
| **Anthropic** | Claude Sonnet | Recommended — best entity extraction |
| **OpenAI** | GPT-4o | Good alternative |
| **Google** | Gemini Pro | Works well |
| **Ollama** | Any local model | Free, private, slower |
| **Claude CLI** | claude --print | Uses your Claude Code subscription |

During `garden init`, providers are auto-detected based on what's installed on your machine. Pick from an arrow-key menu — no typing required.

## Security

- **API keys** are stored in `~/.garden/config.yaml` with `0600` permissions (owner-only)
- **Connector keys** are stored as separate `.key` files with `0600` permissions
- **No shell injection** — all subprocess calls use `execFileSync` with argument arrays
- **LLM-generated connectors** (for "Other" services) require explicit review before execution
- **Prompt injection defense** — entity extraction prompts include guards against malicious transcript content
- **No data leaves your machine** except API calls to your chosen AI provider

### Known limitations

- API keys are stored in plaintext (no keychain integration yet)
- Connector API keys are encrypted only by filesystem permissions
- Prompt injection mitigation is defense-in-depth, not foolproof

## Why This Makes AI Agents Smarter

garden-md isn't just for humans browsing a wiki. The real power is that **your AI agents get company memory**.

### The Problem

AI agents are smart but amnesiac. Every session starts blank. Ask Claude, ChatGPT, or any coding agent "who did we meet with last week?" — nothing. "What did we decide about pricing?" — nothing. They have zero institutional knowledge about your company, your people, your decisions.

Meanwhile, all that context sits locked inside meeting recordings nobody re-watches.

### The Fix

garden-md turns those recordings into structured markdown that agents can read natively:

```
~/wiki/
├── People/sarah-chen.md      ← agent knows who Sarah is
├── Companies/acme-corp.md    ← agent knows the Acme deal context
├── Meetings/standup-04-01.md ← agent knows what was discussed
└── Products/agentphone.md    ← agent knows what you're building
```

**Markdown is the universal agent context format.** Every major AI tool — Claude Code, Cursor, Windsurf, GPT — reads `.md` files natively. No plugins, no integrations, no API calls. Just files on disk.

### How Agents Use It

### Auto-Wiring (Step 5 of `garden init`)

During setup, garden-md detects which AI coding agents you have and wires them automatically:

| Agent | Config file | Auto-wired |
|-------|------------|------------|
| **Claude Code** | `~/.claude/CLAUDE.md` | ✅ |
| **OpenAI Codex** | `~/AGENTS.md` | ✅ |
| **OpenClaw** | `~/.openclaw/workspace/MEMORY.md` + `AGENTS.md` | ✅ |
| **Cursor** | `~/.cursorrules` | ✅ |
| **Windsurf** | `~/.windsurfrules` | ✅ |

The wired instructions tell the agent: *"Before answering questions about people, companies, or meetings — read the relevant wiki page first."* Not a vague pointer. Explicit behavior: asked about Sarah? Read `People/sarah-chen.md`. Drafting an email? Check recent `Meetings/` for context.

`garden uninstall` cleanly removes the section from all four files.

**Any other agent with file access** — The wiki is just folders of markdown. Point any agent at `~/wiki/` and it gains your company's institutional memory. No plugins, no integrations.

### What This Looks Like in Practice

Without garden-md:
```
You: "Draft an email to Sarah about the Stripe migration"
Agent: "Who is Sarah? What Stripe migration?"
```

With garden-md:
```
You: "Draft an email to Sarah about the Stripe migration"
Agent: *reads People/sarah-chen.md → knows she's on the product team*
       *reads Meetings/standup-04-01.md → knows Stripe migration is 70% done, blocked on webhook verification*
       *reads People/james-rodriguez.md → knows James is already helping*
       "Here's the email, referencing the webhook blocker James is fixing..."
```

The agent doesn't hallucinate names, doesn't guess at context, doesn't ask you to explain your own company. It just knows — because garden-md gave it memory.

### The Compound Effect

Every `garden sync && garden tend` makes your agents smarter. New meetings add new people, new decisions, new context. Entity pages accumulate backlinks across meetings — your agent can trace "every meeting where Acme Corp was discussed" or "every decision made in Q2" without you curating anything.

It's not RAG. It's not a vector database. It's just well-organized markdown files that agents already know how to read.

## FAQ

**Q: Does it modify my transcripts?**
No. `tend` only adds markdown links like `[Alice](../People/alice.md)`. The original text is preserved.

**Q: Can I use it without a meeting tool?**
Yes. Drop any `.md` file into the wildland directory and run `garden tend`.

**Q: How much does the AI cost per run?**
Roughly $0.01–0.05 per transcript with Claude Sonnet. A full run on 400+ transcripts costs ~$5-10.

**Q: Can I self-host everything?**
Yes. Use Ollama as your provider — fully local, no API calls, free.

**Q: What if I switch meeting tools?**
Run `garden connect` again to add a new connector. Old data stays in the wiki.

## Contributing

PRs welcome. The codebase is TypeScript, ~1800 lines across 11 commands.

```bash
git clone https://github.com/fdefitte/garden-md
cd garden-md
npm install
npx tsc          # build
node dist/cli.js # run locally
```

## License

MIT
