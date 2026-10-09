import type {
  BrandingSettings,
  BusinessConfig,
  CompanySettings,
  Customer,
  DemoState,
  EvidenceItem,
  Invoice,
  Issue,
  Job,
  JobStatus,
  Lead,
  LeadStatus,
  Material,
  Message,
  Note,
  NotificationItem,
  PersonaState,
  PreferredSlot,
  PublicSession,
  Quote,
  ServiceConfig,
  ServiceType,
  Task,
  TaskStatus,
  TeamMember,
  TimelineEntry,
} from '../types/domain';
import { DEFAULT_CREW, QUOTE_TEMPLATES, QUOTE_TERMS, TASK_TEMPLATES } from '../data/templates';
import { addDays } from '../data/demoClock';

// ---------------------------------------------------------------------------
// Actions. Action creators (see actions.ts) supply ids and timestamps so the
// reducer itself is pure and deterministic — which keeps it easy to test.
// ---------------------------------------------------------------------------

export interface ConvertIds {
  customerId: string;
  jobId: string;
  jobRef: string;
  quoteId: string;
  quoteRef: string;
}

export type DemoAction =
  | { type: 'RESET'; state: DemoState }
  | { type: 'HYDRATE'; state: DemoState }
  | { type: 'PERSONA_SET'; patch: Partial<PersonaState> }
  | { type: 'SESSION_SET'; patch: Partial<PublicSession> }
  | { type: 'LEAD_CREATE'; lead: Lead }
  | { type: 'LEAD_BOOK_SLOT'; leadId: string; slot: PreferredSlot; at: string }
  | { type: 'LEAD_STATUS'; leadId: string; status: LeadStatus; at: string; by: string; reason?: string }
  | { type: 'LEAD_SCHEDULE_VISIT'; leadId: string; slot: PreferredSlot; at: string; by: string }
  | { type: 'LEAD_CONVERT'; leadId: string; at: string; by: string; ids: ConvertIds }
  | { type: 'QUOTE_CREATE'; quote: Quote; at: string; by: string }
  | { type: 'QUOTE_UPDATE'; quoteId: string; patch: Partial<Pick<Quote, 'lineItems' | 'discount' | 'vat' | 'notes' | 'terms' | 'title' | 'validUntil'>> }
  | { type: 'QUOTE_SEND'; quoteId: string; at: string; by: string }
  | { type: 'QUOTE_VIEW'; quoteId: string; at: string }
  | { type: 'QUOTE_ACCEPT'; quoteId: string; at: string; by: string }
  | { type: 'QUOTE_DECLINE'; quoteId: string; at: string; reason: string }
  | { type: 'JOB_CREATE'; job: Job; tasks: Task[] }
  | { type: 'JOB_STATUS'; jobId: string; status: JobStatus; at: string; by: string; reason?: string }
  | { type: 'JOB_ON_THE_WAY'; jobId: string; at: string; by: string }
  | { type: 'JOB_SCHEDULE'; jobId: string; start: string; end: string; workerIds: string[]; at: string; by: string; note?: string }
  | { type: 'TASK_STATUS'; taskId: string; status: TaskStatus; at: string; by: string }
  | { type: 'TASK_ADD_TIME'; taskId: string; minutes: number; at: string; by: string; note?: string }
  | { type: 'JOB_ADD_MATERIAL'; jobId: string; material: Material }
  | { type: 'JOB_ADD_ISSUE'; jobId: string; issue: Issue }
  | { type: 'JOB_RESOLVE_ISSUE'; jobId: string; issueId: string; at: string; by: string }
  | { type: 'EVIDENCE_ADD'; items: EvidenceItem[]; at: string; by: string }
  | {
      type: 'VOICE_APPLY';
      jobId: string;
      at: string;
      by: string;
      transcript: string;
      completeTaskIds: string[];
      timeTaskId?: string;
      extraMinutes: number;
      issue?: Issue;
      material?: Material;
      evidence: EvidenceItem[];
    }
  | { type: 'MESSAGE_SEND'; jobId: string; message: Message }
  | { type: 'CUSTOMER_NOTE'; customerId: string; note: Note }
  | { type: 'CUSTOMER_CREATE'; customer: Customer }
  | { type: 'INVOICE_CREATE'; invoice: Invoice; at: string; by: string }
  | { type: 'INVOICE_SEND'; invoiceId: string; at: string; by: string }
  | { type: 'INVOICE_REMIND'; invoiceId: string; at: string; by: string }
  | { type: 'INVOICE_PAY'; invoiceId: string; at: string; method: string; by: string }
  | { type: 'NOTIFY'; notification: NotificationItem }
  | { type: 'NOTIFICATIONS_READ'; ids?: string[] }
  | { type: 'CONFIG_COMPANY'; patch: Partial<CompanySettings> }
  | { type: 'CONFIG_BRANDING'; patch: Partial<BrandingSettings> }
  | { type: 'CONFIG_SERVICE'; serviceId: ServiceType; patch: Partial<ServiceConfig> }
  | { type: 'CONFIG_SERVICE_MOVE'; serviceId: ServiceType; dir: -1 | 1 }
  | { type: 'CONFIG_REPLACE'; config: BusinessConfig }
  | { type: 'TEAM_UPDATE'; memberId: string; patch: Partial<TeamMember> }
  | { type: 'TEAM_INVITE'; member: TeamMember };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let seq = 0;
const eid = (p: string) => `${p}-${Date.now().toString(36)}-${(++seq).toString(36)}`;

const entry = (at: string, kind: TimelineEntry['kind'], text: string, by?: string): TimelineEntry => ({ id: eid('tl'), at, kind, text, by });

type S = DemoState;

const mapJob = (s: S, jobId: string, fn: (j: Job) => Job): S => ({
  ...s,
  data: { ...s.data, jobs: s.data.jobs.map((j) => (j.id === jobId ? fn(j) : j)) },
});

const mapTask = (s: S, taskId: string, fn: (t: Task) => Task): S => ({
  ...s,
  data: { ...s.data, tasks: s.data.tasks.map((t) => (t.id === taskId ? fn(t) : t)) },
});

const mapLead = (s: S, leadId: string, fn: (l: Lead) => Lead): S => ({
  ...s,
  data: { ...s.data, leads: s.data.leads.map((l) => (l.id === leadId ? fn(l) : l)) },
});

const mapQuote = (s: S, quoteId: string, fn: (q: Quote) => Quote): S => ({
  ...s,
  data: { ...s.data, quotes: s.data.quotes.map((q) => (q.id === quoteId ? fn(q) : q)) },
});

const mapInvoice = (s: S, invoiceId: string, fn: (i: Invoice) => Invoice): S => ({
  ...s,
  data: { ...s.data, invoices: s.data.invoices.map((i) => (i.id === invoiceId ? fn(i) : i)) },
});

const pushTimeline = (j: Job, e: TimelineEntry): Job => ({ ...j, timeline: [...j.timeline, e] });

const notify = (s: S, n: Omit<NotificationItem, 'id' | 'read'>): S => ({
  ...s,
  data: { ...s.data, notifications: [{ ...n, id: eid('nt'), read: false }, ...s.data.notifications] },
});

const customerName = (s: S, id?: string) => s.data.customers.find((c) => c.id === id)?.name ?? 'Customer';
const memberName = (s: S, id?: string) => s.data.team.find((m) => m.id === id)?.firstName ?? (id === 'customer' ? 'Customer' : 'Office');

const quoteTotal = (q: Quote) => {
  const sub = q.lineItems.reduce((a, l) => a + l.quantity * l.unitPrice, 0);
  const net = Math.max(0, sub - q.discount);
  return q.vat ? net * 1.2 : net;
};

const SERVICE_JOB_TITLE: Record<string, string> = {
  'shah-gutter': 'Gutter Clean',
  'sarah-tap': 'Kitchen Tap Repair',
  gutter: 'Gutter Clean',
  plumbing: 'Plumbing Repair',
  window: 'Window Clean',
  'window-recurring': 'Window Clean — First Visit',
};

const surname = (name: string) => name.trim().split(/\s+/).slice(-1)[0] ?? name;

/** Start a job if it hasn't started yet (used by task/voice actions). */
function ensureStarted(s: S, jobId: string, at: string, by: string): S {
  const job = s.data.jobs.find((j) => j.id === jobId);
  if (!job || !['new', 'quoted', 'scheduled'].includes(job.status)) return s;
  return reducer(s, { type: 'JOB_STATUS', jobId, status: 'in-progress', at, by });
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

export function reducer(s: S, a: DemoAction): S {
  switch (a.type) {
    case 'RESET':
    case 'HYDRATE':
      return a.state;

    case 'PERSONA_SET':
      return { ...s, persona: { ...s.persona, ...a.patch } };

    case 'SESSION_SET':
      return { ...s, data: { ...s.data, session: { ...s.data.session, ...a.patch } } };

    // ------------------------------------------------------------- Leads
    case 'LEAD_CREATE': {
      const next = { ...s, data: { ...s.data, leads: [a.lead, ...s.data.leads] } };
      const svc = s.config.services.find((x) => x.id === a.lead.service)?.name ?? 'Service';
      return notify(next, {
        kind: 'lead',
        title: `New ${svc.toLowerCase()} ${a.lead.source === 'website' ? 'quote request' : 'enquiry'}`,
        body: `${a.lead.customerName}${a.lead.postcode ? `, ${a.lead.postcode}` : ''} — ${a.lead.summary}`,
        at: a.lead.createdAt,
        link: `/app/leads/${a.lead.id}`,
      });
    }

    case 'LEAD_BOOK_SLOT':
      return mapLead(s, a.leadId, (l) => ({
        ...l,
        preferredSlot: a.slot,
        history: [...l.history, entry(a.at, 'schedule', `Chose slot: ${a.slot.label}`, 'customer')],
      }));

    case 'LEAD_STATUS':
      return mapLead(s, a.leadId, (l) => ({
        ...l,
        status: a.status,
        lostReason: a.status === 'lost' ? a.reason : l.lostReason,
        history: [
          ...l.history,
          entry(a.at, a.status === 'contacted' ? 'contact' : 'status', a.status === 'lost' ? `Marked lost${a.reason ? ` — ${a.reason}` : ''}` : a.status === 'contacted' ? `Customer contacted${a.reason ? ` — ${a.reason}` : ''}` : `Status changed to ${a.status}`, a.by),
        ],
      }));

    case 'LEAD_SCHEDULE_VISIT':
      return mapLead(s, a.leadId, (l) => ({
        ...l,
        status: l.status === 'new' ? 'contacted' : l.status,
        preferredSlot: a.slot,
        history: [...l.history, entry(a.at, 'schedule', `Visit scheduled: ${a.slot.label}${a.slot.workerIds?.length ? ` with ${a.slot.workerIds.map((w) => memberName(s, w)).join(' & ')}` : ''}`, a.by)],
      }));

    case 'LEAD_CONVERT': {
      const lead = s.data.leads.find((l) => l.id === a.leadId);
      if (!lead || lead.status === 'converted') return s;
      const ids = a.ids;
      const day = a.at.slice(0, 10);

      // Customer — reuse an existing record when the email matches.
      const existing = lead.email ? s.data.customers.find((c) => c.email.toLowerCase() === lead.email!.toLowerCase()) : undefined;
      const customer: Customer =
        existing ?? {
          id: ids.customerId,
          name: lead.customerName,
          email: lead.email ?? '',
          phone: lead.phone ?? '',
          address: lead.address ?? '',
          town: lead.town ?? '',
          postcode: lead.postcode ?? '',
          propertyType: lead.propertyType ?? 'Residential',
          tags: ['New customer'],
          customerSince: day,
          source: lead.source,
          history: [],
          notes: [],
          preferredContact: lead.preferredContact,
        };

      const key = lead.templateKey && TASK_TEMPLATES[lead.templateKey] ? lead.templateKey : lead.service;
      const slot = lead.preferredSlot;
      const crew = slot?.workerIds?.length ? slot.workerIds : DEFAULT_CREW[lead.service];
      const scheduled = !!slot;

      const tasks: Task[] = (TASK_TEMPLATES[key] ?? TASK_TEMPLATES[lead.service]).map((t, i) => ({
        id: `t-${ids.jobId.replace('job-', '')}-${i + 1}`,
        jobId: ids.jobId,
        title: t.title,
        outcome: t.outcome,
        status: scheduled ? 'scheduled' : 'ready',
        order: i + 1,
        estimatedMinutes: t.minutes,
        assignedWorkerId: crew[t.worker ?? 0] ?? crew[0],
        priority: 'normal',
        checklist: t.checklist?.map((label) => ({ label, done: false })),
        dependsOn: i > 0 ? `t-${ids.jobId.replace('job-', '')}-${i}` : undefined,
        timeline: [],
      }));

      // Quote — link an existing one or create one from the estimate / template.
      let quotes = s.data.quotes;
      let quoteId = lead.quoteId;
      if (quoteId) {
        quotes = quotes.map((q) => (q.id === quoteId ? { ...q, customerId: customer.id, jobId: ids.jobId } : q));
      } else {
        const lines = (lead.templateKey && QUOTE_TEMPLATES[lead.templateKey]) || lead.estimateLines || QUOTE_TEMPLATES[lead.service];
        quoteId = ids.quoteId;
        quotes = [
          {
            id: ids.quoteId,
            ref: ids.quoteRef,
            customerId: customer.id,
            leadId: lead.id,
            jobId: ids.jobId,
            service: lead.service,
            title: `${SERVICE_JOB_TITLE[key] ?? 'Service'} — ${lead.address ?? lead.customerName}`,
            status: 'sent',
            lineItems: lines.map((l, i) => ({ ...l, id: `${ids.quoteId}-l${i + 1}` })),
            discount: 0,
            vat: false,
            notes: lead.summary,
            terms: QUOTE_TERMS,
            createdAt: a.at,
            validUntil: addDays(day, 30),
            sentAt: a.at,
          },
          ...quotes,
        ];
      }
      const quote = quotes.find((q) => q.id === quoteId)!;
      const estimated = tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0);

      const job: Job = {
        id: ids.jobId,
        ref: ids.jobRef,
        customerId: customer.id,
        leadId: lead.id,
        title: `${surname(lead.customerName)} ${SERVICE_JOB_TITLE[key] ?? 'Job'}`,
        service: lead.service,
        status: scheduled ? 'scheduled' : quote.status === 'accepted' ? 'new' : 'quoted',
        kind: 'standard',
        area: lead.town,
        address: [lead.address, lead.town, lead.postcode].filter(Boolean).join(', '),
        scheduledStart: slot ? `${slot.date}T${slot.start}` : undefined,
        scheduledEnd: slot ? `${slot.date}T${slot.end}` : undefined,
        assignedWorkerIds: scheduled ? crew : [],
        quotedAmount: quoteTotal(quote),
        quoteId,
        taskIds: tasks.map((t) => t.id),
        instructions: `${lead.summary}${lead.details.find((d) => d.label === 'Access') ? ` ${lead.details.find((d) => d.label === 'Access')!.value}.` : ''}`,
        materials: [],
        issues: [],
        messages: [],
        timeline: [
          entry(lead.createdAt, 'created', `Request received via ${lead.source}`, 'customer'),
          entry(a.at, 'created', `Converted from lead ${lead.ref} — customer + job created`, a.by),
          ...(lead.quoteId ? [] : [entry(a.at, 'quote', `Quote ${quote.ref} sent to customer (${quote.lineItems.length} items)`, a.by)]),
          ...(scheduled ? [entry(a.at, 'schedule', `Scheduled ${slot!.label} — ${crew.map((w) => memberName(s, w)).join(' & ')}`, a.by)] : []),
        ],
        createdAt: a.at,
        estimatedMinutes: estimated,
        travelMinutes: 12,
      };

      return {
        ...s,
        data: {
          ...s.data,
          customers: existing ? s.data.customers : [customer, ...s.data.customers],
          jobs: [job, ...s.data.jobs],
          tasks: [...s.data.tasks, ...tasks],
          quotes,
          leads: s.data.leads.map((l) =>
            l.id === lead.id
              ? {
                  ...l,
                  status: 'converted',
                  customerId: customer.id,
                  jobId: job.id,
                  quoteId,
                  history: [...l.history, entry(a.at, 'status', `Converted to customer + job ${job.ref}`, a.by)],
                }
              : l,
          ),
        },
      };
    }

    // ------------------------------------------------------------- Quotes
    case 'QUOTE_CREATE': {
      let next: S = { ...s, data: { ...s.data, quotes: [a.quote, ...s.data.quotes] } };
      if (a.quote.leadId) next = mapLead(next, a.quote.leadId, (l) => ({ ...l, quoteId: a.quote.id, history: [...l.history, entry(a.at, 'quote', `Draft quote ${a.quote.ref} created`, a.by)] }));
      if (a.quote.jobId) next = mapJob(next, a.quote.jobId, (j) => pushTimeline({ ...j, quoteId: a.quote.id }, entry(a.at, 'quote', `Draft quote ${a.quote.ref} created`, a.by)));
      return next;
    }

    case 'QUOTE_UPDATE':
      return mapQuote(s, a.quoteId, (q) => ({ ...q, ...a.patch }));

    case 'QUOTE_SEND': {
      const q = s.data.quotes.find((x) => x.id === a.quoteId);
      if (!q) return s;
      let next = mapQuote(s, a.quoteId, (x) => ({ ...x, status: 'sent', sentAt: a.at }));
      if (q.leadId) next = mapLead(next, q.leadId, (l) => ({ ...l, status: l.status === 'converted' ? l.status : 'quoted', history: [...l.history, entry(a.at, 'quote', `Quote ${q.ref} sent (£${quoteTotal(q).toFixed(0)})`, a.by)] }));
      if (q.jobId) next = mapJob(next, q.jobId, (j) => pushTimeline({ ...j, quotedAmount: quoteTotal(q), status: j.status === 'new' ? 'quoted' : j.status }, entry(a.at, 'quote', `Quote ${q.ref} sent to customer`, a.by)));
      return next;
    }

    case 'QUOTE_VIEW': {
      const q = s.data.quotes.find((x) => x.id === a.quoteId);
      if (!q || q.status !== 'sent') return s;
      const next = mapQuote(s, a.quoteId, (x) => ({ ...x, status: 'viewed', viewedAt: a.at }));
      return notify(next, { kind: 'quote', title: 'Quote viewed', body: `${q.customerId ? customerName(s, q.customerId) : 'Customer'} opened ${q.ref}`, at: a.at, link: `/app/quotes/${q.id}` });
    }

    case 'QUOTE_ACCEPT': {
      const q = s.data.quotes.find((x) => x.id === a.quoteId);
      if (!q || q.status === 'accepted') return s;
      let next = mapQuote(s, a.quoteId, (x) => ({ ...x, status: 'accepted', acceptedAt: a.at }));
      if (q.jobId)
        next = mapJob(next, q.jobId, (j) =>
          pushTimeline({ ...j, quotedAmount: quoteTotal(q), status: j.status === 'quoted' ? (j.scheduledStart ? 'scheduled' : 'new') : j.status }, entry(a.at, 'quote', `Quote ${q.ref} accepted${a.by === 'customer' ? ' online by customer' : ''}`, a.by)),
        );
      if (q.leadId) next = mapLead(next, q.leadId, (l) => ({ ...l, history: [...l.history, entry(a.at, 'quote', `Quote ${q.ref} accepted`, a.by)] }));
      const who = q.customerId ? customerName(s, q.customerId) : s.data.leads.find((l) => l.id === q.leadId)?.customerName ?? 'Customer';
      return notify(next, { kind: 'quote', title: 'Quote accepted', body: `${who} accepted ${q.ref} (£${quoteTotal(q).toFixed(0)})`, at: a.at, link: `/app/quotes/${q.id}` });
    }

    case 'QUOTE_DECLINE': {
      const q = s.data.quotes.find((x) => x.id === a.quoteId);
      if (!q) return s;
      let next = mapQuote(s, a.quoteId, (x) => ({ ...x, status: 'declined', declinedAt: a.at, declineReason: a.reason }));
      if (q.jobId) next = mapJob(next, q.jobId, (j) => pushTimeline(j, entry(a.at, 'quote', `Quote ${q.ref} declined — ${a.reason}`, 'customer')));
      return notify(next, { kind: 'quote', title: 'Quote declined', body: `${q.ref} — ${a.reason}`, at: a.at, link: `/app/quotes/${q.id}` });
    }

    // ------------------------------------------------------------- Jobs & tasks
    case 'JOB_CREATE':
      return { ...s, data: { ...s.data, jobs: [a.job, ...s.data.jobs], tasks: [...s.data.tasks, ...a.tasks] } };

    case 'JOB_STATUS': {
      const job = s.data.jobs.find((j) => j.id === a.jobId);
      if (!job) return s;
      let next = s;
      const who = memberName(s, a.by);
      if (a.status === 'in-progress') {
        const resuming = job.status === 'blocked';
        next = mapJob(next, job.id, (j) =>
          pushTimeline(
            { ...j, status: 'in-progress', startedAt: j.startedAt ?? a.at, blockedReason: undefined, atRisk: resuming ? undefined : j.atRisk },
            entry(a.at, 'status', resuming ? `Job resumed by ${who}` : `Job started by ${who}`, a.by),
          ),
        );
        next = {
          ...next,
          data: {
            ...next.data,
            tasks: next.data.tasks.map((t) => (t.jobId === job.id && t.status === 'scheduled' ? { ...t, status: 'ready' } : resuming && t.jobId === job.id && t.status === 'blocked' ? { ...t, status: 'in-progress' } : t)),
          },
        };
        // A customer who hasn't approved online signs on the day.
        const q = job.quoteId ? next.data.quotes.find((x) => x.id === job.quoteId) : undefined;
        if (!resuming && q && ['draft', 'sent', 'viewed'].includes(q.status)) {
          next = mapQuote(next, q.id, (x) => ({ ...x, status: 'accepted', acceptedAt: a.at }));
          next = mapJob(next, job.id, (j) => pushTimeline(j, entry(a.at, 'quote', `Quote ${q.ref} accepted on site`, a.by)));
        }
        if (resuming) next = mapJob(next, job.id, (j) => ({ ...j, issues: j.issues.map((i) => ({ ...i, resolved: true })) }));
        return next;
      }
      if (a.status === 'blocked') {
        next = mapJob(next, job.id, (j) =>
          pushTimeline(
            {
              ...j,
              status: 'blocked',
              blockedReason: a.reason,
              atRisk: `Blocked — ${a.reason ?? 'needs attention'}`,
              issues: [...j.issues, { id: eid('iss'), title: a.reason ?? 'Job blocked', severity: 'medium', at: a.at, resolved: false, by: a.by }],
            },
            entry(a.at, 'issue', `Job blocked: ${a.reason ?? 'needs attention'}`, a.by),
          ),
        );
        next = { ...next, data: { ...next.data, tasks: next.data.tasks.map((t) => (t.jobId === job.id && t.status === 'in-progress' ? { ...t, status: 'blocked' } : t)) } };
        return notify(next, { kind: 'job', title: 'Job blocked', body: `${job.title} — ${a.reason ?? 'needs attention'}`, at: a.at, link: `/app/jobs/${job.id}` });
      }
      if (a.status === 'completed') {
        const open = next.data.tasks.filter((t) => t.jobId === job.id && t.status !== 'completed');
        next = {
          ...next,
          data: {
            ...next.data,
            tasks: next.data.tasks.map((t) =>
              t.jobId === job.id && t.status !== 'completed'
                ? { ...t, status: 'completed', actualMinutes: t.actualMinutes ?? t.estimatedMinutes, timeline: [...t.timeline, entry(a.at, 'task', 'Completed when job was completed', a.by)] }
                : t,
            ),
          },
        };
        next = mapJob(next, job.id, (j) =>
          pushTimeline(
            { ...j, status: 'completed', completedAt: a.at, startedAt: j.startedAt ?? a.at, atRisk: undefined, blockedReason: undefined },
            entry(a.at, 'status', `Job completed by ${who}${open.length ? ` (${open.length} remaining task${open.length === 1 ? '' : 's'} closed)` : ''}`, a.by),
          ),
        );
        return notify(next, { kind: 'job', title: 'Job completed', body: `${job.title} completed by ${who}`, at: a.at, link: `/app/jobs/${job.id}` });
      }
      return mapJob(next, job.id, (j) => pushTimeline({ ...j, status: a.status }, entry(a.at, 'status', `Status changed to ${a.status}`, a.by)));
    }

    case 'JOB_ON_THE_WAY': {
      const job = s.data.jobs.find((j) => j.id === a.jobId);
      if (!job) return s;
      return mapJob(s, a.jobId, (j) => pushTimeline({ ...j, onTheWayAt: a.at }, entry(a.at, 'contact', `${memberName(s, a.by)} is on the way — customer notified by SMS (demo)`, a.by)));
    }

    case 'JOB_SCHEDULE': {
      const job = s.data.jobs.find((j) => j.id === a.jobId);
      if (!job) return s;
      const label = `${a.start.slice(11, 16)}–${a.end.slice(11, 16)}`;
      let next = mapJob(s, a.jobId, (j) =>
        pushTimeline(
          {
            ...j,
            scheduledStart: a.start,
            scheduledEnd: a.end,
            assignedWorkerIds: a.workerIds,
            status: j.status === 'new' ? 'scheduled' : j.status,
          },
          entry(a.at, 'schedule', a.note ?? `Scheduled ${a.start.slice(0, 10) === a.at.slice(0, 10) ? 'today' : a.start.slice(0, 10)} ${label} — ${a.workerIds.map((w) => memberName(s, w)).join(' & ') || 'unassigned'}`, a.by),
        ),
      );
      next = {
        ...next,
        data: {
          ...next.data,
          tasks: next.data.tasks.map((t) => (t.jobId === a.jobId ? { ...t, status: t.status === 'ready' && job.status === 'new' ? 'scheduled' : t.status, assignedWorkerId: a.workerIds.includes(t.assignedWorkerId ?? '') ? t.assignedWorkerId : a.workerIds[0] } : t)),
        },
      };
      return next;
    }

    case 'TASK_STATUS': {
      const task = s.data.tasks.find((t) => t.id === a.taskId);
      if (!task) return s;
      let next = s;
      if (a.status === 'in-progress' || a.status === 'completed') next = ensureStarted(next, task.jobId, a.at, a.by);
      next = mapTask(next, a.taskId, (t) => ({
        ...t,
        status: a.status,
        actualMinutes: a.status === 'completed' ? t.actualMinutes ?? t.estimatedMinutes : t.actualMinutes,
        checklist: a.status === 'completed' ? t.checklist?.map((c) => ({ ...c, done: true })) : t.checklist,
        timeline: [...t.timeline, entry(a.at, 'task', `${a.status === 'completed' ? 'Completed' : a.status === 'in-progress' ? 'Started' : a.status === 'blocked' ? 'Blocked' : 'Set to ' + a.status} by ${memberName(s, a.by)}`, a.by)],
      }));
      const verb = a.status === 'completed' ? 'completed' : a.status === 'in-progress' ? 'started' : a.status === 'blocked' ? 'blocked' : `set to ${a.status}`;
      next = mapJob(next, task.jobId, (j) => pushTimeline(j, entry(a.at, 'task', `Task “${task.title}” ${verb}`, a.by)));
      if (a.status === 'blocked') {
        const job = next.data.jobs.find((j) => j.id === task.jobId)!;
        if (job.status === 'in-progress') next = mapJob(next, job.id, (j) => ({ ...j, status: 'blocked', blockedReason: `Task blocked: ${task.title}`, atRisk: `Blocked — ${task.title}` }));
      }
      return next;
    }

    case 'TASK_ADD_TIME': {
      const task = s.data.tasks.find((t) => t.id === a.taskId);
      if (!task) return s;
      let next = mapTask(s, a.taskId, (t) => ({
        ...t,
        actualMinutes: (t.actualMinutes ?? (t.status === 'completed' ? t.estimatedMinutes : 0)) + a.minutes,
        timeline: [...t.timeline, entry(a.at, 'time', `+${a.minutes} min${a.note ? ` — ${a.note}` : ''}`, a.by)],
      }));
      next = mapJob(next, task.jobId, (j) => pushTimeline(j, entry(a.at, 'time', `+${a.minutes} min on “${task.title}”${a.note ? ` — ${a.note}` : ''}`, a.by)));
      return next;
    }

    case 'JOB_ADD_MATERIAL':
      return mapJob(s, a.jobId, (j) => pushTimeline({ ...j, materials: [...j.materials, a.material] }, entry(a.material.at, 'material', `${a.material.description} — £${a.material.cost.toFixed(2)}`, a.material.by)));

    case 'JOB_ADD_ISSUE':
      return mapJob(s, a.jobId, (j) => pushTimeline({ ...j, issues: [...j.issues, a.issue] }, entry(a.issue.at, 'issue', `Issue recorded: ${a.issue.title}`, a.issue.by)));

    case 'JOB_RESOLVE_ISSUE':
      return mapJob(s, a.jobId, (j) =>
        pushTimeline({ ...j, issues: j.issues.map((i) => (i.id === a.issueId ? { ...i, resolved: true } : i)) }, entry(a.at, 'issue', `Issue resolved: ${j.issues.find((i) => i.id === a.issueId)?.title ?? ''}`, a.by)),
      );

    case 'EVIDENCE_ADD': {
      if (!a.items.length) return s;
      let next: S = { ...s, data: { ...s.data, evidence: [...a.items, ...s.data.evidence] } };
      const byJob = new Map<string, EvidenceItem[]>();
      a.items.forEach((e) => byJob.set(e.jobId, [...(byJob.get(e.jobId) ?? []), e]));
      byJob.forEach((items, jobId) => {
        const label = items.length === 1 ? `${items[0].type === 'before' ? 'Before' : items[0].type === 'after' ? 'After' : 'New'} photo added — ${items[0].caption ?? ''}` : `${items.length} photos added`;
        next = mapJob(next, jobId, (j) => pushTimeline(j, entry(a.at, 'evidence', label, a.by)));
      });
      return next;
    }

    case 'VOICE_APPLY': {
      let next = ensureStarted(s, a.jobId, a.at, a.by);
      const titles: string[] = [];
      next = {
        ...next,
        data: {
          ...next.data,
          tasks: next.data.tasks.map((t) => {
            if (t.jobId !== a.jobId) return t;
            let u = t;
            if (a.completeTaskIds.includes(t.id) && t.status !== 'completed') {
              titles.push(t.title);
              u = { ...u, status: 'completed', actualMinutes: u.actualMinutes ?? u.estimatedMinutes, checklist: u.checklist?.map((c) => ({ ...c, done: true })), timeline: [...u.timeline, entry(a.at, 'voice', 'Completed via voice update', a.by)] };
            }
            if (t.id === a.timeTaskId && a.extraMinutes) {
              u = { ...u, actualMinutes: (u.actualMinutes ?? u.estimatedMinutes) + a.extraMinutes, timeline: [...u.timeline, entry(a.at, 'time', `+${a.extraMinutes} min (voice update)`, a.by)] };
            }
            return u;
          }),
          evidence: [...a.evidence, ...next.data.evidence],
        },
      };
      next = mapJob(next, a.jobId, (j) => {
        const entries: TimelineEntry[] = [entry(a.at, 'voice', `Voice update: “${a.transcript}”`, a.by)];
        if (titles.length) entries.push(entry(a.at, 'task', `${titles.length} task${titles.length === 1 ? '' : 's'} completed: ${titles.join(', ')}`, a.by));
        if (a.extraMinutes) entries.push(entry(a.at, 'time', `+${a.extraMinutes} min recorded`, a.by));
        if (a.issue) entries.push(entry(a.at, 'issue', `Issue recorded: ${a.issue.title}`, a.by));
        if (a.material) entries.push(entry(a.at, 'material', `${a.material.description} — £${a.material.cost.toFixed(2)}`, a.by));
        if (a.evidence.length) entries.push(entry(a.at, 'evidence', `${a.evidence.length} photo${a.evidence.length === 1 ? '' : 's'} linked`, a.by));
        return {
          ...j,
          issues: a.issue ? [...j.issues, a.issue] : j.issues,
          materials: a.material ? [...j.materials, a.material] : j.materials,
          timeline: [...j.timeline, ...entries],
          atRisk: undefined,
        };
      });
      const job = next.data.jobs.find((j) => j.id === a.jobId);
      return notify(next, { kind: 'task', title: 'Voice update applied', body: `${job?.title ?? 'Job'} — ${titles.length} tasks, +${a.extraMinutes} min, ${a.evidence.length} photos`, at: a.at, link: `/app/jobs/${a.jobId}` });
    }

    case 'MESSAGE_SEND': {
      const next = mapJob(s, a.jobId, (j) => ({ ...j, messages: [...j.messages, a.message] }));
      if (a.message.from === 'customer') {
        const job = s.data.jobs.find((j) => j.id === a.jobId);
        return notify(next, { kind: 'message', title: `Message from ${a.message.author}`, body: `${job?.ref ?? ''}: ${a.message.text}`, at: a.message.at, link: `/app/jobs/${a.jobId}?tab=messages` });
      }
      return next;
    }

    case 'CUSTOMER_NOTE':
      return { ...s, data: { ...s.data, customers: s.data.customers.map((c) => (c.id === a.customerId ? { ...c, notes: [a.note, ...c.notes] } : c)) } };

    case 'CUSTOMER_CREATE':
      return { ...s, data: { ...s.data, customers: [a.customer, ...s.data.customers] } };

    // ------------------------------------------------------------- Invoices
    case 'INVOICE_CREATE': {
      const next: S = { ...s, data: { ...s.data, invoices: [a.invoice, ...s.data.invoices] } };
      return mapJob(next, a.invoice.jobId, (j) => pushTimeline({ ...j, invoiceId: a.invoice.id }, entry(a.at, 'invoice', `Draft invoice ${a.invoice.ref} created`, a.by)));
    }

    case 'INVOICE_SEND': {
      const inv = s.data.invoices.find((i) => i.id === a.invoiceId);
      if (!inv) return s;
      const next = mapInvoice(s, a.invoiceId, (i) => ({ ...i, status: 'sent', issuedAt: a.at, dueDate: addDays(a.at.slice(0, 10), 14) }));
      return mapJob(next, inv.jobId, (j) => pushTimeline({ ...j, status: ['completed', 'in-progress'].includes(j.status) ? 'invoiced' : j.status }, entry(a.at, 'invoice', `Invoice ${inv.ref} sent to customer`, a.by)));
    }

    case 'INVOICE_REMIND': {
      const inv = s.data.invoices.find((i) => i.id === a.invoiceId);
      if (!inv) return s;
      const next = mapInvoice(s, a.invoiceId, (i) => ({ ...i, remindersSent: i.remindersSent + 1 }));
      return mapJob(next, inv.jobId, (j) => pushTimeline(j, entry(a.at, 'invoice', `Payment reminder sent for ${inv.ref}`, a.by)));
    }

    case 'INVOICE_PAY': {
      const inv = s.data.invoices.find((i) => i.id === a.invoiceId);
      if (!inv || inv.status === 'paid') return s;
      let next = mapInvoice(s, a.invoiceId, (i) => ({ ...i, status: 'paid', paidAt: a.at, method: a.method }));
      next = mapJob(next, inv.jobId, (j) => pushTimeline({ ...j, status: 'closed' }, entry(a.at, 'payment', `Payment received — ${inv.ref} (${a.method})`, a.by)));
      const total = inv.lineItems.reduce((x, l) => x + l.quantity * l.unitPrice, 0) * (inv.vat ? 1.2 : 1);
      return notify(next, { kind: 'payment', title: 'Payment received', body: `${customerName(s, inv.customerId)} paid ${inv.ref} (£${total.toFixed(0)}) — ${a.method}`, at: a.at, link: '/app/invoices' });
    }

    // ------------------------------------------------------------- Notifications
    case 'NOTIFY':
      return { ...s, data: { ...s.data, notifications: [a.notification, ...s.data.notifications] } };

    case 'NOTIFICATIONS_READ':
      return { ...s, data: { ...s.data, notifications: s.data.notifications.map((n) => (!a.ids || a.ids.includes(n.id) ? { ...n, read: true } : n)) } };

    // ------------------------------------------------------------- White label
    case 'CONFIG_COMPANY':
      return { ...s, config: { ...s.config, company: { ...s.config.company, ...a.patch } } };

    case 'CONFIG_BRANDING':
      return { ...s, config: { ...s.config, branding: { ...s.config.branding, ...a.patch } } };

    case 'CONFIG_SERVICE':
      return { ...s, config: { ...s.config, services: s.config.services.map((x) => (x.id === a.serviceId ? { ...x, ...a.patch } : x)) } };

    case 'CONFIG_SERVICE_MOVE': {
      const list = [...s.config.services].sort((x, y) => x.sortOrder - y.sortOrder);
      const i = list.findIndex((x) => x.id === a.serviceId);
      const j = i + a.dir;
      if (i < 0 || j < 0 || j >= list.length) return s;
      [list[i], list[j]] = [list[j], list[i]];
      return { ...s, config: { ...s.config, services: list.map((x, k) => ({ ...x, sortOrder: k + 1 })) } };
    }

    case 'CONFIG_REPLACE':
      return { ...s, config: a.config };

    case 'TEAM_UPDATE':
      return { ...s, data: { ...s.data, team: s.data.team.map((m) => (m.id === a.memberId ? { ...m, ...a.patch } : m)) } };

    case 'TEAM_INVITE':
      return { ...s, data: { ...s.data, team: [...s.data.team, a.member] } };

    default:
      return s;
  }
}
