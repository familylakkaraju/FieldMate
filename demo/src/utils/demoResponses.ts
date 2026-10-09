// Simulated AI Copilot. Every answer is worked out deterministically from the shared demo
// state: no network request, no AI service. The chat UI streams these answers to look live.
import type { DemoData, DemoState, Job, Lead, ServiceType } from '../types/domain';
import {
  ACTIVE_STATUSES,
  atRiskJobs,
  autumnGutterReminders,
  getCustomer,
  getInvoice,
  getJob,
  getLead,
  getMember,
  getQuote,
  invoiceTotal,
  isToday,
  jobActualMinutes,
  jobEstimatedMinutes,
  jobProgress,
  jobsForWorker,
  jobsToday,
  monthToDateRevenue,
  quoteTotal,
  recurringDue,
  tasksForJob,
  type RiskItem,
} from '../app/selectors';
import { addDays, DEMO_DATE, parseLocal } from '../data/demoClock';
import { MONTHLY_HISTORY } from '../data/history';
import { PAST_JOB_REASONS } from '../data/jobs';
import { PRIYA_LEAD_ID, SARAH_LEAD_ID } from '../data/leads';
import { DEFAULT_CREW, QUOTE_TEMPLATES, TASK_TEMPLATES } from '../data/templates';
import { MORRISON_JOB_ID, routeSuggestion } from './insights';
import { compactMoney, dayMonth, dayMonthYear, duration, money, relativeDay, shortDate } from './format';

// ---------------------------------------------------------------- answer model
/** Text may contain `**bold**` spans; the chat renders them as strong text. */
export type Block =
  | { type: 'p'; text: string }
  | { type: 'bullets'; items: string[] }
  | { type: 'table'; columns: string[]; rows: string[][] }
  | { type: 'callout'; tone: 'info' | 'warning' | 'success'; text: string };

export type ChipAction = 'apply-route' | 'create-quote-sarah' | 'convert-priya' | 'send-reminders';

export interface Chip {
  label: string;
  to?: string;
  action?: ChipAction;
}

export type AskKey = 'plan' | 'risk' | 'sarah' | 'shah' | 'recurring' | 'time' | 'profitable';
export type CopilotTopic = AskKey | 'next' | 'help';
export type CopilotAudience = 'owner' | 'worker';

export interface CopilotAnswer {
  steps: string[];
  blocks: Block[];
  chips: Chip[];
  topic?: CopilotTopic;
}

export interface PresetPrompt {
  key: AskKey | 'next';
  prompt: string;
  hint: string;
}

export const PRESET_PROMPTS: PresetPrompt[] = [
  { key: 'plan', prompt: 'Plan my day', hint: 'Jobs, team and travel for today' },
  { key: 'risk', prompt: 'Which jobs are at risk?', hint: 'Blocked work and overruns' },
  { key: 'sarah', prompt: 'Draft a quote for Sarah', hint: 'Urgent kitchen tap repair' },
  { key: 'shah', prompt: 'Summarise the Shah gutter job', hint: 'Status, time, quote and photos' },
  { key: 'recurring', prompt: 'Which recurring customers are due?', hint: 'Next 14 days and autumn reminders' },
  { key: 'time', prompt: 'Where did we lose time this week?', hint: 'Overruns and what caused them' },
  { key: 'profitable', prompt: 'Which service is most profitable?', hint: 'Revenue per labour hour' },
];

/** Prompts offered in the field worker app. */
export const WORKER_PROMPTS: PresetPrompt[] = [
  { key: 'next', prompt: 'What’s next on my day?', hint: 'Your next job and what to know' },
  { key: 'shah', prompt: 'Summarise the Shah gutter job', hint: 'Access, tasks and notes' },
  { key: 'plan', prompt: 'Plan my day', hint: 'Your jobs and timings today' },
];

/** `?ask=<key>` deep links → prompt text. */
export const ASK_KEYS: Record<string, string> = {
  plan: 'Plan my day',
  risk: 'Which jobs are at risk?',
  sarah: 'Draft a quote for Sarah',
  shah: 'Summarise the Shah gutter job',
  recurring: 'Which recurring customers are due?',
  time: 'Where did we lose time this week?',
  profitable: 'Which service is most profitable?',
  next: 'What’s next on my day?',
};

// ---------------------------------------------------------------- routing
export function topicFor(prompt: string): CopilotTopic {
  const q = prompt.toLowerCase().replace(/[’‘`]/g, "'");
  if (/lose time|lost time|losing time|where did we lose|overrun/.test(q)) return 'time';
  if (q.includes('profit')) return 'profitable';
  if (q.includes('sarah') || q.includes('draft a quote')) return 'sarah';
  if (q.includes('shah') || q.includes('gutter job') || q.includes('summar')) return 'shah';
  if (q.includes('risk')) return 'risk';
  if (q.includes('recurring') || /\bdue\b/.test(q)) return 'recurring';
  if (/what'?s next|next job|next on my day/.test(q)) return 'next';
  if (q.includes('plan') || q.includes('my day')) return 'plan';
  return 'help';
}

/**
 * Answer a prompt from the current demo state. `audience` defaults to the active persona;
 * worker answers only offer links that exist in the field app.
 */
export function respond(prompt: string, state: DemoState, opts: { audience?: CopilotAudience } = {}): CopilotAnswer {
  const audience: CopilotAudience = opts.audience ?? (state.persona.persona === 'worker' ? 'worker' : 'owner');
  const topic = topicFor(prompt);
  const d = state.data;
  let answer: CopilotAnswer;
  try {
    switch (topic) {
      case 'plan':
        answer = audience === 'worker' ? workerDay(state, false) : planMyDay(d);
        break;
      case 'next':
        answer = audience === 'worker' ? workerDay(state, true) : planMyDay(d);
        break;
      case 'risk':
        answer = atRiskAnswer(d);
        break;
      case 'sarah':
        answer = sarahQuote(d);
        break;
      case 'shah':
        answer = shahSummary(d, audience);
        break;
      case 'recurring':
        answer = recurringAnswer(d);
        break;
      case 'time':
        answer = timeLost(d);
        break;
      case 'profitable':
        answer = profitable(state);
        break;
      default:
        answer = help(audience);
    }
  } catch {
    answer = help(audience);
  }
  const out = { ...answer, topic };
  return audience === 'worker' ? { ...out, chips: workerChips(out.chips) } : out;
}

/** Reminders the "Send reminders" action would send: unbooked recurring visits + autumn gutter customers. */
export function pendingReminders(d: DemoData): number {
  const ids = new Set([...recurringDue(d, 14).filter((x) => !x.booked), ...autumnGutterReminders(d)].map((x) => x.customer.id));
  return ids.size;
}

// ---------------------------------------------------------------- helpers
const DONE_STATUSES = ['completed', 'invoiced', 'closed'];
const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const words = (n: number) => (Number.isInteger(n) && n >= 0 && n < NUMBER_WORDS.length ? NUMBER_WORDS[n] : String(n));
const count = (n: number, one: string, many = `${one}s`) => `${words(n)} ${n === 1 ? one : many}`;
const isAre = (n: number) => (n === 1 ? 'is' : 'are');
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const lowerFirst = (s: string) => (s && !/^[A-Z0-9]{2}/.test(s) ? s[0].toLowerCase() + s.slice(1) : s);
const hhmm = (iso?: string) => (iso ? iso.slice(11, 16) : '');
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const joinList = (xs: string[], conj = 'and') => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} ${conj} ${xs[xs.length - 1]}`);
const crewNames = (d: DemoData, ids: string[]) => joinList(ids.map((id) => getMember(d, id)?.firstName ?? '').filter(Boolean), '&');
const firstName = (name?: string) => name?.split(' ')[0] ?? 'the customer';
/** "Blocked — waiting for X — collection 11:15" → "waiting for X, collection 11:15" */
const tidy = (reason: string) => lowerFirst(reason.replace(/^blocked\s*[—:-]\s*/i, '').replace(/\s+—\s+/g, ', ').replace(/\.$/, ''));

const isOpenLead = (l?: Lead): l is Lead => !!l && l.status !== 'converted' && l.status !== 'lost';
const holdsToday = (d: DemoData) => d.leads.filter((l) => isOpenLead(l) && l.preferredSlot?.date === DEMO_DATE);
const leadJobNoun = (l: Lead) => (l.service === 'plumbing' ? (l.urgency === 'urgent' ? 'urgent plumbing call' : 'plumbing job') : l.service === 'gutter' ? 'gutter clean' : 'window clean');
const leadAddress = (l: Lead) => [l.address, [l.town, l.postcode].filter(Boolean).join(' ')].filter(Boolean).join(', ');

function jobShort(d: DemoData, j: Job): string {
  const c = getCustomer(d, j.customerId);
  if (c) return c.name.split(' ').slice(-1)[0];
  return j.title.replace(/\s+Window Round$/i, ' round');
}

function statusNote(j: Job): string {
  if (DONE_STATUSES.includes(j.status)) return ' (done)';
  if (j.status === 'blocked') return ' (blocked)';
  if (j.status === 'in-progress') return j.atRisk ? ' (in progress, running over)' : ' (in progress)';
  return '';
}

function shahJob(d: DemoData): Job | undefined {
  const lead = getLead(d, PRIYA_LEAD_ID);
  return getJob(d, lead?.jobId) ?? d.jobs.find((j) => j.leadId === PRIYA_LEAD_ID);
}

function riskLine(d: DemoData, r: RiskItem): string {
  const who = crewNames(d, r.job.assignedWorkerIds);
  const head = `**${r.job.title}**${who ? ` (${who})` : ''}`;
  return r.severity === 'high' ? `${head} is blocked — ${tidy(r.reason)}.` : `${head} — ${tidy(r.reason)}.`;
}

function workerChips(chips: Chip[]): Chip[] {
  const out: Chip[] = [];
  for (const c of chips) {
    if (!c.to) continue; // office actions stay in the office app
    const job = c.to.match(/^\/app\/jobs\/([^?]+)/);
    if (job && /^open/i.test(c.label)) out.push({ label: c.label, to: `/worker/jobs/${job[1]}` });
    else if (c.to.startsWith('/app/schedule')) out.push({ label: 'Open Today', to: '/worker/today' });
    else if (c.to.startsWith('/worker/')) out.push(c);
  }
  return out.filter((c, i) => out.findIndex((x) => x.to === c.to) === i);
}

// ---------------------------------------------------------------- Plan my day (office)
function planMyDay(d: DemoData): CopilotAnswer {
  const today = jobsToday(d);
  const holds = holdsToday(d);
  const crew = d.team.filter((m) => m.active && !m.invited && !m.isOffice);
  const done = today.filter((j) => DONE_STATUSES.includes(j.status)).length;
  const live = today.filter((j) => j.status === 'in-progress' || j.status === 'blocked').length;
  const suggestion = routeSuggestion(d);
  const risks = atRiskJobs(d).filter((r) => isToday(r.job.scheduledStart));
  const sarah = getLead(d, SARAH_LEAD_ID);
  const priya = getLead(d, PRIYA_LEAD_ID);
  const shah = shahJob(d);

  const steps = [
    `Checked today’s schedule · ${today.length} ${today.length === 1 ? 'job' : 'jobs'}`,
    `Checked team availability · ${crew.length} in the field`,
    'Looked at travel between CM2 jobs',
  ];
  if (holds.length) steps.push(`Checked bookings waiting to be confirmed · ${holds.length}`);

  const progress = [done ? `${words(done)} ${isAre(done)} done` : '', live ? `${words(live)} ${isAre(live)} under way` : ''].filter(Boolean);
  let intro = `You have ${count(today.length, 'job')} today.`;
  if (progress.length) intro += ` ${cap(joinList(progress))}.`;
  if (holds.length) intro += ` ${cap(count(holds.length, 'more booking'))} ${isAre(holds.length)} waiting to be confirmed.`;

  const team = crew.map((m) => {
    const items = [
      ...jobsForWorker(d, m.id).map((j) => ({ at: j.scheduledStart ?? '', text: `${hhmm(j.scheduledStart)} ${j.title}${statusNote(j)}` })),
      ...holds
        .filter((l) => l.preferredSlot?.workerIds?.includes(m.id))
        .map((l) => ({ at: `${l.preferredSlot!.date}T${l.preferredSlot!.start}`, text: `${l.preferredSlot!.start} ${l.customerName} — ${leadJobNoun(l)} (to confirm)` })),
    ].sort((a, b) => (a.at < b.at ? -1 : 1));
    return `**${m.firstName}** — ${items.length ? items.map((x) => x.text).join(', ') : 'nothing booked today'}`;
  });

  const attention = risks.map((r) => riskLine(d, r));
  if (isOpenLead(sarah)) {
    const who = crewNames(d, sarah.preferredSlot?.workerIds ?? ['w-daniel']) || 'Daniel';
    attention.push(
      `${who} has an urgent plumbing call at ${sarah.preferredSlot?.start ?? '14:30'} (Sarah Williams — leaking kitchen tap). ${sarah.quoteId ? 'The quote is ready — convert the lead to lock the slot in.' : 'Send a quote and convert the lead to lock the slot in.'}`,
    );
  }
  if (isOpenLead(priya)) {
    const who = crewNames(d, priya.preferredSlot?.workerIds ?? DEFAULT_CREW.gutter) || 'Maya & Owen';
    attention.push(`Priya Shah booked today’s ${priya.preferredSlot?.start ?? '10:30'} gutter slot online — convert the lead to confirm ${who}.`);
  }

  const blocks: Block[] = [
    { type: 'p', text: intro },
    { type: 'bullets', items: team },
  ];
  if (attention.length) blocks.push({ type: 'p', text: '**Needs your attention**' }, { type: 'bullets', items: attention });
  if (suggestion.applicable) blocks.push({ type: 'callout', tone: 'info', text: `**Suggestion:** ${suggestion.text}` });
  else if (suggestion.applied) blocks.push({ type: 'callout', tone: 'success', text: suggestion.text });

  const chips: Chip[] = [{ label: 'Open Schedule', to: '/app/schedule' }];
  if (suggestion.applicable) chips.push({ label: 'Apply suggestion', action: 'apply-route' });
  chips.push(shah ? { label: 'Open Shah job', to: `/app/jobs/${shah.id}` } : { label: 'Open Priya’s lead', to: `/app/leads/${PRIYA_LEAD_ID}` });
  return { steps, blocks, chips };
}

// ---------------------------------------------------------------- Plan my day / what's next (field worker)
interface DayItem {
  at: string;
  end?: string;
  title: string;
  job?: Job;
  lead?: Lead;
}

function workerDay(state: DemoState, focusNext: boolean): CopilotAnswer {
  const d = state.data;
  const persona = getMember(d, state.persona.workerId);
  const me = persona && !persona.isOffice ? persona : getMember(d, 'w-maya');
  if (!me) return planMyDay(d);

  const items: DayItem[] = [
    ...jobsForWorker(d, me.id).map((j) => ({ at: j.scheduledStart ?? '', end: j.scheduledEnd, title: j.title, job: j })),
    ...holdsToday(d)
      .filter((l) => l.preferredSlot?.workerIds?.includes(me.id))
      .map((l) => ({ at: `${l.preferredSlot!.date}T${l.preferredSlot!.start}`, end: `${l.preferredSlot!.date}T${l.preferredSlot!.end}`, title: `${l.customerName} — ${leadJobNoun(l)}`, lead: l })),
  ].sort((a, b) => (a.at < b.at ? -1 : 1));
  const jobCount = items.filter((x) => x.job).length;
  const holdCount = items.length - jobCount;
  const current = items.find((x) => x.job && (x.job.status === 'in-progress' || x.job.status === 'blocked'))?.job;
  const upcoming = items.filter((x) => x.lead || (x.job && (x.job.status === 'scheduled' || x.job.status === 'new')));
  const next = upcoming[0];
  const partners = (x: DayItem) => crewNames(d, (x.job?.assignedWorkerIds ?? x.lead?.preferredSlot?.workerIds ?? []).filter((id) => id !== me.id));
  const where = (x: DayItem) => (x.job ? x.job.address ?? x.job.area ?? '' : x.lead ? leadAddress(x.lead) : '');
  const line = (x: DayItem) => `${hhmm(x.at)}${x.end ? `–${hhmm(x.end)}` : ''} **${x.title}**${x.job ? statusNote(x.job) : ' (office confirming)'}`;

  const steps = [`Checked your jobs today · ${items.length}`, 'Checked job notes and access', 'Checked travel between your jobs'];
  const blocks: Block[] = [];
  const warn: Block | undefined =
    current && (current.atRisk || current.status === 'blocked')
      ? { type: 'callout', tone: 'warning', text: `You’re still on **${current.title}** — ${tidy(current.blockedReason ?? current.atRisk ?? 'blocked')}. The office can see this on the schedule.` }
      : undefined;

  if (focusNext) {
    if (next) {
      const p = partners(next);
      const addr = where(next);
      blocks.push({ type: 'p', text: `Your next job is **${next.title}** at ${hhmm(next.at)}${p ? ` with ${p}` : ''}${addr ? ` — ${addr}` : ''}.` });
      if (warn) blocks.push(warn);
      const notes: string[] = [];
      if (next.job) {
        if (next.job.instructions) notes.push(`**Brief:** ${next.job.instructions}`);
        const prog = jobProgress(d, next.job);
        notes.push(`**Tasks:** ${count(prog.total, 'task')}, about ${duration(jobEstimatedMinutes(d, next.job))} on site`);
        const c = getCustomer(d, next.job.customerId);
        if (c) notes.push(`**Customer:** ${c.name} · ${c.phone}`);
      } else if (next.lead) {
        notes.push(`**Brief:** ${next.lead.summary}`);
        next.lead.details.filter((x) => ['Downpipes', 'Extras', 'Access'].includes(x.label)).forEach((x) => notes.push(`**${x.label}:** ${x.value}`));
      }
      if (notes.length) blocks.push({ type: 'bullets', items: notes });
      if (next.lead) blocks.push({ type: 'callout', tone: 'info', text: 'The office is still confirming this booking — it will appear in your jobs as soon as it’s converted.' });
      const later = upcoming.slice(1);
      if (later.length) blocks.push({ type: 'p', text: `**Later today:** ${later.map((x) => `${hhmm(x.at)} ${x.title}`).join(', ')}.` });
    } else {
      if (warn) blocks.push(warn);
      blocks.push({ type: 'callout', tone: 'success', text: 'You’ve no more jobs booked after this one today — nice work.' });
    }
  } else {
    blocks.push({ type: 'p', text: `You have ${count(jobCount, 'job')} today${holdCount ? `, plus ${count(holdCount, 'booking')} the office is confirming` : ''}.` });
    if (items.length) blocks.push({ type: 'bullets', items: items.map(line) });
    if (warn) blocks.push(warn);
  }

  const sug = routeSuggestion(d);
  if (getJob(d, MORRISON_JOB_ID)?.assignedWorkerIds.includes(me.id)) {
    if (sug.applicable) blocks.push({ type: 'callout', tone: 'info', text: 'The office may move the Morrison window clean to 12:15, straight after the Shah job — it would save about 25 minutes of driving.' });
    else if (sug.applied) blocks.push({ type: 'callout', tone: 'success', text: 'The Morrison window clean has moved to 12:15, straight after the Shah job — less driving this afternoon.' });
  }

  const chips: Chip[] = [];
  if (focusNext && next?.job) chips.push({ label: 'Open next job', to: `/app/jobs/${next.job.id}` });
  else if (current) chips.push({ label: 'Open current job', to: `/app/jobs/${current.id}` });
  else if (next?.job) chips.push({ label: 'Open next job', to: `/app/jobs/${next.job.id}` });
  chips.push({ label: 'Open Schedule', to: '/app/schedule' });
  return { steps, blocks, chips };
}

// ---------------------------------------------------------------- At risk
function nextStepFor(d: DemoData, r: RiskItem): string {
  const text = `${r.reason} ${r.job.blockedReason ?? ''} ${r.job.atRisk ?? ''}`.toLowerCase();
  const customer = firstName(getCustomer(d, r.job.customerId)?.name);
  if (r.job.status === 'blocked') {
    if (/fitting|part|merchant/.test(text)) return `confirm the merchant collection and message ${customer} with a new finish time.`;
    return 'clear the blocker or reschedule the remaining tasks.';
  }
  if (/delay|over/.test(text)) {
    const knock = /shah/.test(text);
    if (knock) {
      const shah = shahJob(d);
      const spare = (shah?.assignedWorkerIds ?? DEFAULT_CREW.gutter).find((id) => !r.job.assignedWorkerIds.includes(id));
      const name = getMember(d, spare)?.firstName;
      return `${name ? `send ${name} ahead to start the Shah job on time` : 'warn the next customer'} and give Priya a heads-up if the crew is late.`;
    }
    return 'warn the next customer and add time to the remaining tasks.';
  }
  if (/unassigned/.test(text)) return 'assign someone from the schedule.';
  return 'check in with the crew and update the customer.';
}

function atRiskAnswer(d: DemoData): CopilotAnswer {
  const active = d.jobs.filter((j) => ACTIVE_STATUSES.includes(j.status));
  const risks = atRiskJobs(d);
  const steps = [`Checked ${active.length} active jobs`, 'Looked for blocked tasks and overruns', 'Checked today’s timings and crews'];
  if (!risks.length) {
    return {
      steps,
      blocks: [{ type: 'callout', tone: 'success', text: 'Nothing is at risk right now — every active job is on track.' }],
      chips: [{ label: 'Open Schedule', to: '/app/schedule' }],
    };
  }
  const high = risks.filter((r) => r.severity === 'high').length;
  const blocks: Block[] = [
    { type: 'p', text: `${cap(count(risks.length, 'job'))} ${risks.length === 1 ? 'needs' : 'need'} attention${high ? ` — ${words(high)} ${isAre(high)} blocked` : ''}.` },
    {
      type: 'bullets',
      items: risks.map((r) => {
        const who = crewNames(d, r.job.assignedWorkerIds);
        const when = r.job.scheduledStart ? `, ${relativeDay(r.job.scheduledStart).toLowerCase() === 'today' ? 'today' : relativeDay(r.job.scheduledStart)} ${hhmm(r.job.scheduledStart)}` : '';
        return `**${r.job.title}** (${r.job.ref}${who ? ` · ${who}` : ''}${when}) — ${tidy(r.reason)}. **Next step:** ${nextStepFor(d, r)}`;
      }),
    },
  ];
  if (risks.some((r) => isToday(r.job.scheduledStart))) {
    blocks.push({ type: 'callout', tone: 'info', text: 'Customers affected today can be messaged from each job’s Messages tab, so they hear it from you first.' });
  }
  const chips: Chip[] = risks.slice(0, 3).map((r) => ({ label: `Open ${jobShort(d, r.job)} job`, to: `/app/jobs/${r.job.id}` }));
  chips.push({ label: 'Open Schedule', to: '/app/schedule' });
  return { steps, blocks, chips };
}

// ---------------------------------------------------------------- Draft a quote for Sarah
function sarahQuote(d: DemoData): CopilotAnswer {
  const lead = getLead(d, SARAH_LEAD_ID);
  const lines = QUOTE_TEMPLATES['sarah-tap'] ?? [];
  const total = sum(lines.map((l) => l.quantity * l.unitPrice));
  const existing = getQuote(d, lead?.quoteId);
  const steps = ['Read Sarah Williams’ enquiry', 'Matched similar tap repairs this year', 'Priced it from your plumbing rates'];
  const where = lead ? leadAddress(lead) : '';

  const blocks: Block[] = [
    { type: 'p', text: `Here’s a draft quote for **Sarah Williams** — leaking kitchen mixer tap${where ? ` at ${where}` : ''}.` },
    {
      type: 'table',
      columns: ['Item', 'Qty', 'Price'],
      rows: [...lines.map((l) => [l.description, String(l.quantity), money(l.quantity * l.unitPrice)]), ['**Total**', '', `**${money(total)}**`]],
    },
    {
      type: 'p',
      text: '**Why this price:** same-day call-out, a new tap cartridge, replacing the stiff isolation valve and urgent priority. Based on similar tap repairs this year (~50 min on site).',
    },
  ];
  if (existing) {
    blocks.push({ type: 'callout', tone: 'success', text: `Quote ${existing.ref} already exists for Sarah (${money(quoteTotal(existing))}, ${QUOTE_STATUS[existing.status] ?? existing.status}) — open it to review or send.` });
  } else if (isOpenLead(lead) && lead.preferredSlot) {
    const who = crewNames(d, lead.preferredSlot.workerIds ?? ['w-daniel']) || 'Daniel';
    blocks.push({ type: 'callout', tone: 'info', text: `${who} is holding ${lead.preferredSlot.start}–${lead.preferredSlot.end} today. Create the quote, send it, then convert the lead to lock the slot in.` });
  }
  const chips: Chip[] = [
    { label: existing ? 'Open Quote' : 'Create Quote', action: 'create-quote-sarah' },
    { label: 'Open Sarah’s lead', to: `/app/leads/${SARAH_LEAD_ID}` },
  ];
  return { steps, blocks, chips };
}

// ---------------------------------------------------------------- Summarise the Shah gutter job
const JOB_STATUS: Record<string, string> = { new: 'New', quoted: 'Quoted', scheduled: 'Scheduled', 'in-progress': 'In progress', blocked: 'Blocked', completed: 'Completed', invoiced: 'Invoiced', closed: 'Closed' };
const QUOTE_STATUS: Record<string, string> = { draft: 'draft', sent: 'sent', viewed: 'viewed by customer', accepted: 'accepted', declined: 'declined', expired: 'expired' };
const INVOICE_STATUS: Record<string, string> = { draft: 'draft', sent: 'sent', due: 'due', overdue: 'overdue', paid: 'paid' };

function shahSummary(d: DemoData, audience: CopilotAudience): CopilotAnswer {
  const lead = getLead(d, PRIYA_LEAD_ID);
  const job = shahJob(d);

  if (!job) {
    if (!lead) return help(audience);
    const det = (label: string) => lead.details.find((x) => x.label === label)?.value;
    const slot = lead.preferredSlot;
    const crew = crewNames(d, slot?.workerIds ?? DEFAULT_CREW.gutter) || 'Maya & Owen';
    const taskCount = (lead.templateKey && TASK_TEMPLATES[lead.templateKey]?.length) || TASK_TEMPLATES.gutter.length;
    const extras = det('Extras');
    const bullets = [
      `**Property:** ${leadAddress(lead)}${lead.propertyType ? ` — ${lead.propertyType}` : ''}`,
      `**Work:** ${det('Gutters') ?? 'Front and rear'} gutters${extras ? `, plus the ${lowerFirst(extras)}` : ''}`,
      `**Watch for:** ${lowerFirst(det('Downpipes') ?? 'rear downpipe may be blocked')}`,
      `**Booked:** ${slot ? `${relativeDay(slot.date)} · ${slot.start}–${slot.end} with ${crew}` : 'no slot chosen yet'}`,
    ];
    if (lead.estimateRange) bullets.push(`**Estimate:** ${money(lead.estimateRange[0])}–${money(lead.estimateRange[1])} instant estimate from the website`);
    const access = det('Access');
    if (access) bullets.push(`**Access:** ${access}`);
    return {
      steps: [`Found Priya Shah’s request · ${lead.ref}`, 'Checked the booked slot and crew', 'Checked the instant estimate'],
      blocks: [
        { type: 'p', text: `The Shah gutter job isn’t a job yet — **Priya Shah’s** website request (${lead.ref}) is waiting to be converted.` },
        { type: 'bullets', items: bullets },
        {
          type: 'callout',
          tone: 'info',
          text:
            audience === 'worker'
              ? `The office still needs to confirm this booking — it’s held for you at ${slot?.start ?? '10:30'}.`
              : `Convert the lead to create Priya’s customer record, the job with ${count(taskCount, 'task')} and the quote in one step.`,
        },
      ],
      chips: [
        { label: 'Convert lead', action: 'convert-priya' },
        { label: 'Open lead', to: `/app/leads/${PRIYA_LEAD_ID}` },
      ],
    };
  }

  const prog = jobProgress(d, job);
  const est = jobEstimatedMinutes(d, job);
  const act = jobActualMinutes(d, job);
  const quote = getQuote(d, job.quoteId);
  const inv = getInvoice(d, job.invoiceId);
  const customer = getCustomer(d, job.customerId);
  const photos = d.evidence.filter((e) => e.jobId === job.id);
  const before = photos.filter((p) => p.type === 'before').length;
  const after = photos.filter((p) => p.type === 'after').length;
  const crew = crewNames(d, job.assignedWorkerIds);
  const issues = job.issues.map((i) => {
    const t = prog.tasks.find((x) => x.id === i.taskId);
    const over = t && t.actualMinutes !== undefined ? t.actualMinutes - t.estimatedMinutes : 0;
    return `${i.title}${over > 0 ? ` — +${over} min` : ''}${i.resolved ? ', resolved on site' : ' (still open)'}`;
  });

  const phrase =
    job.status === 'scheduled'
      ? `scheduled for ${relativeDay(job.scheduledStart).toLowerCase() === 'today' ? 'today' : relativeDay(job.scheduledStart)}, ${hhmm(job.scheduledStart)}–${hhmm(job.scheduledEnd)}${crew ? ` with ${crew}` : ''}`
      : job.status === 'in-progress'
        ? `in progress — ${prog.done} of ${prog.total} tasks done`
        : job.status === 'blocked'
          ? 'blocked'
          : job.status === 'completed'
            ? 'complete'
            : job.status === 'invoiced'
              ? 'complete and invoiced'
              : job.status === 'closed'
                ? 'complete and closed'
                : (JOB_STATUS[job.status] ?? job.status).toLowerCase();

  const bullets = [
    `**Status:** ${JOB_STATUS[job.status] ?? job.status}${job.scheduledStart ? ` · ${relativeDay(job.scheduledStart)} ${hhmm(job.scheduledStart)}–${hhmm(job.scheduledEnd)}` : ''}`,
    `**Team:** ${crew || 'Not assigned yet'}`,
    `**Tasks:** ${prog.done} of ${prog.total} done`,
    `**Quote:** ${quote ? `${quote.ref} · ${money(quoteTotal(quote))} · ${QUOTE_STATUS[quote.status] ?? quote.status}` : 'none yet'}`,
    `**Time:** ${act ? `${duration(act)} logged vs ${duration(est)} estimated` : `${duration(est)} estimated, nothing logged yet`}`,
    `**Issues:** ${issues.length ? issues.join('; ') : 'none reported'}`,
    `**Photos:** ${photos.length ? `${photos.length} ${photos.length === 1 ? 'photo' : 'photos'} (${before} before, ${after} after)` : 'none yet'}`,
    `**Invoice:** ${inv ? `${inv.ref} · ${money(invoiceTotal(inv))} · ${INVOICE_STATUS[inv.status] ?? inv.status}` : 'not invoiced yet'}`,
  ];

  let next: Block;
  if (inv?.status === 'paid') {
    next = { type: 'callout', tone: 'success', text: 'Paid in full — nothing left to do on this job.' };
  } else if (inv) {
    next = {
      type: 'callout',
      tone: 'info',
      text: inv.status === 'draft' ? `**Next step:** send invoice ${inv.ref} to ${firstName(customer?.name)}.` : `**Next step:** ${inv.ref} is with ${firstName(customer?.name)} — send a reminder if it isn’t paid${inv.dueDate ? ` by ${dayMonth(inv.dueDate)}` : ''}.`,
    };
  } else if (job.status === 'completed') {
    next = { type: 'callout', tone: 'info', text: `**Next step:** create the invoice — it pre-fills from ${quote ? `${quote.ref} (${money(quoteTotal(quote))})` : 'the quoted amount'}.` };
  } else if (job.status === 'blocked') {
    next = { type: 'callout', tone: 'warning', text: `**Next step:** clear the blocker — ${tidy(job.blockedReason ?? job.atRisk ?? 'see the job for details')}.` };
  } else if (job.status === 'in-progress') {
    const left = prog.tasks.filter((t) => t.status !== 'completed');
    next = {
      type: 'callout',
      tone: 'info',
      text: left.length ? `**Next step:** ${count(left.length, 'task')} left — next up is “${left[0].title}”. Mark the job complete after the handover.` : '**Next step:** all tasks are done — mark the job complete and send the invoice.',
    };
  } else {
    const knock = atRiskJobs(d).find((r) => r.job.id !== job.id && /shah/i.test(r.reason));
    const spare = knock ? job.assignedWorkerIds.find((id) => !knock.job.assignedWorkerIds.includes(id)) : undefined;
    const spareName = getMember(d, spare)?.firstName;
    next = {
      type: 'callout',
      tone: knock ? 'warning' : 'info',
      text: `**Next step:** ${crew || 'the crew'} start at ${hhmm(job.scheduledStart) || 'the booked time'}.${knock ? ` ${knock.job.title} is running over${spareName ? `, so consider sending ${spareName} ahead to start the inspection` : ''}.` : ''}`,
    };
  }

  const chips: Chip[] = [{ label: 'Open Job', to: `/app/jobs/${job.id}` }];
  if (customer) chips.push({ label: 'View Customer', to: `/app/customers/${customer.id}` });
  if (job.status === 'completed' && !job.invoiceId) chips.push({ label: 'Create Invoice', to: `/app/jobs/${job.id}?tab=invoice` });

  return {
    steps: [`Opened ${job.ref} · ${customer?.name ?? 'Priya Shah'}`, `Checked ${count(prog.total, 'task')} and time logged`, 'Checked the quote, photos and invoice'],
    blocks: [{ type: 'p', text: `**${job.ref} · ${job.title}** is ${phrase}.` }, { type: 'bullets', items: bullets }, next],
    chips,
  };
}

// ---------------------------------------------------------------- Recurring customers due
function recurringAnswer(d: DemoData): CopilotAnswer {
  const due = recurringDue(d, 14);
  const autumn = autumnGutterReminders(d);
  const plans = d.customers.filter((c) => c.recurring?.length).length;
  const booked = due.filter((x) => x.booked).length;
  const toSend = pendingReminders(d);

  const blocks: Block[] = [
    {
      type: 'p',
      text: due.length
        ? `${cap(count(due.length, 'recurring visit'))} ${isAre(due.length)} due in the next 14 days — ${words(booked)} already booked, ${words(due.length - booked)} still to book.`
        : 'No recurring visits fall due in the next 14 days.',
    },
  ];
  if (due.length) {
    blocks.push({ type: 'table', columns: ['Customer', 'Plan', 'Due', 'Booked?'], rows: due.map((x) => [x.customer.name, x.label, relativeDay(x.due), x.booked ? 'Yes' : 'Not yet']) });
  }
  if (autumn.length) {
    blocks.push(
      { type: 'p', text: `**Autumn gutter reminders** — ${count(autumn.length, 'customer')} had a gutter clean last autumn but ${autumn.length === 1 ? 'hasn’t' : 'haven’t'} booked this season:` },
      {
        type: 'bullets',
        items: autumn.map((a) => {
          const last = a.label.match(/\d{4}-\d{2}-\d{2}/)?.[0];
          return `**${a.customer.name}** (${a.customer.town}) — last cleaned ${last ? dayMonthYear(last) : 'last autumn'}, ${money(a.price)}`;
        }),
      },
    );
  }
  if (toSend) blocks.push({ type: 'callout', tone: 'info', text: `Sending reminders texts each of the ${words(toSend)} customers a link to book their next visit.` });

  const chips: Chip[] = [{ label: 'View Customers', to: '/app/customers' }];
  if (toSend) chips.push({ label: `Send ${toSend} reminder${toSend === 1 ? '' : 's'}`, action: 'send-reminders' });
  chips.push({ label: 'Open Schedule', to: '/app/schedule' });
  return {
    steps: [`Checked recurring plans · ${plans} customers`, 'Matched them against the schedule (next 14 days)', 'Checked last autumn’s gutter customers'],
    blocks,
    chips,
  };
}

// ---------------------------------------------------------------- Where did we lose time?
type Cause = 'downpipe' | 'moss' | 'parts' | 'seized' | 'other';
const CAUSE_LABEL: Record<Cause, string> = {
  downpipe: 'Blocked downpipes',
  moss: 'Moss build-up',
  parts: 'Parts not on the van',
  seized: 'Seized valves & stopcocks',
  other: 'Small overruns, no issue logged',
};

function causeOf(j: Job): Cause {
  const num = Number(j.ref.replace(/\D/g, ''));
  const note = PAST_JOB_REASONS[num];
  const text = [note?.reason, note?.issue, ...j.issues.flatMap((i) => [i.title, i.detail]), j.blockedReason].filter(Boolean).join(' ').toLowerCase();
  if (/downpipe/.test(text)) return 'downpipe';
  if (/moss/.test(text)) return 'moss';
  if (/merchant|not carried|on the van|on van|fitting|siphon/.test(text)) return 'parts';
  if (/seized/.test(text)) return 'seized';
  return 'other';
}

function mondayOf(dateKey: string): string {
  const dow = (parseLocal(dateKey).getDay() + 6) % 7;
  return addDays(dateKey, -dow);
}

function timeLost(d: DemoData): CopilotAnswer {
  const start = mondayOf(DEMO_DATE);
  const range = `${parseLocal(start).toLocaleDateString('en-GB', { weekday: 'short' })} ${parseLocal(start).getDate()}–${shortDate(DEMO_DATE)}`;
  const rows: { job: Job; over: number; cause: Cause; open: boolean }[] = [];

  for (const j of d.jobs) {
    const when = (j.completedAt ?? j.scheduledStart ?? '').slice(0, 10);
    if (!when || when < start || when > DEMO_DATE) continue;
    if (DONE_STATUSES.includes(j.status)) {
      const over = jobActualMinutes(d, j) - jobEstimatedMinutes(d, j);
      if (over >= 5) rows.push({ job: j, over, cause: causeOf(j), open: false });
    } else if ((j.status === 'in-progress' || j.status === 'blocked') && isToday(j.scheduledStart)) {
      const stated = j.atRisk?.match(/(\d+)\s*min over/i);
      const over = stated ? Number(stated[1]) : sum(tasksForJob(d, j.id).map((t) => (t.actualMinutes !== undefined ? Math.max(0, t.actualMinutes - t.estimatedMinutes) : 0)));
      if (over >= 5) rows.push({ job: j, over, cause: causeOf(j), open: true });
    }
  }

  const steps = [`Compared actual vs estimated time · ${range}`, 'Read issues logged by the team', 'Grouped overruns by cause'];
  if (!rows.length) {
    return { steps, blocks: [{ type: 'callout', tone: 'success', text: `No job ran more than a few minutes over estimate this week (${range}).` }], chips: [{ label: 'Open Reports', to: '/app/reports' }] };
  }

  const total = sum(rows.map((r) => r.over));
  const value = Math.round(((total / 60) * 45) / 5) * 5;
  const groups = (Object.keys(CAUSE_LABEL) as Cause[])
    .map((cause) => {
      const items = rows.filter((r) => r.cause === cause);
      return { cause, items, minutes: sum(items.map((r) => r.over)) };
    })
    .filter((g) => g.items.length)
    .sort((a, b) => (a.cause === 'other' ? 1 : b.cause === 'other' ? -1 : b.minutes - a.minutes));
  const find = (c: Cause) => groups.find((g) => g.cause === c);
  const top = groups[0];
  const dp = find('downpipe');
  const parts = find('parts');
  const moss = find('moss');
  const plumber = getMember(d, DEFAULT_CREW.plumbing[0])?.firstName ?? 'the plumber';

  const blocks: Block[] = [
    {
      type: 'p',
      text: `This week (${range}) ${count(rows.length, 'job')} ran over estimate — **${duration(total)}** in total, worth about **${money(value)}** at ~£45/hr.${top && top.cause !== 'other' ? ` ${CAUSE_LABEL[top.cause]} were the biggest drain.` : ''}`,
    },
    {
      type: 'table',
      columns: ['Cause', 'Jobs', 'Time lost'],
      rows: groups.map((g) => [CAUSE_LABEL[g.cause], g.items.map((r) => `${jobShort(d, r.job)}${r.open ? ' (today)' : ''}`).join(', '), duration(g.minutes)]),
    },
    { type: 'p', text: '**What I’d change**' },
    {
      type: 'bullets',
      items: [
        `Add a **£25 downpipe clearance** line to gutter quotes${dp ? ` — downpipes cost ${duration(dp.minutes)} across ${count(dp.items.length, 'job')}` : ''}.`,
        `Carry **40mm waste fittings** on ${plumber}’s van${parts ? ` — trips for parts cost ${duration(parts.minutes)}` : ' to avoid trips to the merchant'}.`,
        `Add a **15-min buffer** after autumn gutter jobs for moss and downpipes${moss ? ` (moss alone cost ${duration(moss.minutes)})` : ''}.`,
      ],
    },
  ];
  return { steps, blocks, chips: [{ label: 'Open Reports', to: '/app/reports' }] };
}

// ---------------------------------------------------------------- Most profitable service
const SERVICE_NOUN: Record<ServiceType, string> = { plumbing: 'plumbing', gutter: 'gutters', window: 'windows' };

function profitable(state: DemoState): CopilotAnswer {
  const d = state.data;
  const months = MONTHLY_HISTORY;
  const ids: ServiceType[] = ['plumbing', 'gutter', 'window'];
  const stats = ids
    .map((id) => {
      const revenue = sum(months.map((m) => m[id]));
      const hours = sum(months.map((m) => m.labourHours[id]));
      const jobs = sum(months.map((m) => m.jobs[id]));
      const rates = (DEFAULT_CREW[id] ?? []).map((w) => getMember(d, w)?.hourlyCost ?? 20);
      const rate = rates.length ? sum(rates) / rates.length : 20;
      const peak = months.reduce((a, m) => (m[id] > a[id] ? m : a));
      const low = months.reduce((a, m) => (m[id] < a[id] ? m : a));
      return {
        id,
        name: state.config.services.find((s) => s.id === id)?.name ?? SERVICE_NOUN[id],
        noun: SERVICE_NOUN[id],
        revenue,
        hours,
        perHour: hours ? revenue / hours : 0,
        avgJob: jobs ? revenue / jobs : 0,
        margin: hours ? (revenue - hours * rate) / hours : 0,
        peak,
        low,
      };
    })
    .sort((a, b) => b.perHour - a.perHour);
  const top = stats[0];
  const others = stats.slice(1);
  const by = (id: ServiceType) => stats.find((s) => s.id === id)!;
  const gutter = by('gutter');
  const plumbing = by('plumbing');
  const windows = by('window');
  const bestAvg = [...stats].sort((a, b) => b.avgJob - a.avgJob)[0];
  const byMargin = [...stats].sort((a, b) => b.margin - a.margin);
  const recurring = sum(months.map((m) => m.recurring));
  const period = `${months[0].label} ${months[0].month.slice(0, 4)}–${months[months.length - 1].label} ${months[months.length - 1].month.slice(0, 4)}`;
  const mtd = monthToDateRevenue(d);
  const mtdTop = ids.map((id) => ({ id, v: mtd.byService[id] })).sort((a, b) => b.v - a.v)[0];

  const blocks: Block[] = [
    {
      type: 'p',
      text: `**${cap(top.noun)}** earn${top.noun === 'plumbing' ? 's' : ''} the most per labour hour — **£${Math.round(top.perHour)}/hr** over the last ${months.length} months (${period}), against ${others.map((o) => `£${Math.round(o.perHour)} for ${o.noun}`).join(' and ')}.`,
    },
    {
      type: 'table',
      columns: ['Service', 'Revenue', 'Labour hrs', '£ / labour hr', 'Avg job'],
      rows: stats.map((s) => [s.name, compactMoney(s.revenue), `${s.hours.toLocaleString('en-GB')} h`, `£${Math.round(s.perHour)}`, money(Math.round(s.avgJob))]),
    },
    { type: 'p', text: '**What it means**' },
    {
      type: 'bullets',
      items: [
        `**Gutters** earn the most per hour but are seasonal — from ${compactMoney(gutter.low.gutter)} in ${gutter.low.label} to ${compactMoney(gutter.peak.gutter)} in ${gutter.peak.label}. Fill the autumn diary first with reminders and downpipe add-ons.`,
        `**Plumbing** is the steady earner — ${compactMoney(plumbing.low.plumbing)}–${compactMoney(plumbing.peak.plumbing)} every month${bestAvg.id === 'plumbing' ? `, with the highest average job value (${money(Math.round(plumbing.avgJob))})` : ''}.`,
        `**Windows** give you the recurring base — ${compactMoney(recurring)} of recurring revenue over the period keeps the team busy between gutter seasons (${compactMoney(windows.revenue)} from windows overall).`,
        `After labour costs, ${byMargin[0].noun} still lead at about £${Math.round(byMargin[0].margin)} an hour, then ${byMargin
          .slice(1)
          .map((s) => `${s.noun} (£${Math.round(s.margin)})`)
          .join(' and ')}.`,
      ],
    },
  ];
  if (mtd.total > 0 && mtdTop) {
    blocks.push({ type: 'callout', tone: 'info', text: `October to date: ${money(mtd.total)} from ${count(mtd.jobs, 'completed job')}, with ${SERVICE_NOUN[mtdTop.id]} leading (${money(mtdTop.v)}).` });
  }
  return {
    steps: [`Read ${months.length} months of revenue by service`, 'Matched it with labour hours logged', 'Worked out earnings per labour hour'],
    blocks,
    chips: [{ label: 'Open Reports', to: '/app/reports' }],
  };
}

// ---------------------------------------------------------------- Fallback
function help(audience: CopilotAudience): CopilotAnswer {
  const list = audience === 'worker' ? WORKER_PROMPTS : PRESET_PROMPTS;
  return {
    steps: ['Read your question', 'Checked what I can answer from the demo data'],
    blocks: [
      { type: 'p', text: 'I’m not sure about that one yet. In this demo I can help with your jobs, team, customers and money — for example:' },
      { type: 'bullets', items: list.map((p) => `**${p.prompt}** — ${lowerFirst(p.hint)}`) },
      { type: 'callout', tone: 'info', text: 'This Copilot is simulated for the demo, so it answers a set list of questions. Pick one below to see it in action.' },
    ],
    chips: [],
  };
}
