import type {
  BrandingSettings,
  CompanySettings,
  Customer,
  EvidenceItem,
  Invoice,
  Job,
  JobStatus,
  Lead,
  LeadStatus,
  PersonaState,
  PreferredSlot,
  PublicSession,
  Quote,
  QuoteLine,
  ServiceConfig,
  ServiceType,
  Task,
  TaskStatus,
  TeamMember,
} from '../types/domain';
import { BRAND_PRESETS, EXAMPLE_REBRAND } from '../data/brand';
import { addDays, DEMO_DATE, demoNow } from '../data/demoClock';
import { DEFAULT_CREW, QUOTE_TEMPLATES, QUOTE_TERMS, TASK_TEMPLATES } from '../data/templates';
import type { DemoStore } from './store';

let n = 0;
export const uid = (p: string) => `${p}-${Date.now().toString(36)}${(++n).toString(36)}`;

const num = (ref: string) => Number(ref.replace(/\D/g, '')) || 0;
const nextNumber = (refs: string[], floor: number) => Math.max(floor, ...refs.map(num)) + 1;

export interface NewLeadInput {
  customerName: string;
  email?: string;
  phone?: string;
  address?: string;
  town?: string;
  postcode?: string;
  service: ServiceType;
  summary: string;
  details: { label: string; value: string }[];
  source: Lead['source'];
  urgency: Lead['urgency'];
  estimateRange?: [number, number];
  estimatedValue?: number;
  estimateLines?: Omit<QuoteLine, 'id'>[];
  propertyType?: string;
  preferredContact?: Lead['preferredContact'];
  photo?: string;
}

export type DemoActions = ReturnType<typeof createActions>;

export function createActions(store: DemoStore) {
  const get = store.getState;
  const d = store.dispatch;
  const office = 'w-sophie';
  const now = demoNow;

  const quoteRef = () => `Q-${nextNumber(get().data.quotes.map((q) => q.ref), 2050)}`;
  const jobNumber = (hint?: number) => {
    const used = new Set(get().data.jobs.map((j) => num(j.ref)));
    if (hint && !used.has(hint)) return hint;
    return nextNumber(get().data.jobs.map((j) => j.ref), 1052);
  };

  const actions = {
    // ---------------------------------------------------------------- persona / session
    setPersona(patch: Partial<PersonaState>) {
      d({ type: 'PERSONA_SET', patch });
    },
    setSession(patch: Partial<PublicSession>) {
      d({ type: 'SESSION_SET', patch });
    },
    resetDemo() {
      store.reset();
    },

    // ---------------------------------------------------------------- leads
    createLead(input: NewLeadInput): string {
      const at = now();
      const id = uid('lead');
      const ref = `LD-${nextNumber(get().data.leads.map((l) => l.ref), 1024)}`;
      const lead: Lead = {
        id,
        ref,
        ...input,
        status: 'new',
        createdAt: at,
        history: [
          {
            id: uid('lh'),
            at,
            kind: 'created',
            text:
              input.source === 'website'
                ? `${input.service === 'plumbing' ? 'Plumbing request' : 'Quote request'} submitted on the website${input.estimateRange ? ` (instant estimate £${input.estimateRange[0]}–£${input.estimateRange[1]})` : ''}`
                : 'Enquiry received via contact form',
            by: 'customer',
          },
        ],
      };
      d({ type: 'LEAD_CREATE', lead });
      return id;
    },
    bookLeadSlot(leadId: string, slot: PreferredSlot) {
      d({ type: 'LEAD_BOOK_SLOT', leadId, slot, at: now() });
    },
    setLeadStatus(leadId: string, status: LeadStatus, reason?: string) {
      d({ type: 'LEAD_STATUS', leadId, status, at: now(), by: office, reason });
    },
    scheduleVisit(leadId: string, slot: PreferredSlot) {
      d({ type: 'LEAD_SCHEDULE_VISIT', leadId, slot, at: now(), by: office });
    },
    convertLeadToJob(leadId: string): string | undefined {
      const lead = get().data.leads.find((l) => l.id === leadId);
      if (!lead) return undefined;
      if (lead.status === 'converted') return lead.jobId;
      const jn = jobNumber(lead.jobNumberHint);
      const slug = lead.customerName.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');
      const existingIds = new Set(get().data.customers.map((c) => c.id));
      let customerId = `cus-${slug}`;
      if (existingIds.has(customerId)) customerId = uid('cus');
      const qn = nextNumber(get().data.quotes.map((q) => q.ref), 2050);
      d({
        type: 'LEAD_CONVERT',
        leadId,
        at: now(),
        by: office,
        ids: { customerId, jobId: `job-${jn}`, jobRef: `JOB-${jn}`, quoteId: `q-${qn}`, quoteRef: `Q-${qn}` },
      });
      return get().data.leads.find((l) => l.id === leadId)?.jobId;
    },

    // ---------------------------------------------------------------- quotes
    createQuote(input: { service: ServiceType; title: string; customerId?: string; leadId?: string; jobId?: string; lines: Omit<QuoteLine, 'id'>[]; notes?: string }): string {
      const at = now();
      const id = uid('q');
      const quote: Quote = {
        id,
        ref: quoteRef(),
        customerId: input.customerId,
        leadId: input.leadId,
        jobId: input.jobId,
        service: input.service,
        title: input.title,
        status: 'draft',
        lineItems: input.lines.map((l) => ({ ...l, id: uid('ql') })),
        discount: 0,
        vat: false,
        notes: input.notes ?? '',
        terms: QUOTE_TERMS,
        createdAt: at,
        validUntil: addDays(DEMO_DATE, 30),
      };
      d({ type: 'QUOTE_CREATE', quote, at, by: office });
      return id;
    },
    createQuoteForLead(leadId: string): string | undefined {
      const lead = get().data.leads.find((l) => l.id === leadId);
      if (!lead) return undefined;
      if (lead.quoteId) return lead.quoteId;
      const lines = (lead.templateKey && QUOTE_TEMPLATES[lead.templateKey]) || lead.estimateLines || QUOTE_TEMPLATES[lead.service];
      return actions.createQuote({
        service: lead.service,
        title: `${lead.service === 'plumbing' ? 'Plumbing repair' : lead.service === 'gutter' ? 'Gutter clean' : 'Window clean'} — ${lead.address ?? lead.customerName}`,
        leadId: lead.id,
        customerId: lead.customerId,
        jobId: lead.jobId,
        lines,
        notes: lead.summary,
      });
    },
    createQuoteForJob(jobId: string): string | undefined {
      const job = get().data.jobs.find((j) => j.id === jobId);
      if (!job) return undefined;
      if (job.quoteId) return job.quoteId;
      return actions.createQuote({ service: job.service, title: job.title, customerId: job.customerId, jobId: job.id, lines: QUOTE_TEMPLATES[job.service] });
    },
    updateQuote(quoteId: string, patch: Partial<Pick<Quote, 'lineItems' | 'discount' | 'vat' | 'notes' | 'terms' | 'title' | 'validUntil'>>) {
      d({ type: 'QUOTE_UPDATE', quoteId, patch });
    },
    sendQuote(quoteId: string) {
      d({ type: 'QUOTE_SEND', quoteId, at: now(), by: office });
    },
    viewQuote(quoteId: string) {
      d({ type: 'QUOTE_VIEW', quoteId, at: now() });
    },
    acceptQuote(quoteId: string, by: 'customer' | string = 'customer') {
      d({ type: 'QUOTE_ACCEPT', quoteId, at: now(), by });
    },
    declineQuote(quoteId: string, reason: string) {
      d({ type: 'QUOTE_DECLINE', quoteId, at: now(), reason });
    },
    duplicateQuote(quoteId: string): string | undefined {
      const q = get().data.quotes.find((x) => x.id === quoteId);
      if (!q) return undefined;
      return actions.createQuote({ service: q.service, title: `${q.title} (copy)`, customerId: q.customerId, leadId: undefined, jobId: undefined, lines: q.lineItems.map(({ id: _id, ...rest }) => rest), notes: q.notes });
    },

    // ---------------------------------------------------------------- jobs & tasks
    updateJobStatus(jobId: string, status: JobStatus, reason?: string, by: string = office) {
      d({ type: 'JOB_STATUS', jobId, status, at: now(), by, reason });
    },
    onTheWay(jobId: string, by: string) {
      d({ type: 'JOB_ON_THE_WAY', jobId, at: now(), by });
    },
    scheduleJob(jobId: string, start: string, end: string, workerIds: string[], note?: string) {
      d({ type: 'JOB_SCHEDULE', jobId, start, end, workerIds, at: now(), by: office, note });
    },
    updateTaskStatus(taskId: string, status: TaskStatus, by: string = office) {
      d({ type: 'TASK_STATUS', taskId, status, at: now(), by });
    },
    addTaskTime(taskId: string, minutes: number, note?: string, by: string = office) {
      d({ type: 'TASK_ADD_TIME', taskId, minutes, at: now(), by, note });
    },
    addMaterial(jobId: string, description: string, cost: number, taskId?: string, by: string = office) {
      d({ type: 'JOB_ADD_MATERIAL', jobId, material: { id: uid('m'), description, cost, at: now(), taskId, by } });
    },
    addIssue(jobId: string, title: string, detail?: string, severity: 'low' | 'medium' | 'high' = 'medium', taskId?: string, by: string = office) {
      d({ type: 'JOB_ADD_ISSUE', jobId, issue: { id: uid('iss'), title, detail, severity, at: now(), taskId, resolved: false, by } });
    },
    resolveIssue(jobId: string, issueId: string, by: string = office) {
      d({ type: 'JOB_RESOLVE_ISSUE', jobId, issueId, at: now(), by });
    },
    addEvidence(jobId: string, items: { type: EvidenceItem['type']; url: string; caption?: string; taskId?: string }[], by: string = office) {
      const job = get().data.jobs.find((j) => j.id === jobId);
      if (!job) return;
      const at = now();
      d({
        type: 'EVIDENCE_ADD',
        at,
        by,
        items: items.map((x) => ({ id: uid('ev'), jobId, customerId: job.customerId, service: job.service, at, by, ...x })),
      });
    },
    applyVoiceUpdate(
      jobId: string,
      p: { transcript: string; completeTaskIds: string[]; timeTaskId?: string; extraMinutes: number; issue?: { title: string; detail: string }; material?: { description: string; cost: number }; evidence: { type: EvidenceItem['type']; url: string; caption: string; taskId?: string }[] },
      by: string,
    ) {
      const job = get().data.jobs.find((j) => j.id === jobId);
      if (!job) return;
      const at = now();
      d({
        type: 'VOICE_APPLY',
        jobId,
        at,
        by,
        transcript: p.transcript,
        completeTaskIds: p.completeTaskIds,
        timeTaskId: p.timeTaskId,
        extraMinutes: p.extraMinutes,
        issue: p.issue ? { id: uid('iss'), title: p.issue.title, detail: p.issue.detail, severity: 'medium', at, taskId: p.timeTaskId, resolved: true, by } : undefined,
        material: p.material ? { id: uid('m'), description: p.material.description, cost: p.material.cost, at, by } : undefined,
        evidence: p.evidence.map((e) => ({ id: uid('ev'), jobId, customerId: job.customerId, service: job.service, at, by, ...e })),
      });
    },
    sendMessage(jobId: string, from: 'customer' | 'business', author: string, text: string) {
      d({ type: 'MESSAGE_SEND', jobId, message: { id: uid('msg'), at: now(), from, author, text } });
    },
    addCustomerNote(customerId: string, text: string) {
      d({ type: 'CUSTOMER_NOTE', customerId, note: { id: uid('note'), at: now(), by: office, text } });
    },
    createCustomer(input: Pick<Customer, 'name' | 'email' | 'phone' | 'address' | 'town' | 'postcode'> & { propertyType?: string }): string {
      const id = uid('cus');
      d({
        type: 'CUSTOMER_CREATE',
        customer: { id, propertyType: input.propertyType ?? 'Residential', tags: ['New customer'], customerSince: DEMO_DATE, source: 'phone', history: [], notes: [], ...input },
      });
      return id;
    },
    createJob(input: { customerId: string; service: ServiceType; title?: string; date?: string; start?: string; durationMinutes?: number; workerIds?: string[]; instructions?: string }): string {
      const s = get();
      const customer = s.data.customers.find((c) => c.id === input.customerId);
      const jn = jobNumber();
      const jobId = `job-${jn}`;
      const at = now();
      const crew = input.workerIds?.length ? input.workerIds : DEFAULT_CREW[input.service];
      const tpl = TASK_TEMPLATES[input.service];
      const scheduled = !!(input.date && input.start);
      const startIso = scheduled ? `${input.date}T${input.start}` : undefined;
      const dur = input.durationMinutes ?? tpl.reduce((a, t) => a + t.minutes, 0);
      let endIso: string | undefined;
      if (startIso) {
        const [h, m] = input.start!.split(':').map(Number);
        const end = h * 60 + m + dur;
        endIso = `${input.date}T${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`;
      }
      const tasks: Task[] = tpl.map((t, i) => ({
        id: `t-${jn}-${i + 1}`,
        jobId,
        title: t.title,
        outcome: t.outcome,
        status: scheduled ? 'scheduled' : 'ready',
        order: i + 1,
        estimatedMinutes: t.minutes,
        assignedWorkerId: crew[t.worker ?? 0] ?? crew[0],
        priority: 'normal',
        timeline: [],
      }));
      const svcName = s.config.services.find((x) => x.id === input.service)?.name ?? 'Job';
      const surname = customer?.name.split(' ').slice(-1)[0] ?? '';
      const job: Job = {
        id: jobId,
        ref: `JOB-${jn}`,
        customerId: input.customerId,
        title: input.title || `${surname} ${svcName}`.trim(),
        service: input.service,
        status: scheduled ? 'scheduled' : 'new',
        kind: 'standard',
        area: customer?.town,
        address: customer ? `${customer.address}, ${customer.town} ${customer.postcode}` : undefined,
        scheduledStart: startIso,
        scheduledEnd: endIso,
        assignedWorkerIds: scheduled ? crew : [],
        taskIds: tasks.map((t) => t.id),
        instructions: input.instructions,
        materials: [],
        issues: [],
        messages: [],
        timeline: [{ id: uid('tl'), at, kind: 'created', text: 'Job created by office', by: office }],
        createdAt: at,
        estimatedMinutes: dur,
      };
      d({ type: 'JOB_CREATE', job, tasks });
      return jobId;
    },

    // ---------------------------------------------------------------- invoices
    createInvoice(jobId: string): string | undefined {
      const s = get();
      const job = s.data.jobs.find((j) => j.id === jobId);
      if (!job || !job.customerId) return undefined;
      if (job.invoiceId) return job.invoiceId;
      const quote = job.quoteId ? s.data.quotes.find((q) => q.id === job.quoteId) : undefined;
      const lines: QuoteLine[] = quote
        ? quote.lineItems.map((l) => ({ ...l, id: uid('il') }))
        : [{ id: uid('il'), description: job.title, quantity: 1, unitPrice: job.quotedAmount ?? 0, kind: 'service' }];
      if (quote?.discount) lines.push({ id: uid('il'), description: 'Discount', quantity: 1, unitPrice: -quote.discount, kind: 'service' });
      const id = uid('inv');
      const at = now();
      const invoice: Invoice = {
        id,
        ref: `INV-${nextNumber(s.data.invoices.map((i) => i.ref), 3026)}`,
        customerId: job.customerId,
        jobId,
        status: 'draft',
        lineItems: lines,
        vat: quote?.vat ?? false,
        issuedAt: at,
        remindersSent: 0,
      };
      d({ type: 'INVOICE_CREATE', invoice, at, by: office });
      return id;
    },
    sendInvoice(invoiceId: string) {
      d({ type: 'INVOICE_SEND', invoiceId, at: now(), by: office });
    },
    sendReminder(invoiceId: string) {
      d({ type: 'INVOICE_REMIND', invoiceId, at: now(), by: office });
    },
    markInvoicePaid(invoiceId: string, method = 'Card (online)', by: string = office) {
      d({ type: 'INVOICE_PAY', invoiceId, at: now(), method, by });
    },

    // ---------------------------------------------------------------- notifications
    markNotificationsRead(ids?: string[]) {
      d({ type: 'NOTIFICATIONS_READ', ids });
    },

    // ---------------------------------------------------------------- white label
    updateCompany(patch: Partial<CompanySettings>) {
      d({ type: 'CONFIG_COMPANY', patch });
    },
    updateBranding(patch: Partial<BrandingSettings>) {
      d({ type: 'CONFIG_BRANDING', patch: { ...patch, presetId: patch.presetId ?? (('primaryColor' in patch || 'secondaryColor' in patch || 'accentColor' in patch) ? 'custom' : get().config.branding.presetId) } });
    },
    applyPreset(presetId: string) {
      const p = BRAND_PRESETS.find((x) => x.id === presetId);
      if (p) d({ type: 'CONFIG_BRANDING', patch: { ...p.branding, logoDataUrl: undefined } });
    },
    applyExampleRebrand() {
      const p = BRAND_PRESETS.find((x) => x.id === EXAMPLE_REBRAND.presetId)!;
      d({ type: 'CONFIG_COMPANY', patch: { companyName: EXAMPLE_REBRAND.companyName, tagline: EXAMPLE_REBRAND.tagline, phone: EXAMPLE_REBRAND.phone, email: EXAMPLE_REBRAND.email } });
      d({ type: 'CONFIG_BRANDING', patch: { ...p.branding, logoDataUrl: undefined } });
    },
    toggleService(serviceId: ServiceType) {
      const svc = get().config.services.find((x) => x.id === serviceId);
      if (!svc) return;
      const enabledCount = get().config.services.filter((x) => x.enabled).length;
      if (svc.enabled && enabledCount <= 1) return; // keep at least one service live
      d({ type: 'CONFIG_SERVICE', serviceId, patch: { enabled: !svc.enabled } });
    },
    updateService(serviceId: ServiceType, patch: Partial<ServiceConfig>) {
      d({ type: 'CONFIG_SERVICE', serviceId, patch });
    },
    moveService(serviceId: ServiceType, dir: -1 | 1) {
      d({ type: 'CONFIG_SERVICE_MOVE', serviceId, dir });
    },
    updateTeamMember(memberId: string, patch: Partial<TeamMember>) {
      d({ type: 'TEAM_UPDATE', memberId, patch });
    },
    inviteTeamMember(name: string, email: string, role: string, services: ServiceType[]) {
      const first = name.trim().split(/\s+/)[0] ?? name;
      const colors = ['#0E7490', '#B45309', '#4D7C0F', '#9333EA', '#BE123C'];
      d({
        type: 'TEAM_INVITE',
        member: { id: uid('w'), name: name.trim(), firstName: first, role, skills: [], services, color: colors[get().data.team.length % colors.length], phone: '', email, active: false, invited: true, hourlyCost: 18 },
      });
    },
  };
  return actions;
}
