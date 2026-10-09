// The demo runs on a fixed business day so every screen tells the same story.
// Change DEMO_DATE to move the whole scenario (fixtures are written against it).
export const DEMO_DATE = '2026-10-09'; // Friday 9 October 2026

// Narrative clock: the fixtures describe the business at about 10:05 on the demo morning.
// When the demo loads, the clock starts at 10:06 (or just after the latest saved activity)
// and then runs in real time, so whatever the presenter does is stamped in order and the
// schedule's "now" line matches the story regardless of the real time of day.
const NARRATIVE_NOW = (10 * 60 + 6) * 60; // 10:06 in seconds
const DAY_END = (18 * 60 + 30) * 60;
let base = NARRATIVE_NOW;
let realStart = Date.now();
let lastIssued = 0;

const pad = (n: number) => String(n).padStart(2, '0');

const fmt = (secs: number) => `${DEMO_DATE}T${pad(Math.floor(secs / 3600))}:${pad(Math.floor((secs % 3600) / 60))}:${pad(secs % 60)}`;
const current = () => Math.min(base + Math.floor((Date.now() - realStart) / 1000), DAY_END);

/** Restart the narrative clock just after the latest timestamp already in the data. */
export function seedClock(latestIso?: string): void {
  let secs = NARRATIVE_NOW;
  if (latestIso?.startsWith(DEMO_DATE)) {
    const [h, m, s] = latestIso.slice(11).split(':').map(Number);
    secs = Math.max(secs, h * 3600 + m * 60 + (s || 0) + 30);
  }
  base = Math.min(secs, DAY_END);
  realStart = Date.now();
  lastIssued = 0;
}

/** Timestamp for a new event (strictly increasing). */
export function demoNow(): string {
  let secs = current();
  if (secs <= lastIssued) secs = lastIssued + 1;
  lastIssued = secs;
  return fmt(secs);
}

/** Current demo time without reserving a timestamp (for displays such as "now" lines). */
export function demoClock(): string {
  return fmt(Math.max(current(), lastIssued));
}

/** Date-only or datetime local string → Date (never treated as UTC). */
export function parseLocal(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T00:00:00`);
  return new Date(value);
}

export function toLocalIso(d: Date, withSeconds = false): string {
  const base = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return withSeconds ? `${base}:${pad(d.getSeconds())}` : base;
}

export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Add days to a YYYY-MM-DD key. */
export function addDays(dateKey: string, days: number): string {
  const d = parseLocal(dateKey);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

/** `at(-2, '14:30')` → ISO local datetime relative to the demo date. */
export function at(dayOffset: number, time: string): string {
  return `${addDays(DEMO_DATE, dayOffset)}T${time}`;
}

export function day(dayOffset: number): string {
  return addDays(DEMO_DATE, dayOffset);
}

export function dateKeyOf(iso: string): string {
  return iso.slice(0, 10);
}

export function minutesOfDay(iso: string): number {
  const t = iso.slice(11, 16);
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function isDemoToday(iso?: string): boolean {
  return !!iso && iso.startsWith(DEMO_DATE);
}
