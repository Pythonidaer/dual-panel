import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { FileSource, GitHubRepo, RepoTreeNode } from "@/lib/types";
import { listGitHubRepos } from "@/lib/api/repos";

interface FileBrowserProps {
  repoName: string;
  tree: RepoTreeNode[];
  selectedPath: string;
  onSelectFile: (path: string) => void;
  fileSource: FileSource;
  onSourceChange: (source: FileSource) => void;
  hasGithubToken: boolean;
}

export function FileBrowser({
  repoName,
  tree,
  selectedPath,
  onSelectFile,
  fileSource,
  onSourceChange,
  hasGithubToken,
}: FileBrowserProps) {
  const [githubRepos, setGithubRepos] = useState<GitHubRepo[]>([]);
  const [reposError, setReposError] = useState<string | null>(null);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [loadingTree, setLoadingTree] = useState(false);

  // Load repo list when GitHub token is available
  useEffect(() => {
    if (!hasGithubToken) return;
    setLoadingRepos(true);
    listGitHubRepos()
      .then(setGithubRepos)
      .catch((err) => setReposError(err.message))
      .finally(() => setLoadingRepos(false));
  }, [hasGithubToken]);

  const currentValue =
    fileSource.kind === "github" ? fileSource.repo : "local";

  async function handleSelectChange(value: string) {
    if (value === "local") {
      onSourceChange({ kind: "local" });
    } else {
      setLoadingTree(true);
      try {
        await onSourceChange({ kind: "github", repo: value });
      } finally {
        setLoadingTree(false);
      }
    }
  }

  const isEmpty = tree.length === 0;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-editor-bg shadow-xl">
      {/* ── Header: repo name ── */}
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="text-primary shrink-0">
          <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span className="truncate font-mono text-xs font-semibold text-white/80">{repoName}</span>
      </div>

      {/* ── Source selector ── */}
      {hasGithubToken && (
        <div className="border-b border-white/10 px-3 py-2">
          <div className="relative">
            <select
              value={currentValue}
              onChange={(e) => handleSelectChange(e.target.value)}
              disabled={loadingRepos}
              className={cn(
                "w-full appearance-none rounded-lg border border-white/10 bg-white/5",
                "px-2.5 py-1.5 pr-6 font-mono text-[11px] text-white/80",
                "focus:outline-none focus:ring-1 focus:ring-primary/60",
                "hover:bg-white/10 transition-colors cursor-pointer",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            >
              <option value="local" className="bg-[#1a1a2e] text-white">
                Local workspace
              </option>
              {loadingRepos && (
                <option disabled className="bg-[#1a1a2e] text-white/40">
                  Loading repos…
                </option>
              )}
              {!loadingRepos && githubRepos.map((repo) => (
                <option key={repo.fullName} value={repo.fullName} className="bg-[#1a1a2e] text-white">
                  {repo.fullName}
                </option>
              ))}
            </select>
            {/* Custom chevron */}
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/40 text-[8px]">
              ▾
            </span>
          </div>

          {reposError && (
            <p className="mt-1.5 text-[10px] text-red-400/80 leading-tight">{reposError}</p>
          )}
        </div>
      )}

      {/* ── File tree ── */}
      <div className="flex-1 overflow-y-auto py-2">
        {loadingTree ? (
          <div className="flex items-center justify-center py-8 text-[11px] text-white/30 font-mono">
            Loading…
          </div>
        ) : isEmpty ? (
          <div className="flex items-center justify-center py-8 text-[11px] text-white/30 font-mono">
            {fileSource.kind === "github" ? "No files found" : "No files"}
          </div>
        ) : (
          tree.map((node) => (
            <TreeNode
              key={node.path}
              node={node}
              selectedPath={selectedPath}
              onSelectFile={onSelectFile}
              depth={0}
            />
          ))
        )}
      </div>
    </div>
  );
}

function TreeNode({
  node,
  selectedPath,
  onSelectFile,
  depth,
}: {
  node: RepoTreeNode;
  selectedPath: string;
  onSelectFile: (path: string) => void;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(false);

  if (node.type === "file") {
    const active = node.path === selectedPath;
    return (
      <button
        style={{ paddingLeft: `${(depth + 1) * 12 + 4}px` }}
        onClick={() => onSelectFile(node.path)}
        className={cn(
          "flex w-full items-center gap-1.5 py-1 pr-3 text-left font-mono text-[11px] transition-colors",
          active
            ? "text-primary bg-primary/10"
            : "text-white/65 hover:text-white/95 hover:bg-white/5",
        )}
      >
        <span className="text-[9px] opacity-60">○</span>
        {node.name}
      </button>
    );
  }

  return (
    <div>
      <button
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-1.5 py-1 pr-3 font-mono text-[11px] text-white/60 transition-colors hover:text-white/95 hover:bg-white/5"
      >
        <span className="text-[9px] w-3 text-center">{expanded ? "▾" : "▸"}</span>
        <span className="text-[9px] opacity-60">◻</span>
        {node.name}
      </button>
      {expanded && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              selectedPath={selectedPath}
              onSelectFile={onSelectFile}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
