# Codescribe — Next Session Orientation

## What This App Is

**Codescribe** is a dual-panel code explanation tool.
- **Left panel** — syntax-highlighted source code (dark editor, JetBrains Mono)
- **Right panel** — plain-language explanation of each line/block (light card, animated reveal)
- **Sidebar** — file tree; can browse local workspace or any GitHub repo via a dropdown
- Hover syncing: hovering a code line highlights the matching explanation card and vice versa
- Click syncing: clicking an explanation card smooth-scrolls to the matching line in the code panel

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Vite + React + TypeScript |
| Styles | Tailwind CSS v4 (`@tailwindcss/vite`) + `tw-animate-css` |
| Animations | `motion/react` (Framer Motion v11+) |
| UI primitives | shadcn/ui in `src/components/ui/` |
| API server | Express (`server/index.js`) on port 3001 |
| LLM | `LLM_PROVIDER=openai` → OpenAI `gpt-4o-mini`; `LLM_PROVIDER=ollama` → local Deepseek |
| Path alias | `@/` → `src/` |

---

## How to Run

```bash
npm run dev        # starts Vite (:3000) + Express (:3001) with .env loaded automatically
```

Set `LLM_PROVIDER=openai` and `OPENAI_API_KEY=sk-...` in `.env` (already configured).
Vite proxies `/api/*` → Express automatically in dev.

---

## Key Files

```
src/
  App.tsx                  — root: all state, file-select flow, hover/click sync, fileSource state
  styles.css               — Tailwind v4 theme: oklch colors, tok-* CSS vars
  components/
    CodePanel.tsx          — left panel; text-wraps long lines; each row has id="code-line-N"
    ExplanationPanel.tsx   — right panel; click card → smooth scroll to line in CodePanel
    FileBrowser.tsx        — sidebar tree + source dropdown (Local / GitHub repos)
    token-colors.ts        — maps TokenType → text-tok-* Tailwind class
  hooks/
    useDebouncedValue.ts   — the demo file shown on first load
  lib/
    types.ts               — all shared TypeScript types (incl. FileSource, GitHubRepo)
    demo-data.ts           — hand-tokenized demo + DEMO_FILE constant
    tokenizer.ts           — regex-based TS/JS tokenizer: raw content → CodeLine[]
    utils.ts               — cn() helper + buildTreeFromPaths()
    api/
      explain.ts           — POST /api/explain-file + rawToExplanations() converter
      files.ts             — GET /api/file-content + GET /api/file-tree
      repos.ts             — listGitHubRepos(), getGitHubRepoTree(), fetchGitHubFileContent()
server/
  index.js                 — Express: file-tree, file-content, explain-file, health,
                             set-api-key, + GitHub endpoints (repos, file-tree, file-content)
api/
  index.js                 — Vercel serverless adapter (wraps server/index.js via serverless-http)
```

---

## Data Model

```ts
type CodeLine    = { no: number; tokens: CodeToken[] }
type CodeToken   = { type: TokenType; text: string }

type Explanation        = { ref: string; lines: number[]; segments: ExplanationSegment[] }
type ExplanationSegment = { text: string; tok?: TokenType }

// Raw LLM response shape — lineNumber and linesEnd come from line-numbered prompt
type RawExplanationLine = { lineNumber: number; linesEnd?: number; text: string; highlights?: [...] }

// Source selector
type FileSource = { kind: 'local' } | { kind: 'github'; repo: string }
```

---

## Deployment

- **Local dev**: `npm run dev` (reads `.env` via `--env-file-if-exists`)
- **Vercel (free)**: push to GitHub → connect in Vercel dashboard → set `LLM_PROVIDER` + `OPENAI_API_KEY` as env vars → auto-deploys
- **Railway**: `railway.toml` is configured; also free tier available
- **Note**: In production, `GITHUB_TOKEN` and `OPENAI_API_KEY` are set as Vercel env vars — not hard-coded. See TODO #1 for the user-facing key management flow.

---

## ✅ Completed

- Rewrote system prompt: line-numbered input, full coverage enforced, `linesEnd` range support
- `rawToExplanations()` expands ranges into full `lines[]` arrays — hover sync is now tit-for-tat
- Case-insensitive highlight matching in `buildSegments()`
- Dev-mode console warning when LLM skips lines
- OpenAI backend (`LLM_PROVIDER=openai`) + `POST /api/set-api-key` + updated health endpoint
- "OpenAI API key required" UI + dialog in ExplanationPanel (matches design spec)
- Text-wrap in CodePanel (no horizontal scroll; `pre-wrap` + `break-all`)
- Click-to-scroll: clicking an explanation card smooth-scrolls the code panel to that line
- Vercel deployment config (`vercel.json` + `api/index.js` serverless adapter)
- `--env-file-if-exists=.env` in `dev:api` script; `.env` created with OpenAI provider
- **GitHub Repository Selector (TODO #1 from previous session — fully shipped)**
  - `GET /api/github/repos` — lists authenticated user's repos via GitHub API
  - `GET /api/github/file-tree?repo=owner/name` — recursive nested tree via git trees API
  - `GET /api/github/file-content?repo=owner/name&path=...` — base64-decodes file content; handles binary files and 500 KB truncation
  - `GET /api/health` now includes `hasGithubToken: boolean`
  - `FileBrowser` has a source dropdown: "Local workspace" + all GitHub repos
  - `App.tsx` branches on `fileSource.kind` when fetching file content
  - `buildTreeFromPaths()` utility in `src/lib/utils.ts`
  - `FileSource` and `GitHubRepo` types in `src/lib/types.ts`
  - All GitHub API calls use `Authorization: Bearer` + `User-Agent: codescribe`

---

## 🔜 TODO #1 — User-Provided API Keys for Production (MAIN FOCUS)

### Goal

The live Vercel deployment currently requires `OPENAI_API_KEY` and `GITHUB_TOKEN` to be hard-coded as Vercel env vars (my personal keys). This needs to change so any visitor can use the app with their own keys — without ever having to touch Vercel settings.

### How it should work

1. **First-visit flow** — if the server has no keys configured (i.e. the Vercel env vars are blank/absent):
   - Show a "Welcome / Setup" modal or onboarding step
   - User enters their OpenAI API key and (optionally) a GitHub PAT
   - Keys are stored **client-side only** — sent in request headers or saved in `sessionStorage` / `localStorage` (user's choice), never persisted on the server
2. **Security transparency** — the UI must clearly explain:
   - Where the key is stored (browser only / this tab only)
   - That the key is sent to *our* server only to forward to OpenAI/GitHub — not logged, not stored
   - How to delete it ("Clear keys" button wipes localStorage + reloads)
3. **"Forget my keys" button** — visible in the header or settings panel at all times once keys are set

### Implementation directions to evaluate

| Approach | Pros | Cons |
|---|---|---|
| Keys in `localStorage`, sent as custom request headers (`X-OpenAI-Key`, `X-GitHub-Token`) | Persists across tabs/refreshes; simple | Server must read headers instead of env vars |
| Keys in `sessionStorage` only | Cleared on tab close — higher security | User re-enters every session |
| Keys only in memory (React state) | Never touches disk | Lost on refresh |
| Vercel env var (current) | Zero friction for single-user | Doesn't scale; my keys exposed |

**Recommended:** `localStorage` + custom headers approach, with a clear "this lives in your browser only" notice. Server reads `X-OpenAI-Key` header and falls back to `process.env.OPENAI_API_KEY` (so the Vercel env var still works as an owner override).

### Server changes needed

- `POST /api/explain-file`: read `X-OpenAI-Key` header; fall back to env var
- `GET /api/github/*`: read `X-GitHub-Token` header; fall back to `GITHUB_TOKEN` env var
- `GET /api/health`: return which keys are present (env vs. header), so UI knows what to prompt for

### Frontend changes needed

- `KeySetupDialog` component — shown on first load if no keys configured; collects OpenAI key + optional GitHub PAT; explains storage model
- `clearKeys()` utility — wipes localStorage, clears React state
- Header UI — small "Keys" indicator showing which are set, with a "clear" affordance
- All API call functions in `src/lib/api/` — inject stored keys as request headers

---

## 🔜 TODO #2 — Colloquial Word Colorization in ExplanationPanel

### Goal

The ExplanationPanel should colorize **colloquial words and phrases** in explanation text that correspond to code concepts — not just the exact token strings from the code. For example:

| Code token | Colloquial word in explanation | Expected color |
|---|---|---|
| `import` | "borrowing" | keyword color |
| `useState` | "memory slot" or "remembers" | function color |
| `return` | "hands back" or "gives back" | keyword color |
| `const` | "lock in" | keyword color |

### Root cause of current behavior

`buildSegments()` in `src/lib/api/explain.ts` only colorizes text that exactly (or case-insensitively) matches the token strings the LLM returns in `highlights[].text`. If the LLM writes "borrowing" in the explanation text but lists `import` as the highlight token, the word "borrowing" gets no color.

### Fix direction

**Option A — Prompt engineering (preferred first step)**
Update the system prompt to instruct the LLM to include colloquial synonyms directly in `highlights`:
```json
{ "text": "borrowing", "type": "keyword" }
```
So the LLM annotates the *actual words it used*, not the code token. This is the cleanest fix.

**Option B — Post-processing synonym map**
Maintain a `COLLOQUIAL_MAP: Record<string, TokenType>` in `src/lib/api/explain.ts`:
```ts
const COLLOQUIAL_MAP = {
  "borrowing": "keyword", "grabs": "keyword", "pulls in": "keyword",  // import
  "remembers": "function", "memory slot": "function",                  // useState
  "hands back": "keyword", "gives back": "keyword",                    // return
};
```
Scan explanation text for these phrases in `buildSegments()` and colorize them.

**Option C — Auto-highlight from CodeLine tokens**
After receiving the LLM response, scan each explanation's text for any token string that appears in the corresponding `CodeLine[]` and auto-apply the correct color — no LLM cooperation required.

**Recommended:** Start with Option A (prompt change) and measure. Fall back to Option B for gaps. Option C as a safety net.

### Evaluation needed

Before iterating the prompt, we need a way to *measure* whether responses are improving. This feeds into TODO #4 (monitoring dashboard).

---

## 🔜 TODO #3 — File Upload / Paste Mode (production fallback)

When deployed to Vercel, there is no local filesystem. As a fallback for users who don't have a GitHub token, add a "Paste code" mode:
- A textarea in the sidebar or a modal
- User pastes any code snippet
- Language auto-detected or selectable from a dropdown
- Flows through the same tokenizer + LLM explanation pipeline

Low priority — GitHub loading (completed) is the real solution.

---

## 🔜 TODO #4 — LLM Eval & Monitoring Dashboard

### Goal

Build a lightweight internal dashboard so we can systematically evaluate and iterate on LLM prompt quality — especially around colloquial colorization (TODO #2) and coverage completeness.

### What to track per response

| Metric | How to compute |
|---|---|
| Coverage % | `explanations.length / totalNonBlankLines * 100` |
| Colorization hit rate | `highlightedSegments / totalSegments * 100` |
| Colloquial words found | Regex scan of explanation text for non-code vocabulary |
| Lines skipped by LLM | Dev-mode warning already exists; surface in UI |
| Latency | Time from request to first render |
| Model + prompt version | Tag each logged response |

### Implementation ideas

- **Logging**: Add a `POST /api/log-eval` endpoint that accepts a structured eval payload and writes to a local JSON file (dev) or a Vercel KV / Upstash Redis store (prod)
- **Dashboard route**: A `/eval` route in the SPA (hidden from nav) that reads the eval log and renders:
  - A table of recent responses with scores
  - Sparkline charts for coverage % and colorization rate over time
  - Side-by-side diff viewer: raw LLM JSON vs. rendered explanation
  - Prompt version history with A/B comparison
- **Prompt versioning**: Store `PROMPT_VERSION=v1` in the server and include it in every eval log entry so we can correlate changes to the prompt with metric changes

### Priority

Build this **after** TODO #1 (user keys) is shipped, since we'll want to evaluate responses from real GitHub files, not just local ones. Start with a simple table; add charts once we have enough data to be interesting.

---

## Current Dev State

- App renders at `http://localhost:3000`
- File tree is live — fetched from `GET /api/file-tree` on startup (local) or `GET /api/github/file-tree` (GitHub)
- Source dropdown in sidebar — "Local workspace" + all GitHub repos (loaded via `GITHUB_TOKEN`)
- GitHub file browsing works end-to-end: select repo → browse tree → click file → LLM explanation
- OpenAI (`gpt-4o-mini`) explains files line-by-line with accurate line numbers and full coverage
- Hover sync: hovering a code line highlights the matching explanation card and vice versa
- Click sync: clicking an explanation card smooth-scrolls the code panel to that line
- Text wrap: long code lines wrap instead of horizontal-scrolling
- Build is clean: `npm run build` passes with zero errors
- Vercel deployment is configured and ready (`vercel.json` + `api/index.js`)
- Binary file guard: returns `{ error: 'binary_file' }` instead of crashing
- 500 KB truncation: oversized files truncated with a warning banner
