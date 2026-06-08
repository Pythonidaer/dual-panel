import type { CodeLine, CodeToken, TokenType } from "./types";

// Full set of JS/TS reserved words + common built-in type keywords
const JS_KEYWORDS = new Set([
  "break", "case", "catch", "class", "const", "continue", "debugger",
  "default", "delete", "do", "else", "export", "extends", "false", "finally",
  "for", "from", "function", "if", "import", "in", "instanceof", "let",
  "new", "null", "of", "return", "static", "super", "switch", "this",
  "throw", "true", "try", "typeof", "undefined", "var", "void", "while",
  "with", "yield", "async", "await", "as", "interface", "type", "enum",
  "abstract", "implements", "namespace", "module", "declare", "readonly",
  "override", "satisfies", "keyof", "infer", "is", "never", "any",
  "boolean", "number", "string", "object", "symbol", "bigint", "unknown",
  "public", "private", "protected",
]);

export function tokenizeContent(content: string, language: string): CodeLine[] {
  const lines = content.split("\n");
  const isJsLike = language === "typescript" || language === "javascript";
  const result: CodeLine[] = [];
  let inBlockComment = false;

  for (let i = 0; i < lines.length; i++) {
    if (isJsLike) {
      const out = tokenizeJsLine(lines[i], inBlockComment);
      inBlockComment = out.inBlockComment;
      result.push({ no: i + 1, tokens: out.tokens });
    } else {
      result.push({
        no: i + 1,
        tokens: lines[i].length > 0 ? [{ type: "plain", text: lines[i] }] : [],
      });
    }
  }

  return result;
}

function tokenizeJsLine(
  line: string,
  inBlockComment: boolean,
): { tokens: CodeToken[]; inBlockComment: boolean } {
  const tokens: CodeToken[] = [];
  let pos = 0;

  const push = (type: TokenType, text: string) => {
    if (!text) return;
    // Merge consecutive whitespace into one plain token
    const last = tokens[tokens.length - 1];
    if (last && last.type === "plain" && type === "plain") {
      last.text += text;
    } else {
      tokens.push({ type, text });
    }
  };

  while (pos < line.length) {
    const ch = line[pos];

    // ── inside a block comment ───────────────────────────────────────────────
    if (inBlockComment) {
      const end = line.indexOf("*/", pos);
      if (end === -1) {
        push("comment", line.slice(pos));
        pos = line.length;
      } else {
        push("comment", line.slice(pos, end + 2));
        pos = end + 2;
        inBlockComment = false;
      }
      continue;
    }

    // ── whitespace ───────────────────────────────────────────────────────────
    if (ch === " " || ch === "\t") {
      let end = pos + 1;
      while (end < line.length && (line[end] === " " || line[end] === "\t")) end++;
      push("plain", line.slice(pos, end));
      pos = end;
      continue;
    }

    // ── line comment ─────────────────────────────────────────────────────────
    if (ch === "/" && line[pos + 1] === "/") {
      push("comment", line.slice(pos));
      pos = line.length;
      continue;
    }

    // ── block comment start ──────────────────────────────────────────────────
    if (ch === "/" && line[pos + 1] === "*") {
      const end = line.indexOf("*/", pos + 2);
      if (end === -1) {
        push("comment", line.slice(pos));
        pos = line.length;
        inBlockComment = true;
      } else {
        push("comment", line.slice(pos, end + 2));
        pos = end + 2;
      }
      continue;
    }

    // ── string / template literal ────────────────────────────────────────────
    if (ch === '"' || ch === "'" || ch === "`") {
      let end = pos + 1;
      while (end < line.length) {
        if (line[end] === "\\" && end + 1 < line.length) { end += 2; continue; }
        if (line[end] === ch) { end++; break; }
        end++;
      }
      push("string", line.slice(pos, end));
      pos = end;
      continue;
    }

    // ── numeric literal ──────────────────────────────────────────────────────
    if (
      /\d/.test(ch) &&
      (pos === 0 || !/[a-zA-Z_$]/.test(line[pos - 1]))
    ) {
      let end = pos + 1;
      while (end < line.length && /[\d.xXbBoOa-fA-F_nN]/.test(line[end])) end++;
      push("number", line.slice(pos, end));
      pos = end;
      continue;
    }

    // ── identifier (keyword / function call / variable) ──────────────────────
    if (/[a-zA-Z_$]/.test(ch)) {
      let end = pos + 1;
      while (end < line.length && /[a-zA-Z0-9_$]/.test(line[end])) end++;
      const word = line.slice(pos, end);

      // Peek past whitespace to detect a call site
      let look = end;
      while (look < line.length && line[look] === " ") look++;
      const isCall = line[look] === "(";

      if (JS_KEYWORDS.has(word)) {
        push("keyword", word);
      } else if (isCall) {
        push("function", word);
      } else {
        push("variable", word);
      }
      pos = end;
      continue;
    }

    // ── punctuation / operators ──────────────────────────────────────────────
    push("punctuation", ch);
    pos++;
  }

  return { tokens, inBlockComment };
}
