import type { GitHubRepo, RepoTreeNode } from "../types";

/** Fetch the list of GitHub repos for the authenticated user. */
export async function listGitHubRepos(): Promise<GitHubRepo[]> {
  const res = await fetch("/api/github/repos");
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `GitHub repos fetch failed (${res.status})`);
  }
  const data = await res.json();
  return data.repos as GitHubRepo[];
}

/** Fetch the nested file tree for a given repo (owner/name). */
export async function getGitHubRepoTree(repoFullName: string): Promise<RepoTreeNode[]> {
  const res = await fetch(`/api/github/file-tree?repo=${encodeURIComponent(repoFullName)}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `GitHub file-tree fetch failed (${res.status})`);
  }
  const data = await res.json();
  return data.tree as RepoTreeNode[];
}

/** Fetch file content from a GitHub repo. Returns null for binary files. */
export async function fetchGitHubFileContent(
  repoFullName: string,
  filePath: string
): Promise<{ content: string; language: string; filename: string; truncated?: boolean } | null> {
  const res = await fetch(
    `/api/github/file-content?repo=${encodeURIComponent(repoFullName)}&path=${encodeURIComponent(filePath)}`
  );

  const data = await res.json().catch(() => ({}));

  if (data.error === "binary_file") return null;

  if (!res.ok) {
    throw new Error(data.error ?? `GitHub file-content fetch failed (${res.status})`);
  }

  return data as { content: string; language: string; filename: string; truncated?: boolean };
}
