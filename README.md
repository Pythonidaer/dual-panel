# Codescribe

> Code on the left, plain words on the right.

A dual-panel code explanation app. Select any file from the repository browser on the left, then get a plain-language, line-by-line explanation on the right — powered by a local Ollama model.

---

## Running Locally

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment (optional)

```bash
cp .env.example .env
# Edit .env to change the Ollama model or base URL
```

### 3. Pull the Ollama model

```bash
ollama pull deepseek-coder:6.7b
```

Or use a lighter model by setting `OLLAMA_MODEL` in `.env`:

```bash
# .env
OLLAMA_MODEL=codellama:7b
OLLAMA_BASE_URL=http://localhost:11434
```

### 4. Start Ollama

```bash
ollama serve
```

### 5. Run the dev server

```bash
npm run dev
```

This starts both:
- **Vite** (React app) at `http://localhost:3000`
- **Express API** at `http://localhost:3001`

Vite proxies `/api/*` to the Express server automatically.

---

## Project Structure

```
src/
  components/
    CodePanel.tsx          # Left panel — dark editor-style view with syntax tokens
    ExplanationPanel.tsx   # Right panel — plain-language explanation
    FileBrowser.tsx        # Sidebar file tree
    token-colors.ts        # Shared color config for token types
  lib/
    types.ts               # Shared TypeScript types
    demo-data.ts           # Demo file and explanation (useDebouncedValue.ts)
    api/
      repos.ts             # Placeholder: list repos, get file tree, get file content
      explain.ts           # Client: calls /api/explain-file
server/
  index.js                 # Express API — proxies to Ollama
```

---

## API

### `POST /api/explain-file`

```json
{
  "filename": "useDebouncedValue.ts",
  "path": "src/hooks/useDebouncedValue.ts",
  "language": "typescript",
  "content": "..."
}
```

Response:

```json
{
  "explanation": [
    {
      "lineNumber": 1,
      "text": "Pull in React's useState and useEffect hooks.",
      "highlights": [
        { "text": "useState", "type": "function" },
        { "text": "useEffect", "type": "function" }
      ]
    }
  ]
}
```

---

## What Still Needs to Be Done

- **GitHub repo fetching** — `src/lib/api/repos.ts` has the placeholder structure. Implement `listRepos()`, `getRepoTree()`, and `getFileContent()` using the GitHub REST API (`/repos/{owner}/{repo}/...`). Add OAuth flow (GitHub App or PAT) for private repos.
- **Real file tree** — Currently uses hardcoded demo data. Wire up `getRepoTree()` to populate the `FileBrowser`.
- **Multi-file switching** — Clicking a file in the browser currently only triggers Ollama; the CodePanel should also update to show the selected file's actual content.
- **Syntax highlighting** — Currently uses hand-tokenized demo data. Add a real tokenizer (e.g., `shiki` or `prismjs`) to tokenize any loaded file.
- **Persistence** — Cache explanations per file so switching back doesn't re-run Ollama.
