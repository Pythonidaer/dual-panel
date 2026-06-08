import type { CodeLine } from "@/lib/types";
import { tokenColor } from "./token-colors";
import { cn } from "@/lib/utils";

interface CodePanelProps {
  code: CodeLine[];
  fileName: string;
  filePath: string;
  activeLines: number[];
  onHoverLine: (no: number | null) => void;
}

export function CodePanel({ code, fileName, filePath, activeLines, onHoverLine }: CodePanelProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-editor-bg shadow-2xl">
      {/* title bar */}
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        <div className="ml-3 flex items-center gap-2 text-xs text-tok-comment">
          <FileIcon />
          <span className="font-mono text-[var(--color-tok-variable)]">{fileName}</span>
        </div>
        <span className="ml-auto truncate font-mono text-[10px] text-tok-comment">{filePath}</span>
      </div>

      {/* code body */}
      <div className="flex-1 overflow-y-auto py-3 font-mono text-[13px] leading-7 text-white/80">
        {code.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center px-6">
            <p className="text-sm text-white/30">No file selected</p>
          </div>
        ) : (
          code.map((line) => (
            <CodeRow
              key={line.no}
              line={line}
              active={activeLines.includes(line.no)}
              onHoverLine={onHoverLine}
            />
          ))
        )}
      </div>
    </div>
  );
}

function CodeRow({
  line,
  active,
  onHoverLine,
}: {
  line: CodeLine;
  active: boolean;
  onHoverLine: (no: number | null) => void;
}) {
  return (
    <div
      id={`code-line-${line.no}`}
      onMouseEnter={() => onHoverLine(line.no)}
      onMouseLeave={() => onHoverLine(null)}
      className={cn(
        "group flex cursor-default items-start px-2 transition-colors",
        active ? "bg-primary/15" : "hover:bg-editor-line",
      )}
    >
      <span
        className={cn(
          "w-10 shrink-0 select-none pt-[1px] pr-4 text-right text-tok-comment transition-colors",
          active && "text-primary-foreground/80",
        )}
      >
        {line.no}
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 break-all border-l-2 pl-3 transition-colors",
          active ? "border-primary" : "border-transparent",
        )}
      >
        {line.tokens.length === 0 ? (
          <span>&nbsp;</span>
        ) : (
          line.tokens.map((tok, i) => (
            <span key={i} className={tokenColor[tok.type]} style={{ whiteSpace: "pre-wrap" }}>
              {tok.text}
            </span>
          ))
        )}
      </span>
    </div>
  );
}

function FileIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="text-tok-function">
      <path
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
