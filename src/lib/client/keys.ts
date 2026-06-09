export type KeyStorageMode = "localStorage" | "sessionStorage" | "memory";

export type UserKeys = {
  openaiApiKey?: string;
  githubToken?: string;
  storageMode: KeyStorageMode;
};

const STORAGE_KEY = "codescribe_user_keys";

// Module-level variable for memory-only mode
let _memoryKeys: UserKeys | null = null;

export function getStoredKeys(): UserKeys | null {
  // Memory takes priority (it was explicitly chosen this session)
  if (_memoryKeys) return _memoryKeys;

  try {
    const ls = localStorage.getItem(STORAGE_KEY);
    if (ls) return JSON.parse(ls) as UserKeys;
  } catch {
    // localStorage not available or parse error
  }

  try {
    const ss = sessionStorage.getItem(STORAGE_KEY);
    if (ss) return JSON.parse(ss) as UserKeys;
  } catch {
    // sessionStorage not available or parse error
  }

  return null;
}

export function saveKeys(keys: UserKeys): void {
  // Clear all stores first, then write to the chosen one
  _clearAllStorage();

  if (keys.storageMode === "memory") {
    _memoryKeys = keys;
    return;
  }

  try {
    const serialized = JSON.stringify(keys);
    if (keys.storageMode === "localStorage") {
      localStorage.setItem(STORAGE_KEY, serialized);
    } else {
      sessionStorage.setItem(STORAGE_KEY, serialized);
    }
  } catch {
    // Storage write failed — fall back to memory
    _memoryKeys = keys;
  }
}

export function clearKeys(): void {
  _memoryKeys = null;
  _clearAllStorage();
}

function _clearAllStorage(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

/**
 * Returns headers to attach to API requests. Only includes a header if the
 * corresponding key is actually set — never sends empty strings.
 */
export function getApiHeaders(): Record<string, string> {
  const keys = getStoredKeys();
  const headers: Record<string, string> = {};
  if (keys?.openaiApiKey?.trim()) headers["X-OpenAI-Key"] = keys.openaiApiKey.trim();
  if (keys?.githubToken?.trim()) headers["X-GitHub-Token"] = keys.githubToken.trim();
  return headers;
}

export function hasOpenAIKey(): boolean {
  return !!(getStoredKeys()?.openaiApiKey?.trim());
}

export function hasGitHubToken(): boolean {
  return !!(getStoredKeys()?.githubToken?.trim());
}
