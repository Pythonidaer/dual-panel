import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { saveKeys, clearKeys, getStoredKeys, hasOpenAIKey, type KeyStorageMode } from "@/lib/client/keys";
import { cn } from "@/lib/utils";

interface KeySetupDialogProps {
  open: boolean;
  onClose: () => void;
  onKeysSaved: () => void;
  onContinueDemo: () => void;
}

export function KeySetupDialog({ open, onClose, onKeysSaved, onContinueDemo }: KeySetupDialogProps) {
  const existing = getStoredKeys();
  const [openaiKey, setOpenaiKey] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [storageMode, setStorageMode] = useState<KeyStorageMode>("localStorage");
  const [error, setError] = useState<string | null>(null);

  const keysAlreadyExist = hasOpenAIKey();

  function handleSave() {
    const trimmedKey = openaiKey.trim();
    if (!trimmedKey) {
      setError("OpenAI API key is required.");
      return;
    }
    if (!trimmedKey.startsWith("sk-")) {
      setError('OpenAI API keys start with "sk-". Please double-check your key.');
      return;
    }
    setError(null);
    saveKeys({
      openaiApiKey: trimmedKey,
      githubToken: githubToken.trim() || undefined,
      storageMode,
    });
    setOpenaiKey("");
    setGithubToken("");
    onKeysSaved();
  }

  function handleForget() {
    clearKeys();
    setOpenaiKey("");
    setGithubToken("");
    setError(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="mb-1 flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15">
              <KeyIcon />
            </div>
            <DialogTitle>Set up your API keys</DialogTitle>
          </div>
          <DialogDescription>
            Bring your own OpenAI key to generate code explanations. A GitHub token is optional and only needed for browsing your repos.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-1">
          {/* OpenAI key */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">
              OpenAI API key <span className="text-destructive">*</span>
            </label>
            <input
              type="password"
              placeholder="sk-..."
              value={openaiKey}
              onChange={(e) => { setOpenaiKey(e.target.value); setError(null); }}
              className="w-full rounded-lg border border-border bg-muted px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-primary/50"
              autoComplete="off"
              autoFocus
            />
          </div>

          {/* GitHub token */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">
              GitHub Personal Access Token{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              type="password"
              placeholder="ghp_... or github_pat_..."
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              className="w-full rounded-lg border border-border bg-muted px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-primary/50"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Required only for browsing your private or authenticated repos.
            </p>
          </div>

          {/* Storage mode */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">Where to store your keys</label>
            <div className="flex flex-col gap-1.5">
              {STORAGE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                    storageMode === opt.value
                      ? "border-primary/40 bg-primary/5"
                      : "border-border hover:bg-muted/50",
                  )}
                >
                  <input
                    type="radio"
                    name="storage-mode"
                    value={opt.value}
                    checked={storageMode === opt.value}
                    onChange={() => setStorageMode(opt.value)}
                    className="mt-0.5 accent-primary"
                  />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium leading-none">
                      {opt.label}
                      {opt.value === "localStorage" && (
                        <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary uppercase tracking-wide">
                          recommended
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">{opt.description}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Security notice */}
          <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground leading-relaxed space-y-2">
            <p>
              <strong className="text-foreground">Your keys are stored only in your browser.</strong>{" "}
              If you choose localStorage, they persist on this device until you clear them. If you choose
              sessionStorage, they clear when this tab closes. If you choose memory only, they clear on
              refresh.
            </p>
            <p>
              When you request a code explanation or repo file, your key is sent to this app's server only
              so it can forward the request to OpenAI or GitHub.{" "}
              <strong className="text-foreground">The server does not save your key and never logs it.</strong>
            </p>
            <p>
              You can delete your saved keys at any time using the <strong className="text-foreground">"Forget my keys"</strong> button.
            </p>
            <p className="text-muted-foreground/70">
              Do not use this on shared or public computers. Use restricted/scoped tokens when possible.
            </p>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter className="mt-2 flex-wrap gap-2">
          {keysAlreadyExist && (
            <button
              type="button"
              onClick={handleForget}
              className="rounded-lg border border-destructive/40 px-4 py-2 text-sm font-medium text-destructive transition hover:bg-destructive/10"
            >
              Forget my keys
            </button>
          )}
          <div className="flex-1" />
          <button
            type="button"
            onClick={onContinueDemo}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted"
          >
            Continue with demo
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!openaiKey.trim()}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
          >
            Save keys
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const STORAGE_OPTIONS: { value: KeyStorageMode; label: string; description: string }[] = [
  {
    value: "localStorage",
    label: "localStorage",
    description: "Persists across browser sessions on this device until you clear it.",
  },
  {
    value: "sessionStorage",
    label: "sessionStorage",
    description: "Cleared automatically when this tab or session closes.",
  },
  {
    value: "memory",
    label: "Memory only",
    description: "Cleared immediately on page refresh — highest privacy.",
  },
];

function KeyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-primary">
      <path
        d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
