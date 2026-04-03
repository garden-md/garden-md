# Product Hunt Launch Prep — garden-md

## Listing Fields

### Product Name (40 chars max)
```
garden-md
```
(9 chars)

### Tagline (60 chars max)
```
Turn meeting transcripts into a Wikipedia for your company
```
(58 chars) ✅

### Description (260 chars max)
```
garden-md syncs your meeting transcripts from Grain, Granola, or Fireflies, extracts people and companies, and builds a linked markdown wiki — with relevance scoring, enriched context, and zero cloud dependencies. Your AI agents read it natively. $0.01/run.
```
(257 chars) ✅

### Topics/Categories
- Developer Tools
- Productivity
- Artificial Intelligence
- Open Source

### Website URL
```
https://github.com/fdefitte/garden-md
```
(or landing page if we build one)

### Pricing
```
Free / Open Source (BYOK — bring your own AI key)
```

### Thumbnail (240x240 PNG)
→ Need to generate on Nano Banana or create manually

### Gallery Images (1270x760 recommended, up to 6)
1. Dashboard screenshot (the dark Bloomberg-style index page)
2. Before/After: raw transcript → linked wiki with entity pages
3. Terminal showing `garden init → connect → sync → tend → open`
4. Entity page example (person stub with context + backlinks)
5. Folder Index.md with description table
6. Agent wiring: the 5 AI coding agents auto-configured

### Maker Comment (first comment on launch day)
```
Hey PH! 👋

I built garden-md because my AI agents kept asking "who is Sarah?" and "what did we decide about pricing?" — they had zero company memory.

The fix was embarrassingly simple: turn meeting recordings into structured markdown. Agents already know how to read .md files. No plugins, no vector databases, no RAG pipelines.

Five commands:
→ garden init (pick your AI provider)
→ garden connect (link Grain/Granola/Fireflies)
→ garden sync (pull transcripts)
→ garden tend (extract entities, build wiki)
→ garden open (browse it)

What makes it different:
• Relevance scoring — passing mentions get filtered, not every entity gets a page
• Enriched stubs — entity pages include one-line context ("YC partner, advises on dev tools")
• Agent wiring — auto-configures Claude Code, Codex, Cursor, Windsurf, OpenClaw
• $0.01 per run using Claude Haiku — processes 7 transcripts for a penny
• 100% local — your data never leaves your machine (except the AI API call)

It's open source, MIT licensed, and published on npm. `npm install -g garden-md` and you're running in 2 minutes.

Would love your feedback on the roadmap: https://github.com/fdefitte/garden-md/discussions/1
```

---

## Launch Checklist

### Pre-Launch (1 week before)
- [ ] Landing page live (agentphone.dev/garden-md or garden-md.dev)
- [ ] Logo designed on Nano Banana
- [ ] Gallery screenshots taken (6 images, 1270x760)
- [ ] Thumbnail designed (240x240)
- [ ] GIF/video demo of terminal flow
- [ ] Twitter teaser thread drafted
- [ ] Notify supporters/friends for launch day upvotes
- [ ] Schedule launch for 12:01 AM PT (Tuesday-Thursday best)

### Launch Day
- [ ] Publish listing at 12:01 AM PT
- [ ] Post maker comment immediately
- [ ] Share on Twitter, LinkedIn, Indie Hackers
- [ ] Reply to every comment within 1 hour
- [ ] Post in relevant Discord/Slack communities

### Post-Launch
- [ ] Thank voters
- [ ] Write "lessons learned" post
- [ ] Update README with PH badge
