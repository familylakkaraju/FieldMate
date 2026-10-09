export function cx(...parts: (string | false | null | undefined | 0)[]): string {
  return parts.filter(Boolean).join(' ');
}

/** Resolve a public asset path (fixtures store `assets/...`) against the Vite base URL. */
export function asset(path?: string): string {
  if (!path) return '';
  if (/^(data:|blob:|https?:)/.test(path)) return path;
  const base = import.meta.env.BASE_URL || './';
  return `${base.endsWith('/') ? base : `${base}/`}${path.replace(/^\.?\//, '')}`;
}
