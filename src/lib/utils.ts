import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { RepoTreeNode } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Rebuild a nested RepoTreeNode[] from a flat array of blob file paths. */
export function buildTreeFromPaths(paths: string[]): RepoTreeNode[] {
  const root: RepoTreeNode[] = [];

  for (const filePath of paths) {
    const parts = filePath.split("/");
    let level = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      const existing = level.find((n) => n.name === part);

      if (existing) {
        if (!isFile) level = existing.children!;
      } else {
        const newNode: RepoTreeNode = isFile
          ? { name: part, path: filePath, type: "file" }
          : { name: part, path: parts.slice(0, i + 1).join("/"), type: "directory", children: [] };
        level.push(newNode);
        if (!isFile) level = newNode.children!;
      }
    }
  }

  function sortNodes(nodes: RepoTreeNode[]): RepoTreeNode[] {
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
