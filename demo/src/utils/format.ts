import { DEMO_DATE, demoClock, parseLocal } from '../data/demoClock';
import type { QuoteLine } from '../types/domain';

const gbp0 = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });
const gbp2 = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2 });

export function money(value: number | undefined, pence = false): string {
  if (value === undefined || Number.isNaN(value)) return '—';
  if (pence || value % 1 !== 0) return gbp2.format(value);
  return gbp0.format(value);
}

export function compactMoney(value: number): string {
  if (value >= 1000) return `£${(value / 1000).toFixed(value >= 10000 ? 1 : 2).replace(/\.0+$/, '')}k`;
  return gbp0.format(value);
}

export function time(iso?: string): string {
  if (!iso) return '';
  return iso.slice(11, 16);
}

export function timeRange(start?: string, end?: string): string {
  if (!start) return 'Unscheduled';
  return end ? `${time(start)}–${time(end)}` : time(start);
}

const dayDiff = (iso: string) => {
  const a = parseLocal(DEMO_DATE);
  const b = parseLocal(iso.slice(0, 10));
  return Math.round((b.getTime() - a.getTime()) / 86400000);
};

export function shortDate(iso?: string): string {
  if (!iso) return '';
  return parseLocal(iso.slice(0, 10)).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function longDate(iso?: string): string {
  if (!iso) return '';
  return parseLocal(iso.slice(0, 10)).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function dayMonth(iso?: string): string {
  if (!iso) return '';
  return parseLocal(iso.slice(0, 10)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function dayMonthYear(iso?: string): string {
  if (!iso) return '';
  return parseLocal(iso.slice(0, 10)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** "Today", "Tomorrow", "Yesterday", "Mon 12 Oct" relative to the demo date. */
export function relativeDay(iso?: string): string {
  if (!iso) return '';
  const diff = dayDiff(iso);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return shortDate(iso);
}

export function relativeDayTime(iso?: string): string {
  if (!iso) return 'Unscheduled';
  return `${relativeDay(iso)} · ${time(iso)}`;
}

/** "Just now", "12 min ago", "2 h ago", "Yesterday", "6 Oct" relative to the demo clock. */
export function timeAgo(iso?: string): string {
  if (!iso) return '';
  const diff = dayDiff(iso);
  if (diff === 0) {
    const now = parseLocal(demoClock());
    const then = parseLocal(iso);
    const mins = Math.round((now.getTime() - then.getTime()) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    return `${Math.floor(mins / 60)} h ago`;
  }
  if (diff === -1) return 'Yesterday';
  if (diff > 0) return relativeDay(iso);
  return dayMonth(iso);
}

export function duration(mins?: number): string {
  if (mins === undefined) return '—';
  const sign = mins < 0 ? '-' : '';
  const m = Math.abs(Math.round(mins));
  if (m < 60) return `${sign}${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${sign}${h} h ${r} min` : `${sign}${h} h`;
}

export function lineTotal(lines: QuoteLine[]): number {
  return lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
}

export function quoteTotals(lines: QuoteLine[], discount = 0, vat = false) {
  const subtotal = lineTotal(lines);
  const net = Math.max(0, subtotal - discount);
  const vatAmount = vat ? Math.round(net * 0.2 * 100) / 100 : 0;
  return { subtotal, discount, net, vatAmount, total: net + vatAmount };
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

export function pluralise(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function titleCase(s: string): string {
  return s.replace(/(^|[\s-])(\w)/g, (_m, a: string, b: string) => `${a}${b.toUpperCase()}`).replace(/-/g, ' ');
}
