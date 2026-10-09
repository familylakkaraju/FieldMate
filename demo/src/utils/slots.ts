import type { ServiceType } from '../types/domain';
import { addDays, DEMO_DATE, parseLocal } from '../data/demoClock';
import { DEFAULT_CREW } from '../data/templates';

// Deterministic, fictional availability for the public booking calendar.

export interface Slot {
  date: string;
  start: string;
  end: string;
  available: boolean;
  period: 'morning' | 'afternoon';
}

const TIMES: Record<ServiceType, [string, number][]> = {
  plumbing: [['08:30', 90], ['10:30', 90], ['13:00', 90], ['16:00', 75]],
  gutter: [['08:30', 80], ['10:00', 80], ['13:00', 80], ['14:30', 80]],
  window: [['09:00', 60], ['11:00', 60], ['13:30', 60], ['15:00', 60]],
};

const toTime = (mins: number) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

export function bookingDays(weekOffset = 0): string[] {
  const days: string[] = [];
  let d = addDays(DEMO_DATE, weekOffset * 7);
  while (days.length < 6) {
    if (parseLocal(d).getDay() !== 0) days.push(d);
    d = addDays(d, 1);
  }
  return days;
}

export function slotsFor(service: ServiceType, date: string): Slot[] {
  const dow = parseLocal(date).getDay();
  const dayIndex = Math.round((parseLocal(date).getTime() - parseLocal(DEMO_DATE).getTime()) / 86400000);
  const svcIndex = service === 'plumbing' ? 1 : service === 'gutter' ? 2 : 3;
  return TIMES[service].map(([start, dur], i) => {
    let available = (dayIndex * 7 + i * 3 + svcIndex * 5) % 5 > 1;
    if (dayIndex === 0) available = service === 'plumbing' && start === '16:00'; // today: urgent plumbing only
    if (dow === 6) available = service === 'plumbing' && i < 2; // Saturday: plumbing mornings
    if (service === 'gutter' && dayIndex > 0 && dayIndex < 7) available = false; // autumn peak — fully booked this week
    if (service === 'gutter' && dayIndex === 7) available = start === '10:00' || start === '13:00';
    if (service === 'window' && dayIndex === 3) available = start !== '13:30'; // Monday round day
    return { date, start, end: toTime(minutes(start) + dur), available, period: minutes(start) < 12 * 60 ? 'morning' : 'afternoon' };
  });
}

export function firstAvailable(service: ServiceType): Slot | undefined {
  for (let w = 0; w < 3; w++) for (const d of bookingDays(w)) {
    const s = slotsFor(service, d).find((x) => x.available);
    if (s) return s;
  }
  return undefined;
}

export const crewFor = (service: ServiceType) => DEFAULT_CREW[service];
