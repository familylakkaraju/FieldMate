// The only module that touches localStorage. Everything else goes through the demo store.

export const STORAGE_KEYS = {
  data: 'fieldmate-demo-data-v1',
  brand: 'fieldmate-demo-brand-v1',
  persona: 'fieldmate-demo-persona-v1',
} as const;

function store(): Storage | undefined {
  try {
    return typeof window !== 'undefined' ? window.localStorage : undefined;
  } catch {
    return undefined;
  }
}

export function readJson<T>(key: string): T | undefined {
  try {
    const raw = store()?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    store()?.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked — the demo keeps working in memory */
  }
}

export function clearDemoStorage(): void {
  try {
    Object.values(STORAGE_KEYS).forEach((k) => store()?.removeItem(k));
  } catch {
    /* ignore */
  }
}
