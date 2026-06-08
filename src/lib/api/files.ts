import type { RepoTreeNode } from "../types";

export interface FileContentResponse {
  content: string;
  language: string;
  filename: string;
}

export async function fetchFileContent(filePath: string): Promise<FileContentResponse> {
  const res = await fetch(`/api/file-content?path=${encodeURIComponent(filePath)}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(
      (data as { error?: string }).error ?? `Failed to load file (${res.status})`,
    );
  }
  return res.json() as Promise<FileContentResponse>;
}

export async function fetchFileTree(): Promise<RepoTreeNode[]> {
  const res = await fetch("/api/file-tree");
  if (!res.ok) throw new Error(`Failed to load file tree (${res.status})`);
  const data = await res.json() as { tree: RepoTreeNode[] };
  return data.tree;
}
