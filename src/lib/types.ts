// ── Token types ──────────────────────────────────────────────────────────────

export type TokenType =
  | "keyword"
  | "function"
  | "variable"
  | "string"
  | "number"
  | "comment"
  | "punctuation"
  | "plain";

// ── Code panel ───────────────────────────────────────────────────────────────

export type CodeToken = {
  type: TokenType;
  text: string;
};

/** A single line in the code panel. `.no` is the 1-based line number. */
export type CodeLine = {
  no: number;
  tokens: CodeToken[];
};

// ── Explanation panel ─────────────────────────────────────────────────────────

export type ExplanationSegment = {
  text: string;
  tok?: TokenType;
};

/** One explanation block — may cover multiple source lines. */
export type Explanation = {
  ref: string;
  lines: number[];
  segments: ExplanationSegment[];
};

// ── File source ───────────────────────────────────────────────────────────────

export type FileSource =
  | { kind: "local" }
  | { kind: "github"; repo: string }; // repo = "owner/name"

// ── GitHub repo ───────────────────────────────────────────────────────────────

export type GitHubRepo = {
  name: string;
  fullName: string;
  defaultBranch: string;
  description: string;
  private: boolean;
};

// ── File / repo ───────────────────────────────────────────────────────────────

export type SelectedFile = {
  repoName: string;
  path: string;
  filename: string;
  language: string;
  content: string;
};

export type RepoTreeNode = {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: RepoTreeNode[];
};

// ── API ───────────────────────────────────────────────────────────────────────

export type ExplainFileRequest = {
  filename: string;
  path: string;
  language: string;
  content: string;
};

/** Raw shape returned by /api/explain-file. */
export type RawExplanationLine = {
  lineNumber: number;
  /** Last line of a multi-line group. Equals lineNumber for single-line entries. */
  linesEnd?: number;
  text: string;
  highlights?: Array<{ text: string; type: Exclude<TokenType, "plain" | "punctuation"> }>;
};

export type ExplainFileResponse = {
  explanation: RawExplanationLine[];
  rawText?: string;
};
