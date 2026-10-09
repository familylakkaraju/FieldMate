import type { BusinessConfig, Customer, DemoData, DemoState, Invoice, Job, Lead, Quote, ServiceType, Task } from '../types/domain';
import { addDays, DEMO_DATE } from '../data/demoClock';

// ---------------------------------------------------------------- lookups
export const getCustomer = (d: DemoData, id?: string) => (id ? d.customers.find((c) => c.id === id) : undefined);
export const getJob = (d: DemoData, id?: string) => (id ? d.jobs.find((j) => j.id === id) : undefined);
export const getLead = (d: DemoData, id?: string) => (id ? d.leads.find((l) => l.id === id) : undefined);
export const getQuote = (d: DemoData, id?: string) => (id ? d.quotes.find((q) => q.id === id) : undefined);
export const getInvoice = (d: DemoData, id?: string) => (id ? d.invoices.find((i) => i.id === id) : undefined);
export const getTask = (d: DemoData, id?: string) => (id ? d.tasks.find((t) => t.id === id) : undefined);
export const getMember = (d: DemoData, id?: string) => (id ? d.team.find((m) => m.id === id) : undefined);

export const serviceOf = (cfg: BusinessConfig, id: ServiceType) => cfg.services.find((s) => s.id === id)!;
export const enabledServices = (cfg: BusinessConfig) => [...cfg.services].filter((s) => s.enabled).sort((a, b) => a.sortOrder - b.sortOrder);
export const sortedServices = (cfg: BusinessConfig) => [...cfg.services].sort((a, b) => a.sortOrder - b.sortOrder);

// ---------------------------------------------------------------- money
export const linesTotal = (lines: { quantity: number; unitPrice: number }[]) => lines.reduce((a, l) => a + l.quantity * l.unitPrice, 0);

export function quoteTotal(q: Quote): number {
  const net = Math.max(0, linesTotal(q.lineItems) - q.discount);
  return q.vat ? Math.round(net * 1.2 * 100) / 100 : net;
}

export function invoiceTotal(i: Invoice): number {
  const net = linesTotal(i.lineItems);
  return i.vat ? Math.round(net * 1.2 * 100) / 100 : net;
}

export const isOutstanding = (i: Invoice) => i.status === 'sent' || i.status === 'due' || i.status === 'overdue';

/** Work value of a job: invoice total when invoiced, otherwise the quoted amount. */
export function jobValue(d: DemoData, j: Job): number {
  const inv = getInvoice(d, j.invoiceId);
  return inv ? invoiceTotal(inv) : j.quotedAmount ?? 0;
}

// ---------------------------------------------------------------- jobs & tasks
export const tasksForJob = (d: DemoData, jobId: string): Task[] => d.tasks.filter((t) => t.jobId === jobId).sort((a, b) => a.order - b.order);

export function jobProgress(d: DemoData, j: Job) {
  const tasks = tasksForJob(d, j.id);
  if (!tasks.length) {
    const done = ['completed', 'invoiced', 'closed'].includes(j.status);
    return { done: done ? 1 : 0, total: 1, pct: done ? 100 : j.status === 'in-progress' ? 50 : 0, tasks };
  }
  const done = tasks.filter((t) => t.status === 'completed').length;
  return { done, total: tasks.length, pct: Math.round((done / tasks.length) * 100), tasks };
}

export function jobEstimatedMinutes(d: DemoData, j: Job): number {
  const tasks = tasksForJob(d, j.id);
  return tasks.length ? tasks.reduce((a, t) => a + t.estimatedMinutes, 0) : j.estimatedMinutes ?? 0;
}

export function jobActualMinutes(d: DemoData, j: Job): number {
  if (j.actualMinutesOverride !== undefined) return j.actualMinutesOverride;
  return tasksForJob(d, j.id).reduce((a, t) => a + (t.actualMinutes ?? 0), 0);
}

export function jobCosts(d: DemoData, j: Job) {
  const minutes = jobActualMinutes(d, j);
  const crew = j.assignedWorkerIds.map((w) => getMember(d, w)).filter(Boolean);
  const rate = crew.length ? crew.reduce((a, m) => a + m!.hourlyCost, 0) / crew.length : 20;
  const labour = Math.round((minutes / 60) * rate * Math.max(1, crew.length) * 100) / 100;
  const materials = j.materials.reduce((a, m) => a + m.cost, 0);
  return { minutes, labour, materials, total: labour + materials };
}

export const isToday = (iso?: string) => !!iso && iso.startsWith(DEMO_DATE);

export function jobsOn(d: DemoData, dateKey: string): Job[] {
  return d.jobs.filter((j) => j.scheduledStart?.startsWith(dateKey)).sort((a, b) => (a.scheduledStart! < b.scheduledStart! ? -1 : 1));
}

export const jobsToday = (d: DemoData) => jobsOn(d, DEMO_DATE);

export function jobsForWorker(d: DemoData, workerId: string, dateKey = DEMO_DATE): Job[] {
  return jobsOn(d, dateKey).filter((j) => j.assignedWorkerIds.includes(workerId));
}

export function jobCustomerLabel(d: DemoData, j: Job): string {
  if (j.customerId) return getCustomer(d, j.customerId)?.name ?? 'Customer';
  const stops = tasksForJob(d, j.id).length;
  return stops ? `Window round · ${stops} homes` : 'Window round';
}

export function jobAddress(d: DemoData, j: Job): string {
  if (j.address) return j.address;
  const c = getCustomer(d, j.customerId);
  return c ? `${c.address}, ${c.town} ${c.postcode}` : j.area ?? '';
}

export const ACTIVE_STATUSES = ['new', 'quoted', 'scheduled', 'in-progress', 'blocked'];

export interface RiskItem {
  job: Job;
  reason: string;
  severity: 'high' | 'medium';
}

export function atRiskJobs(d: DemoData): RiskItem[] {
  const items: RiskItem[] = [];
  for (const j of d.jobs) {
    if (!ACTIVE_STATUSES.includes(j.status)) continue;
    if (j.status === 'blocked') items.push({ job: j, reason: j.blockedReason ?? j.atRisk ?? 'Blocked', severity: 'high' });
    else if (j.atRisk) items.push({ job: j, reason: j.atRisk, severity: 'medium' });
    else if (isToday(j.scheduledStart) && !j.assignedWorkerIds.length) items.push({ job: j, reason: 'Scheduled today but unassigned', severity: 'medium' });
  }
  return items.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'high' ? -1 : 1));
}

// ---------------------------------------------------------------- KPIs
export function monthToDateRevenue(d: DemoData, month = DEMO_DATE.slice(0, 7)) {
  const byService: Record<ServiceType, number> = { plumbing: 0, gutter: 0, window: 0 };
  let jobs = 0;
  for (const j of d.jobs) {
    if (!['completed', 'invoiced', 'closed'].includes(j.status)) continue;
    const when = j.completedAt ?? j.scheduledStart;
    if (!when?.startsWith(month)) continue;
    byService[j.service] += jobValue(d, j);
    jobs++;
  }
  const total = byService.plumbing + byService.gutter + byService.window;
  return { total, byService, jobs };
}

export function outstandingTotals(d: DemoData) {
  const open = d.invoices.filter(isOutstanding);
  const overdue = open.filter((i) => i.status === 'overdue');
  return {
    count: open.length,
    total: open.reduce((a, i) => a + invoiceTotal(i), 0),
    overdueCount: overdue.length,
    overdue: overdue.reduce((a, i) => a + invoiceTotal(i), 0),
  };
}

export function onTimeRate(d: DemoData): number {
  const done = d.jobs.filter((j) => ['completed', 'invoiced', 'closed'].includes(j.status) && (j.completedAt ?? '').startsWith(DEMO_DATE.slice(0, 7)));
  if (!done.length) return 100;
  const onTime = done.filter((j) => jobActualMinutes(d, j) <= jobEstimatedMinutes(d, j) * 1.25 + 5).length;
  return Math.round((onTime / done.length) * 100);
}

export const openLeads = (d: DemoData) => d.leads.filter((l) => l.status === 'new' || l.status === 'contacted');

export function dashboardKpis(d: DemoData) {
  return {
    jobsToday: jobsToday(d).length,
    openLeads: openLeads(d).length,
    newLeadsToday: d.leads.filter((l) => l.createdAt.startsWith(DEMO_DATE)).length,
    revenue: monthToDateRevenue(d),
    outstanding: outstandingTotals(d),
    onTime: onTimeRate(d),
    rating: 4.9,
  };
}

// ---------------------------------------------------------------- customers
export function customerJobs(d: DemoData, customerId: string): Job[] {
  return d.jobs.filter((j) => j.customerId === customerId).sort((a, b) => ((a.scheduledStart ?? a.createdAt) > (b.scheduledStart ?? b.createdAt) ? -1 : 1));
}

export function customerStats(d: DemoData, c: Customer) {
  const jobs = customerJobs(d, c.id);
  const invoices = d.invoices.filter((i) => i.customerId === c.id);
  const paid = invoices.filter((i) => i.status === 'paid').reduce((a, i) => a + invoiceTotal(i), 0);
  const outstanding = invoices.filter(isOutstanding).reduce((a, i) => a + invoiceTotal(i), 0);
  const historyValue = c.history.reduce((a, h) => a + h.value, 0);
  const doneDates = [
    ...c.history.map((h) => h.date),
    ...jobs.filter((j) => ['completed', 'invoiced', 'closed'].includes(j.status)).map((j) => (j.completedAt ?? j.scheduledStart ?? '').slice(0, 10)),
  ].filter(Boolean).sort();
  const upcomingJob = jobs
    .filter((j) => ACTIVE_STATUSES.includes(j.status) && j.scheduledStart && j.scheduledStart.slice(0, 10) >= DEMO_DATE)
    .sort((a, b) => (a.scheduledStart! < b.scheduledStart! ? -1 : 1))[0];
  const recurringNext = (c.recurring ?? []).map((r) => r.nextDue).filter((x) => x >= DEMO_DATE).sort()[0];
  const nextService = upcomingJob?.scheduledStart ?? recurringNext;
  return {
    jobs,
    invoices,
    lifetimeValue: historyValue + paid,
    outstanding,
    lastService: doneDates[doneDates.length - 1],
    nextService,
    upcomingJob,
    isRecurring: !!c.recurring?.some((r) => r.frequencyWeeks < 52),
  };
}

export interface DueItem {
  customer: Customer;
  service: ServiceType;
  label: string;
  due: string;
  price: number;
  booked: boolean;
}

export function recurringDue(d: DemoData, days = 14): DueItem[] {
  const until = addDays(DEMO_DATE, days);
  const items: DueItem[] = [];
  for (const c of d.customers) {
    for (const r of c.recurring ?? []) {
      if (r.nextDue >= DEMO_DATE && r.nextDue <= until) {
        const booked = d.jobs.some(
          (j) => (j.customerId === c.id || tasksForJob(d, j.id).some((t) => t.title.startsWith(c.name))) && j.service === r.service && ACTIVE_STATUSES.includes(j.status) && (j.scheduledStart ?? '') >= DEMO_DATE,
        );
        items.push({ customer: c, service: r.service, label: r.label, due: r.nextDue, price: r.pricePerVisit, booked });
      }
    }
  }
  return items.sort((a, b) => (a.due < b.due ? -1 : 1));
}

/** Customers who had an autumn gutter clean last year but have nothing booked this season. */
export function autumnGutterReminders(d: DemoData): DueItem[] {
  const items: DueItem[] = [];
  for (const c of d.customers) {
    const last = c.history.filter((h) => h.service === 'gutter' && h.date >= '2025-09-01' && h.date <= '2025-12-31').sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    if (!last) continue;
    const thisSeason = d.jobs.some((j) => j.customerId === c.id && j.service === 'gutter' && (j.scheduledStart ?? j.createdAt) >= '2026-09-01');
    if (thisSeason) continue;
    items.push({ customer: c, service: 'gutter', label: `Last cleaned ${last.date}`, due: addDays(last.date, 365), price: last.value, booked: false });
  }
  return items.sort((a, b) => (a.due < b.due ? -1 : 1));
}

export function recentPayments(d: DemoData, count = 3) {
  return d.invoices
    .filter((i) => i.status === 'paid' && i.paidAt)
    .sort((a, b) => (a.paidAt! < b.paidAt! ? 1 : -1))
    .slice(0, count);
}

// ---------------------------------------------------------------- team
export function workerStatus(d: DemoData, workerId: string): { label: string; detail: string; tone: 'busy' | 'warn' | 'idle' | 'office' } {
  const m = getMember(d, workerId);
  if (m?.isOffice) return { label: 'Office', detail: 'Leads, bookings & invoices', tone: 'office' };
  const today = jobsForWorker(d, workerId);
  const active = today.find((j) => j.status === 'in-progress') ?? today.find((j) => j.status === 'blocked');
  if (active) {
    const svc = active.service === 'plumbing' ? 'plumbing call' : active.service === 'gutter' ? 'gutter job' : active.kind === 'round' ? 'window round' : 'window clean';
    const prog = jobProgress(d, active);
    const detail = active.kind === 'round' ? `${active.title.replace(' Window Round', '')} · ${prog.done} of ${prog.total} homes` : `${jobCustomerLabel(d, active)}${active.status === 'blocked' ? ' · waiting for part' : active.atRisk ? ' · running over' : ''}`;
    return { label: `On ${svc}`, detail, tone: active.status === 'blocked' || active.atRisk ? 'warn' : 'busy' };
  }
  const next = today.find((j) => ['scheduled', 'new'].includes(j.status));
  if (next) return { label: 'Travelling / between jobs', detail: `Next: ${jobCustomerLabel(d, next)} at ${next.scheduledStart!.slice(11, 16)}`, tone: 'idle' };
  return { label: 'Available', detail: 'No more jobs today', tone: 'idle' };
}

// ---------------------------------------------------------------- portal identity
export function portalIdentity(s: DemoState): { customer?: Customer; lead?: Lead; name: string; email: string } {
  const key = s.persona.portalCustomerKey.toLowerCase();
  const customer = s.data.customers.find((c) => c.email.toLowerCase() === key);
  const lead = s.data.leads.find((l) => (l.email ?? '').toLowerCase() === key);
  return { customer, lead, name: customer?.name ?? lead?.customerName ?? 'Customer', email: key };
}

// ---------------------------------------------------------------- search
export interface SearchHit {
  type: 'Customer' | 'Job' | 'Task' | 'Lead' | 'Quote' | 'Invoice' | 'File';
  id: string;
  title: string;
  subtitle: string;
  link: string;
  service?: ServiceType;
}

export function searchAll(d: DemoData, query: string): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const has = (...v: (string | undefined)[]) => v.some((x) => x?.toLowerCase().includes(q));
  const hits: SearchHit[] = [];
  d.customers.forEach((c) => has(c.name, c.email, c.address, c.postcode, c.town, c.phone) && hits.push({ type: 'Customer', id: c.id, title: c.name, subtitle: `${c.address}, ${c.town} ${c.postcode}`, link: `/app/customers/${c.id}` }));
  d.leads.forEach((l) => has(l.customerName, l.ref, l.summary, l.postcode, l.email) && hits.push({ type: 'Lead', id: l.id, title: `${l.ref} · ${l.customerName}`, subtitle: l.summary, link: `/app/leads/${l.id}`, service: l.service }));
  d.jobs.forEach((j) => has(j.title, j.ref, j.address, getCustomer(d, j.customerId)?.name) && hits.push({ type: 'Job', id: j.id, title: `${j.ref} · ${j.title}`, subtitle: jobAddress(d, j), link: `/app/jobs/${j.id}`, service: j.service }));
  d.tasks.forEach((t) => {
    const j = getJob(d, t.jobId);
    if (has(t.title, t.outcome)) hits.push({ type: 'Task', id: t.id, title: t.title, subtitle: j ? `${j.ref} · ${j.title}` : '', link: `/app/tasks/${t.id}`, service: j?.service });
  });
  d.quotes.forEach((x) => has(x.ref, x.title, getCustomer(d, x.customerId)?.name, getLead(d, x.leadId)?.customerName) && hits.push({ type: 'Quote', id: x.id, title: `${x.ref} · ${x.title}`, subtitle: getCustomer(d, x.customerId)?.name ?? getLead(d, x.leadId)?.customerName ?? '', link: `/app/quotes/${x.id}`, service: x.service }));
  d.invoices.forEach((i) => has(i.ref, getCustomer(d, i.customerId)?.name) && hits.push({ type: 'Invoice', id: i.id, title: `${i.ref} · ${getCustomer(d, i.customerId)?.name ?? ''}`, subtitle: `£${invoiceTotal(i)} · ${i.status}`, link: '/app/invoices' }));
  d.evidence.forEach((e) => has(e.caption, getJob(d, e.jobId)?.title) && hits.push({ type: 'File', id: e.id, title: e.caption ?? 'Photo', subtitle: getJob(d, e.jobId)?.title ?? '', link: '/app/files', service: e.service }));
  return hits.slice(0, 60);
}
