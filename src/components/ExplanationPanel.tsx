import { useEffect, useState } from "react";
import { motion } from "motion/react";
import type { Explanation } from "@/lib/types";
import { tokenColor } from "./token-colors";
import { cn } from "@/lib/utils";

interface ExplanationPanelProps {
  explanations: Explanation[];
  hoveredLine: number | null;
  onHoverExplanation: (lines: number[] | null) => void;
  onScrollToLine?: (lineNo: number) => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onNeedApiKey?: () => void;
}

export function ExplanationPanel({
  explanations,
  hoveredLine,
  onHoverExplanation,
  onScrollToLine,
  isLoading,
  error,
  onRetry,
  onNeedApiKey,
}: ExplanationPanelProps) {
  const [revealed, setRevealed] = useState(0);

  // Reset reveal animation whenever a new set of explanations arrives
  useEffect(() => {
    setRevealed(0);
  }, [explanations]);

  useEffect(() => {
    if (revealed >= explanations.length) return;
    const t = setTimeout(() => setRevealed((r) => r + 1), 650);
    return () => clearTimeout(t);
  }, [revealed, explanations]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
      {/* header */}
      <div className="flex items-center gap-3 border-b border-border px-5 py-4">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15">
          <SparkIcon />
        </div>
        <div>
          <p className="text-sm font-semibold leading-none">Plain-language read</p>
          <p className="mt-1 text-xs text-muted-foreground">Line-by-line, in human terms</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          {error ? (
            <span className="text-destructive">error</span>
          ) : explanations.length > 0 && revealed >= explanations.length ? (
            <span className="text-primary/70">ready</span>
          ) : null}
        </div>
      </div>

      {/* body */}
      <div className="flex-1 space-y-3 overflow-auto px-5 py-5">

        {isLoading && (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15">
              <SparkIcon />
            </div>
            <p className="text-sm text-muted-foreground">Reading the file…</p>
            <TypingDots />
          </div>
        )}

        {!isLoading && error && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <p className="text-2xl">⚠</p>
            <p className="text-sm text-foreground/80 max-w-xs">{error}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-1 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                Retry
              </button>
            )}
          </div>
        )}

        {/* Welcome / idle state */}
        {!isLoading && !error && explanations.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center px-6">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-muted">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-muted-foreground/60">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" />
                <path d="M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-sm font-medium text-foreground/70">Select a file to begin</p>
            <p className="text-xs text-muted-foreground max-w-[200px] leading-relaxed">
              Click any file in the panel on the left and a plain-language explanation will appear here.
            </p>
            {onNeedApiKey && (
              <button
                onClick={onNeedApiKey}
                className="mt-1 rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                Configure API keys
              </button>
            )}
          </div>
        )}

        {!isLoading && !error && explanations.length > 0 &&
          explanations.map((ex, i) =>
            i < revealed ? (
              <ExplanationBlock
                key={ex.ref}
                ex={ex}
                active={hoveredLine != null && ex.lines.includes(hoveredLine)}
                onHover={() => onHoverExplanation(ex.lines)}
                onLeave={() => onHoverExplanation(null)}
                onScrollToLine={onScrollToLine}
              />
            ) : null,
          )}

        {!isLoading && !error && revealed < explanations.length && <TypingDots />}
      </div>
    </div>
  );
}

function ExplanationBlock({
  ex,
  active,
  onHover,
  onLeave,
  onScrollToLine,
}: {
  ex: Explanation;
  active: boolean;
  onHover: () => void;
  onLeave: () => void;
  onScrollToLine?: (lineNo: number) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={() => onScrollToLine?.(ex.lines[0])}
      className={cn(
        "rounded-xl border p-4 transition-colors",
        onScrollToLine ? "cursor-pointer" : "cursor-default",
        active
          ? "border-primary/40 bg-primary/5"
          : "border-transparent hover:border-border hover:bg-muted/40",
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
          {ex.lines.length > 1
            ? `L${ex.lines[0]}–${ex.lines[ex.lines.length - 1]}`
            : `L${ex.lines[0]}`}
        </span>
      </div>
      <p className="text-[15px] leading-relaxed text-foreground/90">
        {ex.segments.map((seg, i) => (
          <span
            key={i}
            className={cn(
              seg.tok && seg.tok !== "plain" && tokenColor[seg.tok],
              seg.tok && seg.tok !== "plain" && "font-semibold",
            )}
          >
            {seg.text}
          </span>
        ))}
      </p>
    </motion.div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 px-1 py-2">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-2 w-2 rounded-full bg-primary/60"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}

function SparkIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="text-primary">
      <path
        d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3z"
        fill="currentColor"
      />
      <path d="M19 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

