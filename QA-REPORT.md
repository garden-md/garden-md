# garden-md QA Report — 2026-04-02

**Test:** Full pipeline with 7 synthetic files mimicking real Grain output  
**Result:** 46 pages created, 29 updated, 67 entities, ~$0.02 cost  

---

## 🔴 Bugs (Must Fix)

### B1: FAST_MODELS has wrong Haiku model ID
- **File:** `src/lib/ai.ts` line 20
- **Was:** `claude-haiku-4-20250414` (404 from API)
- **Fix:** `claude-haiku-4-5-20251001` ✅ FIXED
- **Severity:** Critical — `tend` completely fails, all items stay in wildland

### B2: API key env fallback doesn't work
- **File:** `src/lib/ai.ts`
- **Issue:** When `config.ai.apiKey` is null/undefined, the Anthropic SDK gets `apiKey: undefined` which makes it ignore `ANTHROPIC_API_KEY` env var
- **Fix:** Fall back to env var when config key is empty ✅ FIXED
- **Severity:** High — fresh installs that use env vars silently fail

### B3: `require()` in ESM modules
- **File:** `src/commands/sync.ts` line 102 (`unscheduleSync`), `src/commands/uninstall.ts` line 20
- **Issue:** Uses `require('child_process')` but package is `"type": "module"`. Currently swallowed by try/catch, so cron entries are never actually removed.
- **Fix:** Change to `await import('child_process')` or use top-level import
- **Severity:** Medium — cron removal silently fails

### B4: `tend` commits "0 created" to git
- **Evidence:** Git log shows `tend: 0 created, 0 updated, 0 entities` commit when all items errored
- **Fix:** Only git commit when there are actual changes (`pagesCreated + pagesUpdated > 0`)
- **Severity:** Low — noise in git history

### B5: Version mismatch — CLI reports 0.1.0, package.json is 0.3.1
- **File:** `src/cli.ts` line 18: `.version('0.1.0')`
- **Fix:** Read from package.json or update to match
- **Severity:** Low

---

## 🟡 Quality Issues (Should Fix)

### Q1: Entity over-extraction — tools/frameworks as "Products"
- **Examples:** Express, Postgres, scikit-learn, PyTorch, Tailwind, TypeScript, Next.js, Figma
- These are generic dev tools, not company products. Creates noise.
- **Fix:** Tune the system prompt: "Products means products the COMPANY is building. Do not include generic tools, frameworks, or programming languages."
- Alternative: Add a `Tools` folder or explicitly exclude common dev tools

### Q2: "Naïve Bayes classifier" extracted as a named product
- It's a generic ML algorithm, not a product
- Same prompt tuning needed

### Q3: Index.md uses slug-format names instead of proper titles
- Shows: `weekly standup product engineering` instead of `Weekly Standup — Product & Engineering`
- **Root cause:** `buildWikiIndex` and `updateIndex` derive names from filenames, stripping hyphens
- **Fix:** Store original titles in frontmatter or a metadata file, use those for display

### Q4: HTML page titles use slugified names
- `<title>francois de fitte — garden</title>` instead of `François de Fitte`
- Same root cause as Q3 — page names derived from filenames lose casing and accents

### Q5: Sidebar page links use slugified names
- Shows "celine deschenes" instead of "Céline Deschênes"
- Same root cause

### Q6: "1:1" in meeting title sanitizes to "11"
- `1:1 François & Sarah` → `11-francois-sarah-agentphone-roadmap.md`
- The colon is stripped, digits collapse
- **Fix:** Replace `:` with `-` before stripping, or use a smarter sanitizer

### Q7: Short files waste API calls
- `short-file.md` (118 bytes including frontmatter, body is just "Brief call.") passed the 50-char check because frontmatter counts
- **Fix:** Strip frontmatter before checking content length, or check body length only

### Q8: Empty wildland message shows raw path
- Shows `~/garden-qa-wildland` with tilde — inconsistent with resolved paths elsewhere
- Minor UX issue

---

## 🟢 What Worked Well

1. **Entity linking accuracy** — first-mention-only linking works great, no double-links
2. **Cross-meeting entity accumulation** — entities discovered in file 1 are known for file 2+
3. **Accent handling in filenames** — NFD normalization works (`François` → `francois`, `José` → `jose`)
4. **Accent preservation in content** — Entity stubs keep proper Unicode names (`# François de Fitte`)
5. **Backlinks in HTML** — bidirectional links work correctly
6. **Prompt injection resistance** — injection attempts were ignored, real entities extracted
7. **No broken links** — every `../Folder/entity.md` link resolves to an existing file
8. **Idempotent re-run** — running `tend` on empty wildland is graceful
9. **Cost efficiency** — 7 files processed for $0.02 using Haiku
10. **Git auto-commit** — works, meaningful commit messages
11. **No-frontmatter files** — handled gracefully, AI generates a good title
12. **HTML wiki** — dark theme, sidebar, search, backlinks all render correctly

---

## 🔧 Improvement Ideas (Nice to Have)

### I1: Store original titles in a metadata sidecar
A `wiki/.garden-meta.json` mapping `filename → {title, type, date}` would solve Q3/Q4/Q5 in one shot.

### I2: Decisions folder is never populated
`tend` routes everything through Meetings → entity stubs. It never creates Decision pages even when decisions are explicitly mentioned. Could extract decisions as a separate entity type.

### I3: Sessions folder is never populated
No connector or mechanism targets this folder. Either remove it from defaults or document how to use it.

### I4: Deduplication on re-sync
If a transcript is re-synced (wildland file recreated), `tend` will create a duplicate meeting page with a slightly different slug. Need content-hash or grain_id dedup.

### I5: Progress bar visibility
The progress bar works but item names are truncated. With 7 files it wasn't visible at all (too fast). Would benefit from a final summary table showing per-file results.

### I6: Retry backoff logging
When API calls fail, the 3 retries happen silently. Should log retry attempts so users know something is being retried vs. hanging.

---

## Test Matrix

| Test Case | Result | Notes |
|-----------|--------|-------|
| Normal transcript (3 files) | ✅ Pass | Entities extracted, linked, pages created |
| Unicode/accents in names | ✅ Pass | Filenames normalized, content preserved |
| No frontmatter | ✅ Pass | AI generates title, entities extracted |
| Short file (<50 chars body) | ⚠️ Partial | Processed when should be skipped (B7) |
| Prompt injection | ✅ Pass | Injection ignored, real entities found |
| Duplicate entities across files | ✅ Pass | Backlinks accumulated correctly |
| Empty wildland re-run | ✅ Pass | Graceful exit message |
| garden list/add/remove | ✅ Pass | All work correctly |
| garden sync (no connectors) | ✅ Pass | Helpful error message |
| HTML generation | ✅ Pass | All pages render, links work |
| Git auto-commit | ✅ Pass | Commit with stats |
| API key from env var | ✅ Pass | After fix (B2) |
| Wrong model ID | ✅ Pass | After fix (B1) |
