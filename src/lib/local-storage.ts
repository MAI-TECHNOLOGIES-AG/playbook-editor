const noStorage =
  typeof window === "undefined" || typeof localStorage === "undefined";

/**
 * Read and parse JSON from `localStorage`. Returns `defaultValue` if the key
 * is missing, JSON is invalid, or `isValue` rejects the parsed value.
 */
export function readLocalStorageJson<T>(
  key: string,
  isValue: (value: unknown) => value is T,
  defaultValue: T,
): T {
  if (noStorage) return defaultValue;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return defaultValue;
    const parsed: unknown = JSON.parse(raw);
    return isValue(parsed) ? parsed : defaultValue;
  } catch {
    return defaultValue;
  }
}

/** Serialize `value` as JSON and store under `key`. Ignores quota / private-mode errors. */
export function writeLocalStorageJson(key: string, value: unknown): void {
  if (noStorage) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota or disabled storage */
  }
}
