import type {
  ExplainFileRequest,
  ExplainFileResponse,
  Explanation,
  ExplanationSegment,
  RawExplanationLine,
  TokenType,
} from "../types";

/**
 * Calls the server-side Ollama explanation endpoint.
 * In dev, Vite proxies /api -> :3001. In production, the server serves the SPA.
 */
export async function explainFile(
  file: ExplainFileRequest,
): Promise<ExplainFileResponse> {
  const res = await fetch("/api/explain-file", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(file),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(
      (data as { error?: string }).error ?? `Explanation failed (${res.status})`,
    );
  }

  return res.json() as Promise<ExplainFileResponse>;
}

/**
 * Convert the raw LLM response into the Explanation[] the panel expects.
 * Handles single-line entries and multi-line groups (via linesEnd).
 * Sorts by line number and warns in dev when gaps exist.
 */
export function rawToExplanations(
  raw: RawExplanationLine[],
  totalCodeLines?: number,
): Explanation[] {
  const result: Explanation[] = raw
    .filter((entry) => typeof entry.lineNumber === "number")
    .map((entry) => {
      const start = entry.lineNumber;
      const end = entry.linesEnd && entry.linesEnd >= start ? entry.linesEnd : start;
      const lines: number[] = [];
      for (let n = start; n <= end; n++) lines.push(n);
      return {
        ref: `line-${start}`,
        lines,
        segments: buildSegments(entry.text, entry.highlights ?? []),
      };
    });

  // Sort ascending by first line
  result.sort((a, b) => a.lines[0] - b.lines[0]);

  // Dev-mode completeness check — warns about gaps so prompt issues are visible
  if (import.meta.env.DEV && totalCodeLines != null) {
    const covered = new Set<number>();
    for (const ex of result) ex.lines.forEach((n) => covered.add(n));
    const missing: number[] = [];
    for (let n = 1; n <= totalCodeLines; n++) {
      if (!covered.has(n)) missing.push(n);
    }
    if (missing.length > 0) {
      console.warn(
        `[Codescribe] LLM skipped ${missing.length} line(s): ${missing.join(", ")}`,
      );
    }
  }

  return result;
}

function buildSegments(
  text: string,
  highlights: Array<{ text: string; type: Exclude<TokenType, "plain" | "punctuation"> }>,
): ExplanationSegment[] {
  if (!highlights.length) return [{ text }];

  type Hit = { start: number; end: number; tok: TokenType; hlText: string };
  const hits: Hit[] = [];
  const textLower = text.toLowerCase();

  for (const h of highlights) {
    // Case-insensitive search so "usestate" in explanation matches "useState" highlight
    const idx = textLower.indexOf(h.text.toLowerCase());
    if (idx !== -1) {
      // Use the actual text slice from the explanation (preserves original casing)
      hits.push({ start: idx, end: idx + h.text.length, tok: h.type, hlText: text.slice(idx, idx + h.text.length) });
    }
  }
  hits.sort((a, b) => a.start - b.start);

  const segments: ExplanationSegment[] = [];
  let cursor = 0;

  for (const hit of hits) {
    if (hit.start < cursor) continue; // skip overlapping
    if (hit.start > cursor) segments.push({ text: text.slice(cursor, hit.start) });
    segments.push({ text: hit.hlText, tok: hit.tok });
    cursor = hit.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) });

  return segments;
}
