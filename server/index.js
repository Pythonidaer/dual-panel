import express from "express";
import { readFile, readdir } from "fs/promises";
import { resolve, extname, basename, relative, join } from "path";
import { existsSync } from "fs";

const WORKSPACE_ROOT = process.cwd();

const EXT_LANG = {
  ".ts": "typescript", ".tsx": "typescript",
  ".js": "javascript", ".jsx": "javascript",
  ".css": "css", ".json": "json",
  ".html": "html", ".md": "markdown",
};

const app = express();
const PORT = process.env.PORT ?? 3001;

const LLM_PROVIDER = process.env.LLM_PROVIDER ?? "ollama";
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "deepseek-coder:6.7b";
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

const SYSTEM_PROMPT = `Explain source code to a beginner. Return JSON only — no markdown, no extra text.

The code arrives with line numbers like "1 | code". Use those exact numbers.

Output shape (copy this exactly):
{"explanation":[{"lineNumber":1,"linesEnd":1,"text":"friendly explanation","highlights":[{"text":"token","type":"function"}]}]}

Rules:
- Cover every non-blank line. Skip blank-only lines.
- Group consecutive lines that form one statement: lineNumber=first line, linesEnd=last line.
- Write casual, friendly English. Say "grabs" not "imports", "kicks off" not "initializes".
- highlights lists tokens mentioned in text. type must be one of: keyword, function, variable, string, number, comment.
- Return ONLY the JSON object. Nothing before it. Nothing after it.`;

app.use(express.json({ limit: "2mb" }));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

/** Prefix each line of content with its 1-based line number so the model has an exact reference. */
function numberLines(content) {
  return content
    .split("\n")
    .map((line, i) => `${i + 1} | ${line}`)
    .join("\n");
}

/** Parse and clean the raw text response from any LLM into a structured object. */
function parseJsonResponse(rawText) {
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
  return JSON.parse(cleaned);
}

/**
 * Robustly extract the explanation array from whatever the model returned.
 * Handles: { explanation: [...] }, { explanations: [...] }, [...] directly,
 * or any top-level key whose value is an array of objects with lineNumber.
 */
function extractExplanationArray(parsed) {
  // Direct array
  if (Array.isArray(parsed)) return parsed;

  // Expected key
  if (Array.isArray(parsed.explanation)) return parsed.explanation;
  if (Array.isArray(parsed.explanations)) return parsed.explanations;

  // Hunt for the first array value that looks like explanation entries
  for (const val of Object.values(parsed)) {
    if (
      Array.isArray(val) &&
      val.length > 0 &&
      typeof val[0] === "object" &&
      "lineNumber" in val[0]
    ) {
      return val;
    }
  }

  return null;
}

app.post("/api/explain-file", async (req, res) => {
  const { filename, path: filePath, language, content } = req.body ?? {};

  if (!filename || !content) {
    res.status(400).json({ error: "Missing required fields: filename, content" });
    return;
  }

  if (LLM_PROVIDER === "openai") {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      res.status(402).json({ error: "OpenAI API key is not configured on the server." });
      return;
    }

    const numberedContent = numberLines(content);
    const userPrompt = `File: ${filename}\nLanguage: ${language ?? "unknown"}\n\nContent (line numbers shown):\n${numberedContent}`;

    let openaiRes;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120_000);

      openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
        }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));
    } catch (err) {
      const isTimeout = err?.name === "AbortError";
      res.status(502).json({
        error: isTimeout
          ? "OpenAI request timed out after 2 minutes."
          : `Cannot reach OpenAI: ${String(err)}`,
      });
      return;
    }

    if (!openaiRes.ok) {
      const text = await openaiRes.text().catch(() => "");
      res.status(502).json({ error: `OpenAI returned ${openaiRes.status}: ${text}` });
      return;
    }

    const openaiData = await openaiRes.json();
    const rawText = openaiData.choices?.[0]?.message?.content ?? "";

    let parsed;
    try {
      parsed = parseJsonResponse(rawText);
    } catch {
      res.status(422).json({ error: "OpenAI returned invalid JSON. Try again.", rawText });
      return;
    }

    const explanationArr = extractExplanationArray(parsed);
    if (!explanationArr) {
      console.error("[OpenAI] Unexpected response shape. rawText:", rawText.slice(0, 500));
      res.status(422).json({ error: "Unexpected response shape from OpenAI.", rawText });
      return;
    }

    res.json({ explanation: explanationArr, rawText });
    return;
  }

  // ── Ollama path ──────────────────────────────────────────────────────────────
  const numberedContent = numberLines(content);
  const userPrompt = `File: ${filename}
Path: ${filePath ?? "unknown"}
Language: ${language ?? "unknown"}

Content (line numbers shown):
${numberedContent}`;

  let ollamaRes;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);

    ollamaRes = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        system: SYSTEM_PROMPT,
        prompt: userPrompt,
        stream: false,
        format: "json",
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));
  } catch (err) {
    const isTimeout = err?.name === "AbortError";
    const message = isTimeout
      ? "Ollama request timed out after 2 minutes."
      : `Cannot reach Ollama at ${OLLAMA_BASE_URL}. Is it running? Try: ollama serve`;
    res.status(502).json({ error: message });
    return;
  }

  if (!ollamaRes.ok) {
    const text = await ollamaRes.text().catch(() => "");
    if (ollamaRes.status === 404) {
      res.status(502).json({
        error: `Model "${OLLAMA_MODEL}" not found. Pull it with: ollama pull ${OLLAMA_MODEL}`,
      });
      return;
    }
    res.status(502).json({ error: `Ollama returned ${ollamaRes.status}: ${text}` });
    return;
  }

  const ollamaData = await ollamaRes.json();
  const rawText = ollamaData.response ?? "";

  let parsed;
  try {
    parsed = parseJsonResponse(rawText);
  } catch {
    res.status(422).json({
      error: "Ollama returned invalid JSON. Try again or switch models.",
      rawText,
    });
    return;
  }

  const explanationArr = extractExplanationArray(parsed);
  if (!explanationArr) {
    console.error("[Ollama] Unexpected response shape. rawText:", rawText.slice(0, 500));
    res.status(422).json({
      error: "Unexpected response shape from Ollama.",
      rawText,
    });
    return;
  }

  res.json({ explanation: explanationArr, rawText });
});

app.post("/api/set-api-key", (req, res) => {
  if (LLM_PROVIDER !== "openai") {
    res.status(400).json({ error: "Server is not configured to use OpenAI (LLM_PROVIDER != openai)." });
    return;
  }
  const { apiKey } = req.body ?? {};
  if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
    res.status(400).json({ error: "apiKey is required." });
    return;
  }
  process.env.OPENAI_API_KEY = apiKey.trim();
  res.json({ ok: true });
});

// Directories and files to never include in the tree
const IGNORE = new Set([
  "node_modules", "dist", ".vite", ".git", ".cursor",
  ".DS_Store", "TODO", "docs",
]);

async function buildTree(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nodes = [];

  for (const entry of entries.sort((a, b) => {
    // Directories first, then files
    if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
    return a.name.localeCompare(b.name);
  })) {
    if (IGNORE.has(entry.name) || entry.name.startsWith(".")) continue;
    // Skip timestamp temp files
    if (/\.timestamp.*\.js$/.test(entry.name)) continue;

    const abs = resolve(dir, entry.name);
    const rel = relative(WORKSPACE_ROOT, abs);

    if (entry.isDirectory()) {
      const children = await buildTree(abs);
      nodes.push({ name: entry.name, path: rel, type: "directory", children });
    } else {
      nodes.push({ name: entry.name, path: rel, type: "file" });
    }
  }

  return nodes;
}

app.get("/api/file-tree", async (_req, res) => {
  try {
    const tree = await buildTree(WORKSPACE_ROOT);
    res.json({ tree });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get("/api/file-content", async (req, res) => {
  const filePath = req.query.path;
  if (!filePath || typeof filePath !== "string") {
    res.status(400).json({ error: "Missing ?path= query parameter" });
    return;
  }

  const absolute = resolve(WORKSPACE_ROOT, filePath);
  if (!absolute.startsWith(WORKSPACE_ROOT + "/") && absolute !== WORKSPACE_ROOT) {
    res.status(403).json({ error: "Path outside workspace" });
    return;
  }

  try {
    const content = await readFile(absolute, "utf-8");
    const language = EXT_LANG[extname(filePath).toLowerCase()] ?? "plaintext";
    res.json({ content, language, filename: basename(filePath) });
  } catch {
    res.status(404).json({ error: `File not found: ${filePath}` });
  }
});

app.get("/api/health", (_req, res) => {
  const hasGithubToken = !!(process.env.GITHUB_TOKEN?.trim());
  if (LLM_PROVIDER === "openai") {
    const hasKey = !!(process.env.OPENAI_API_KEY?.trim());
    res.json({
      ok: hasKey,
      provider: "openai",
      model: OPENAI_MODEL,
      hasGithubToken,
      ...(hasKey ? {} : { reason: "missing_api_key" }),
    });
    return;
  }
  res.json({ ok: true, provider: "ollama", model: OLLAMA_MODEL, ollamaBase: OLLAMA_BASE_URL, hasGithubToken });
});

// ── GitHub API helpers ────────────────────────────────────────────────────────

const GITHUB_HEADERS = () => ({
  Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
  "User-Agent": "codescribe",
  Accept: "application/vnd.github+json",
});

const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".svg",
  ".woff", ".woff2", ".ttf", ".eot", ".otf",
  ".pdf", ".zip", ".tar", ".gz", ".bz2",
  ".mp4", ".mp3", ".wav", ".ogg",
  ".exe", ".bin", ".dll", ".so", ".dylib",
  ".db", ".sqlite",
]);

function isBinaryPath(filePath) {
  const ext = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

/** Rebuild a nested RepoTreeNode[] from flat blob paths (e.g. ["src/App.tsx", "server/index.js"]). */
function buildTreeFromPaths(paths) {
  const root = [];

  for (const filePath of paths) {
    const parts = filePath.split("/");
    let level = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      const existingNode = level.find((n) => n.name === part);

      if (existingNode) {
        if (!isFile) level = existingNode.children;
      } else {
        const newNode = isFile
          ? { name: part, path: filePath, type: "file" }
          : { name: part, path: parts.slice(0, i + 1).join("/"), type: "directory", children: [] };
        level.push(newNode);
        if (!isFile) level = newNode.children;
      }
    }
  }

  // Sort: directories first, then files, alphabetically within each group
  function sortNodes(nodes) {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const node of nodes) {
      if (node.children) sortNodes(node.children);
    }
    return nodes;
  }

  return sortNodes(root);
}

// GET /api/github/repos — list authenticated user's repos
app.get("/api/github/repos", async (_req, res) => {
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) {
    res.status(401).json({ error: "GITHUB_TOKEN is not configured on the server." });
    return;
  }

  try {
    const ghRes = await fetch(
      "https://api.github.com/user/repos?per_page=100&sort=updated",
      { headers: GITHUB_HEADERS() }
    );

    if (!ghRes.ok) {
      const text = await ghRes.text().catch(() => "");
      res.status(ghRes.status).json({ error: `GitHub API error ${ghRes.status}: ${text}` });
      return;
    }

    const repos = await ghRes.json();
    const result = repos.map((r) => ({
      name: r.name,
      fullName: r.full_name,
      defaultBranch: r.default_branch,
      description: r.description ?? "",
      private: r.private,
    }));

    res.json({ repos: result });
  } catch (err) {
    res.status(502).json({ error: `Cannot reach GitHub API: ${String(err)}` });
  }
});

// GET /api/github/file-tree?repo=owner/name — recursive file tree for a repo
app.get("/api/github/file-tree", async (req, res) => {
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) {
    res.status(401).json({ error: "GITHUB_TOKEN is not configured." });
    return;
  }

  const repoParam = req.query.repo;
  if (!repoParam || typeof repoParam !== "string" || !repoParam.includes("/")) {
    res.status(400).json({ error: "Missing or invalid ?repo=owner/name query parameter." });
    return;
  }

  try {
    // Use HEAD which follows the default branch
    const ghRes = await fetch(
      `https://api.github.com/repos/${repoParam}/git/trees/HEAD?recursive=1`,
      { headers: GITHUB_HEADERS() }
    );

    if (!ghRes.ok) {
      const text = await ghRes.text().catch(() => "");
      const msg = ghRes.status === 404
        ? `Repo "${repoParam}" not found or insufficient token scope.`
        : `GitHub API error ${ghRes.status}: ${text}`;
      res.status(ghRes.status).json({ error: msg });
      return;
    }

    const data = await ghRes.json();

    if (data.truncated) {
      console.warn(`[GitHub] Tree for ${repoParam} was truncated by GitHub (>100k files).`);
    }

    const blobPaths = (data.tree ?? [])
      .filter((item) => item.type === "blob")
      .map((item) => item.path);

    const tree = buildTreeFromPaths(blobPaths);
    res.json({ tree });
  } catch (err) {
    res.status(502).json({ error: `Cannot reach GitHub API: ${String(err)}` });
  }
});

// GET /api/github/file-content?repo=owner/name&path=src/foo.ts
app.get("/api/github/file-content", async (req, res) => {
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) {
    res.status(401).json({ error: "GITHUB_TOKEN is not configured." });
    return;
  }

  const repoParam = req.query.repo;
  const filePath = req.query.path;

  if (!repoParam || typeof repoParam !== "string" || !repoParam.includes("/")) {
    res.status(400).json({ error: "Missing or invalid ?repo=owner/name query parameter." });
    return;
  }
  if (!filePath || typeof filePath !== "string") {
    res.status(400).json({ error: "Missing ?path= query parameter." });
    return;
  }

  if (isBinaryPath(filePath)) {
    res.json({ error: "binary_file", filename: basename(filePath) });
    return;
  }

  try {
    const ghRes = await fetch(
      `https://api.github.com/repos/${repoParam}/contents/${filePath}`,
      { headers: GITHUB_HEADERS() }
    );

    if (!ghRes.ok) {
      const text = await ghRes.text().catch(() => "");
      const msg = ghRes.status === 404
        ? `File "${filePath}" not found in "${repoParam}".`
        : `GitHub API error ${ghRes.status}: ${text}`;
      res.status(ghRes.status).json({ error: msg });
      return;
    }

    const data = await ghRes.json();

    // GitHub returns base64-encoded content with possible newlines
    const raw = (data.content ?? "").replace(/\n/g, "");
    const content = Buffer.from(raw, "base64").toString("utf-8");

    if (!content.trim()) {
      res.json({ content: "", language: "plaintext", filename: basename(filePath) });
      return;
    }

    const SIZE_LIMIT = 500 * 1024; // 500 KB
    const truncated = Buffer.byteLength(content, "utf-8") > SIZE_LIMIT;
    const finalContent = truncated
      ? content.slice(0, SIZE_LIMIT) + "\n\n// [File truncated — content exceeds 500 KB]"
      : content;

    const language = EXT_LANG[extname(filePath).toLowerCase()] ?? "plaintext";
    res.json({
      content: finalContent,
      language,
      filename: basename(filePath),
      ...(truncated ? { truncated: true } : {}),
    });
  } catch (err) {
    res.status(502).json({ error: `Cannot reach GitHub API: ${String(err)}` });
  }
});

// In production (Railway / local `npm start`), serve the built SPA
const DIST = join(WORKSPACE_ROOT, "dist");
if (existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get("*", (_req, res) => res.sendFile(join(DIST, "index.html")));
}

// Only bind a port when run directly (local dev / Railway).
// When imported by the Vercel serverless adapter we just export `app`.
const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname);
if (isMain) {
  app.listen(PORT, () => {
    console.log(`Codescribe API running on http://localhost:${PORT}`);
  });
}

export { app };
