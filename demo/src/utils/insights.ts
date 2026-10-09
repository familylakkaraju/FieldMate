import type { DemoData } from '../types/domain';
import { getJob, getLead } from '../app/selectors';
import { PRIYA_LEAD_ID, SARAH_LEAD_ID } from '../data/leads';

export const MORRISON_JOB_ID = 'job-1044';
export const MORRISON_NEW = { start: '2026-10-09T12:15', end: '2026-10-09T13:15' };

/** The schedule optimisation the AI insight proposes (and can apply). */
export function routeSuggestion(d: DemoData) {
  const job = getJob(d, MORRISON_JOB_ID);
  const applied = job?.scheduledStart === MORRISON_NEW.start;
  const applicable = !!job && job.status === 'scheduled' && job.scheduledStart === '2026-10-09T15:00';
  return {
    applied,
    applicable,
    text: applied
      ? 'Done — the Morrison window clean now follows the Shah gutter job at 12:15. Maya’s afternoon is clear and travel drops by about 25 minutes.'
      : 'Maya and Owen have three exterior-cleaning jobs within the CM2 area today. Moving the Morrison window clean after the Shah gutter job would reduce travel by about 25 minutes.',
  };
}

export interface Insight {
  id: string;
  text: string;
  link?: { label: string; to: string };
}

export function secondaryInsights(d: DemoData): Insight[] {
  const out: Insight[] = [];
  const priya = getLead(d, PRIYA_LEAD_ID);
  if (priya && priya.status !== 'converted') out.push({ id: 'priya', text: 'Priya Shah booked today’s 10:30 gutter slot online — convert the lead to confirm Maya & Owen.', link: { label: 'Open lead', to: `/app/leads/${PRIYA_LEAD_ID}` } });
  const sarah = getLead(d, SARAH_LEAD_ID);
  if (sarah && sarah.status !== 'converted') out.push({ id: 'sarah', text: 'Sarah Williams’ urgent leak is holding Daniel’s 14:30 slot — send a quote and convert to lock it in.', link: { label: 'Open lead', to: `/app/leads/${SARAH_LEAD_ID}` } });
  const overdue = d.invoices.find((i) => i.status === 'overdue');
  if (overdue) out.push({ id: 'overdue', text: `${overdue.ref} is 7 days overdue — a polite reminder usually gets it paid within 48 hours.`, link: { label: 'View invoices', to: '/app/invoices' } });
  return out;
}
