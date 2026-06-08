import type { CodeLine, Explanation, RepoTreeNode, SelectedFile, TokenType } from "./types";

export type { TokenType, CodeLine, Explanation };

export const fileName = "useDebouncedValue.ts";
export const filePath = "src/hooks/useDebouncedValue.ts";

export const DEMO_FILE: SelectedFile = {
  repoName: "codescribe",
  path: filePath,
  filename: fileName,
  language: "typescript",
  content: `import { useState, useEffect } from "react";

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebouncedValue;`,
};

export const code: CodeLine[] = [
  {
    no: 1,
    tokens: [
      { type: "keyword", text: "import" },
      { type: "plain", text: " { " },
      { type: "function", text: "useState" },
      { type: "punctuation", text: ", " },
      { type: "function", text: "useEffect" },
      { type: "plain", text: " } " },
      { type: "keyword", text: "from" },
      { type: "string", text: ' "react"' },
      { type: "punctuation", text: ";" },
    ],
  },
  { no: 2, tokens: [] },
  {
    no: 3,
    tokens: [
      { type: "keyword", text: "function" },
      { type: "plain", text: " " },
      { type: "function", text: "useDebouncedValue" },
      { type: "punctuation", text: "<T>(" },
      { type: "variable", text: "value" },
      { type: "punctuation", text: ": T, " },
      { type: "variable", text: "delay" },
      { type: "punctuation", text: ": " },
      { type: "keyword", text: "number" },
      { type: "punctuation", text: "): T {" },
    ],
  },
  {
    no: 4,
    tokens: [
      { type: "plain", text: "  " },
      { type: "keyword", text: "const" },
      { type: "plain", text: " [" },
      { type: "variable", text: "debouncedValue" },
      { type: "punctuation", text: ", " },
      { type: "function", text: "setDebouncedValue" },
      { type: "punctuation", text: "] = " },
      { type: "function", text: "useState" },
      { type: "punctuation", text: "<T>(" },
      { type: "variable", text: "value" },
      { type: "punctuation", text: ");" },
    ],
  },
  { no: 5, tokens: [] },
  {
    no: 6,
    tokens: [
      { type: "plain", text: "  " },
      { type: "function", text: "useEffect" },
      { type: "punctuation", text: "(() => {" },
    ],
  },
  {
    no: 7,
    tokens: [
      { type: "plain", text: "    " },
      { type: "keyword", text: "const" },
      { type: "plain", text: " " },
      { type: "variable", text: "timer" },
      { type: "plain", text: " = " },
      { type: "function", text: "setTimeout" },
      { type: "punctuation", text: "(() => {" },
    ],
  },
  {
    no: 8,
    tokens: [
      { type: "plain", text: "      " },
      { type: "function", text: "setDebouncedValue" },
      { type: "punctuation", text: "(" },
      { type: "variable", text: "value" },
      { type: "punctuation", text: ");" },
    ],
  },
  {
    no: 9,
    tokens: [
      { type: "plain", text: "    " },
      { type: "punctuation", text: "}, " },
      { type: "variable", text: "delay" },
      { type: "punctuation", text: ");" },
    ],
  },
  { no: 10, tokens: [] },
  {
    no: 11,
    tokens: [
      { type: "plain", text: "    " },
      { type: "keyword", text: "return" },
      { type: "plain", text: " () => {" },
    ],
  },
  {
    no: 12,
    tokens: [
      { type: "plain", text: "      " },
      { type: "function", text: "clearTimeout" },
      { type: "punctuation", text: "(" },
      { type: "variable", text: "timer" },
      { type: "punctuation", text: ");" },
    ],
  },
  {
    no: 13,
    tokens: [{ type: "plain", text: "    };" }],
  },
  {
    no: 14,
    tokens: [
      { type: "plain", text: "  }, [" },
      { type: "variable", text: "value" },
      { type: "punctuation", text: ", " },
      { type: "variable", text: "delay" },
      { type: "punctuation", text: "]);" },
    ],
  },
  { no: 15, tokens: [] },
  {
    no: 16,
    tokens: [
      { type: "plain", text: "  " },
      { type: "keyword", text: "return" },
      { type: "plain", text: " " },
      { type: "variable", text: "debouncedValue" },
      { type: "punctuation", text: ";" },
    ],
  },
  {
    no: 17,
    tokens: [{ type: "punctuation", text: "}" }],
  },
  { no: 18, tokens: [] },
  {
    no: 19,
    tokens: [
      { type: "keyword", text: "export" },
      { type: "plain", text: " " },
      { type: "keyword", text: "default" },
      { type: "plain", text: " " },
      { type: "function", text: "useDebouncedValue" },
      { type: "punctuation", text: ";" },
    ],
  },
];

export const explanations: Explanation[] = [
  {
    ref: "imports",
    lines: [1],
    segments: [
      { text: "Pull in React's " },
      { text: "useState", tok: "function" },
      { text: " and " },
      { text: "useEffect", tok: "function" },
      { text: " hooks — the two tools this hook needs to do its job." },
    ],
  },
  {
    ref: "signature",
    lines: [3],
    segments: [
      { text: "Define a generic function called " },
      { text: "useDebouncedValue", tok: "function" },
      { text: " that accepts any " },
      { text: "value", tok: "variable" },
      { text: " and a " },
      { text: "delay", tok: "variable" },
      { text: " in milliseconds. The " },
      { text: "<T>", tok: "keyword" },
      { text: " means it works with any data type." },
    ],
  },
  {
    ref: "state",
    lines: [4],
    segments: [
      { text: "Create internal state — " },
      { text: "debouncedValue", tok: "variable" },
      { text: " — to hold the delayed copy. It starts equal to " },
      { text: "value", tok: "variable" },
      { text: " right now." },
    ],
  },
  {
    ref: "effect",
    lines: [6, 7, 8, 9],
    segments: [
      { text: "Run this effect whenever " },
      { text: "value", tok: "variable" },
      { text: " or " },
      { text: "delay", tok: "variable" },
      { text: " changes. Start a " },
      { text: "setTimeout", tok: "function" },
      { text: " — after the delay expires, copy the latest " },
      { text: "value", tok: "variable" },
      { text: " into state." },
    ],
  },
  {
    ref: "cleanup",
    lines: [11, 12, 13, 14],
    segments: [
      { text: "Return a cleanup function. React calls it before the next run. " },
      { text: "clearTimeout", tok: "function" },
      { text: " cancels any pending timer, so rapid changes only trigger one update after they stop." },
    ],
  },
  {
    ref: "return",
    lines: [16],
    segments: [
      { text: "Hand back " },
      { text: "debouncedValue", tok: "variable" },
      { text: " — the caller sees this stable, delayed value instead of the raw input." },
    ],
  },
  {
    ref: "export",
    lines: [19],
    segments: [
      { text: "Export the hook so other files can " },
      { text: "import", tok: "keyword" },
      { text: " and use it." },
    ],
  },
];

export const DEMO_REPO_TREE: RepoTreeNode[] = [
  {
    name: "src",
    path: "src",
    type: "directory",
    children: [
      {
        name: "components",
        path: "src/components",
        type: "directory",
        children: [
          { name: "CodePanel.tsx",       path: "src/components/CodePanel.tsx",       type: "file" },
          { name: "ExplanationPanel.tsx", path: "src/components/ExplanationPanel.tsx", type: "file" },
          { name: "FileBrowser.tsx",     path: "src/components/FileBrowser.tsx",     type: "file" },
          { name: "token-colors.ts",     path: "src/components/token-colors.ts",     type: "file" },
          {
            name: "ui",
            path: "src/components/ui",
            type: "directory",
            children: [
              { name: "accordion.tsx",       path: "src/components/ui/accordion.tsx",       type: "file" },
              { name: "alert-dialog.tsx",    path: "src/components/ui/alert-dialog.tsx",    type: "file" },
              { name: "alert.tsx",           path: "src/components/ui/alert.tsx",           type: "file" },
              { name: "avatar.tsx",          path: "src/components/ui/avatar.tsx",          type: "file" },
              { name: "badge.tsx",           path: "src/components/ui/badge.tsx",           type: "file" },
              { name: "button.tsx",          path: "src/components/ui/button.tsx",          type: "file" },
              { name: "card.tsx",            path: "src/components/ui/card.tsx",            type: "file" },
              { name: "checkbox.tsx",        path: "src/components/ui/checkbox.tsx",        type: "file" },
              { name: "collapsible.tsx",     path: "src/components/ui/collapsible.tsx",     type: "file" },
              { name: "command.tsx",         path: "src/components/ui/command.tsx",         type: "file" },
              { name: "dialog.tsx",          path: "src/components/ui/dialog.tsx",          type: "file" },
              { name: "drawer.tsx",          path: "src/components/ui/drawer.tsx",          type: "file" },
              { name: "dropdown-menu.tsx",   path: "src/components/ui/dropdown-menu.tsx",   type: "file" },
              { name: "form.tsx",            path: "src/components/ui/form.tsx",            type: "file" },
              { name: "input.tsx",           path: "src/components/ui/input.tsx",           type: "file" },
              { name: "label.tsx",           path: "src/components/ui/label.tsx",           type: "file" },
              { name: "popover.tsx",         path: "src/components/ui/popover.tsx",         type: "file" },
              { name: "scroll-area.tsx",     path: "src/components/ui/scroll-area.tsx",     type: "file" },
              { name: "select.tsx",          path: "src/components/ui/select.tsx",          type: "file" },
              { name: "separator.tsx",       path: "src/components/ui/separator.tsx",       type: "file" },
              { name: "sheet.tsx",           path: "src/components/ui/sheet.tsx",           type: "file" },
              { name: "sidebar.tsx",         path: "src/components/ui/sidebar.tsx",         type: "file" },
              { name: "skeleton.tsx",        path: "src/components/ui/skeleton.tsx",        type: "file" },
              { name: "slider.tsx",          path: "src/components/ui/slider.tsx",          type: "file" },
              { name: "switch.tsx",          path: "src/components/ui/switch.tsx",          type: "file" },
              { name: "table.tsx",           path: "src/components/ui/table.tsx",           type: "file" },
              { name: "tabs.tsx",            path: "src/components/ui/tabs.tsx",            type: "file" },
              { name: "textarea.tsx",        path: "src/components/ui/textarea.tsx",        type: "file" },
              { name: "toast.tsx",           path: "src/components/ui/toast.tsx",           type: "file" },
              { name: "toggle.tsx",          path: "src/components/ui/toggle.tsx",          type: "file" },
              { name: "tooltip.tsx",         path: "src/components/ui/tooltip.tsx",         type: "file" },
            ],
          },
        ],
      },
      {
        name: "hooks",
        path: "src/hooks",
        type: "directory",
        children: [
          { name: "useDebouncedValue.ts", path: "src/hooks/useDebouncedValue.ts", type: "file" },
        ],
      },
      {
        name: "lib",
        path: "src/lib",
        type: "directory",
        children: [
          { name: "types.ts",     path: "src/lib/types.ts",     type: "file" },
          { name: "demo-data.ts", path: "src/lib/demo-data.ts", type: "file" },
          { name: "utils.ts",     path: "src/lib/utils.ts",     type: "file" },
          {
            name: "api",
            path: "src/lib/api",
            type: "directory",
            children: [
              { name: "explain.ts", path: "src/lib/api/explain.ts", type: "file" },
              { name: "repos.ts",   path: "src/lib/api/repos.ts",   type: "file" },
            ],
          },
        ],
      },
      { name: "App.tsx",    path: "src/App.tsx",    type: "file" },
      { name: "main.tsx",   path: "src/main.tsx",   type: "file" },
      { name: "styles.css", path: "src/styles.css", type: "file" },
    ],
  },
  {
    name: "server",
    path: "server",
    type: "directory",
    children: [
      { name: "index.js", path: "server/index.js", type: "file" },
    ],
  },
  { name: "index.html",   path: "index.html",   type: "file" },
  { name: "package.json", path: "package.json", type: "file" },
  { name: "tsconfig.json", path: "tsconfig.json", type: "file" },
  { name: "vite.config.ts", path: "vite.config.ts", type: "file" },
];
