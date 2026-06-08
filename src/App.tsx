import { useState, useCallback, useEffect } from "react";
import { CodePanel } from "./components/CodePanel";
import { ExplanationPanel } from "./components/ExplanationPanel";
import { FileBrowser } from "./components/FileBrowser";
import { DEMO_FILE, code as DEMO_CODE, explanations as DEMO_EXPLANATIONS, fileName as DEMO_FILE_NAME, filePath as DEMO_FILE_PATH } from "./lib/demo-data";
import type { CodeLine, Explanation, FileSource, RepoTreeNode } from "./lib/types";
import { tokenizeContent } from "./lib/tokenizer";
import { fetchFileContent, fetchFileTree } from "./lib/api/files";
import { explainFile, rawToExplanations } from "./lib/api/explain";
import { getGitHubRepoTree, fetchGitHubFileContent } from "./lib/api/repos";
import { cn } from "./lib/utils";

async function fetchHealth(): Promise<{ ok: boolean; provider?: string; reason?: string; hasGithubToken?: boolean }> {
  try {
    const res = await fetch("/api/health");
    return res.ok ? res.json() : { ok: false };
  } catch {
    return { ok: false };
  }
}

const LEGEND = [
  { label: "Keyword",  dot: "bg-tok-keyword"  },
  { label: "Function", dot: "bg-tok-function" },
  { label: "Variable", dot: "bg-tok-variable" },
  { label: "String",   dot: "bg-tok-string"   },
  { label: "Number",   dot: "bg-tok-number"   },
  { label: "Comment",  dot: "bg-tok-comment"  },
] as const;

export function App() {
  const [repoTree, setRepoTree] = useState<RepoTreeNode[]>([]);
  const [requiresApiKey, setRequiresApiKey] = useState(false);
  const [hasGithubToken, setHasGithubToken] = useState(false);

  // Track which source (local or github repo) is active
  const [fileSource, setFileSource] = useState<FileSource>({ kind: "local" });

  useEffect(() => {
    fetchFileTree().then(setRepoTree).catch(console.error);
    fetchHealth().then((h) => {
      if (!h.ok && h.reason === "missing_api_key") setRequiresApiKey(true);
      if (h.hasGithubToken) setHasGithubToken(true);
    });
  }, []);

  const [activeCodeLines, setActiveCodeLines] = useState<number[]>([]);
  const [hoveredCodeLine, setHoveredCodeLine] = useState<number | null>(null);

  const [codeLines, setCodeLines] = useState<CodeLine[]>([]);
  const [codeFileName, setCodeFileName] = useState("");
  const [codeFilePath, setCodeFilePath] = useState("");
  const [explanations, setExplanations] = useState<Explanation[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState("");

  const handleHoverLine = useCallback((no: number | null) => {
    setHoveredCodeLine(no);
    setActiveCodeLines(no !== null ? [no] : []);
  }, []);

  const handleHoverExplanation = useCallback((lines: number[] | null) => {
    setHoveredCodeLine(null);
    setActiveCodeLines(lines ?? []);
  }, []);

  const handleSelectFile = useCallback(async (path: string, source?: FileSource) => {
    const activeSource = source ?? fileSource;
    setSelectedPath(path);
    setActiveCodeLines([]);
    setHoveredCodeLine(null);

    // Demo file — use pre-tokenized static data, no API call needed
    if (activeSource.kind === "local" && path === DEMO_FILE.path) {
      setCodeLines(DEMO_CODE);
      setCodeFileName(DEMO_FILE_NAME);
      setCodeFilePath(DEMO_FILE_PATH);
      setExplanations(DEMO_EXPLANATIONS);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let content: string;
      let language: string;
      let filename: string;
      let truncated = false;

      if (activeSource.kind === "github") {
        // Binary file guard
        const result = await fetchGitHubFileContent(activeSource.repo, path);
        if (result === null) {
          setCodeLines([]);
          setCodeFileName(path.split("/").pop() ?? path);
          setCodeFilePath(path);
          setExplanations([]);
          setError("This file appears to be binary and cannot be displayed.");
          setIsLoading(false);
          return;
        }
        content = result.content;
        language = result.language;
        filename = result.filename;
        truncated = result.truncated ?? false;
      } else {
        const result = await fetchFileContent(path);
        content = result.content;
        language = result.language;
        filename = result.filename;
      }

      // Tokenize immediately so the code panel updates right away
      const lines = tokenizeContent(content, language);
      setCodeLines(lines);
      setCodeFileName(filename);
      setCodeFilePath(path);
      setExplanations([]);

      if (truncated) {
        setError("This file was truncated at 500 KB — the explanation may be incomplete.");
      }

      // Ask LLM to explain the file
      const result = await explainFile({ filename, path, language, content });
      setExplanations(rawToExplanations(result.explanation, lines.length));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load file.");
    } finally {
      setIsLoading(false);
    }
  }, [fileSource]);

  // When the user picks a different source from the dropdown
  const handleSourceChange = useCallback(async (newSource: FileSource) => {
    setFileSource(newSource);
    setSelectedPath("");
    setCodeLines([]);
    setCodeFileName("");
    setCodeFilePath("");
    setExplanations([]);
    setError(null);

    if (newSource.kind === "github") {
      try {
        const tree = await getGitHubRepoTree(newSource.repo);
        setRepoTree(tree);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load repo tree.");
      }
    } else {
      // Back to local
      fetchFileTree().then(setRepoTree).catch(console.error);
    }
  }, []);

  const handleRetry = useCallback(
    () => handleSelectFile(selectedPath, fileSource),
    [handleSelectFile, selectedPath, fileSource]
  );

  const handleScrollToLine = useCallback((lineNo: number) => {
    document
      .getElementById(`code-line-${lineNo}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const handleApiKeySet = useCallback(async () => {
    const h = await fetchHealth();
    if (h.ok) {
      setRequiresApiKey(false);
      if (selectedPath) handleSelectFile(selectedPath, fileSource);
    }
  }, [selectedPath, handleSelectFile, fileSource]);

  const currentRepoName =
    fileSource.kind === "github" ? fileSource.repo : "codescribe";

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* ── Header ── */}
      <header className="mx-auto w-full max-w-[1440px] px-10 py-5 flex items-center justify-between gap-8">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary shadow-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-primary-foreground">
              <path d="M8 9l-4 3 4 3M16 9l4 3-4 3M13 6l-2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold leading-none tracking-tight text-foreground">
              Code<span className="text-primary">scribe</span>
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground leading-none">
              Code on the left, plain words on the right.
            </p>
          </div>
        </div>

        {/* Token legend */}
        <div className="flex items-center gap-5">
          {LEGEND.map(({ label, dot }) => (
            <span key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn("h-2 w-2 rounded-full shrink-0", dot)} />
              {label}
            </span>
          ))}
        </div>
      </header>

      {/* ── Main ── */}
      <main className="mx-auto flex w-full max-w-[1440px] flex-1 min-h-0 gap-6 px-10 pb-8">
        {/* Sidebar */}
        <aside className="w-52 shrink-0 h-full">
          <FileBrowser
            repoName={currentRepoName}
            tree={repoTree}
            selectedPath={selectedPath}
            onSelectFile={(path) => handleSelectFile(path, fileSource)}
            fileSource={fileSource}
            onSourceChange={handleSourceChange}
            hasGithubToken={hasGithubToken}
          />
        </aside>

        {/* Dual panels */}
        <div className="grid flex-1 grid-cols-2 gap-6 min-h-0">
          <CodePanel
            code={codeLines}
            fileName={codeFileName}
            filePath={codeFilePath}
            activeLines={activeCodeLines}
            onHoverLine={handleHoverLine}
          />
          <ExplanationPanel
            explanations={explanations}
            hoveredLine={hoveredCodeLine}
            onHoverExplanation={handleHoverExplanation}
            onScrollToLine={handleScrollToLine}
            isLoading={isLoading}
            error={error}
            onRetry={handleRetry}
            requiresApiKey={requiresApiKey}
            onApiKeySet={handleApiKeySet}
          />
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="pb-6 text-center text-xs text-muted-foreground/80">
        Hover a line or a sentence — matching colors link the syntax to its meaning.
      </footer>
    </div>
  );
}
