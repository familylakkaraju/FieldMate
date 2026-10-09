import { useCallback, useEffect, useId, useMemo, useRef, useState, type ComponentProps, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  BadgeCheck,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  CreditCard,
  Download,
  FileCheck,
  Hammer,
  Inbox,
  Loader2,
  Lock,
  Pause,
  Play,
  ReceiptText,
  Repeat,
  Send,
  ShieldCheck,
  SkipForward,
  Truck,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import type { DemoData, DemoState, Invoice, InvoiceStatus, Job, Lead, Message, QuoteStatus, RecurringPlan, ServiceType, TeamMember } from '../../types/domain';
import { useConfig, useDemo, useDemoData } from '../../app/DemoProvider';
import { customerJobs, getCustomer, getInvoice, getJob, getLead, getQuote, invoiceTotal, isOutstanding, portalIdentity, quoteTotal } from '../../app/selectors';
import { addDays, DEMO_DATE, parseLocal, toLocalIso } from '../../data/demoClock';
import { serviceTone } from '../../theme/branding';
import { cx } from '../../utils/cx';
import { dayMonth, dayMonthYear, longDate, money, relativeDay, time, timeRange } from '../../utils/format';
import { Badge } from '../common/Badge';
import { Button, LinkButton } from '../common/Button';
import { EmptyState } from '../common/Card';
import { inputClass } from '../common/Form';
import { Modal } from '../common/Modal';
import { Avatar } from '../common/Avatar';
import { ServiceIcon } from '../common/ServiceIcon';
import { useToast } from '../common/Toast';
import { DocumentPreview } from '../shared/DocumentPreview';

// ---------------------------------------------------------------- identity & data

export const PRIYA_EMAIL = 'priya.shah@example.com';
const FEATURED_CUSTOMERS = ['claire.morrison@example.com', 'margaret.ellis@example.com', 'graham.thompson@example.com'];
const DONE_STATUSES: Job['status'][] = ['completed', 'invoiced', 'closed'];

export const isJobDone = (j: Job) => DONE_STATUSES.includes(j.status);
export const isQuotePending = (status: QuoteStatus) => status === 'sent' || status === 'viewed';

/** Everything the customer portal shows for the person currently "signed in". */
export function usePortal() {
  const { state, actions } = useDemo();
  const { data, config } = state;
  const identity = useMemo(() => portalIdentity(state), [state]);
  const derived = useMemo(() => {
    const { customer, lead } = identity;
    const jobs = customer ? customerJobs(data, customer.id) : [];
    const jobIds = new Set(jobs.map((j) => j.id));
    const quotes = data.quotes
      .filter((q) => q.status !== 'draft' && ((!!customer && q.customerId === customer.id) || (!!lead && q.leadId === lead.id)))
      .sort((a, b) => ((a.sentAt ?? a.createdAt) < (b.sentAt ?? b.createdAt) ? 1 : -1));
    const invoices = customer ? data.invoices.filter((i) => i.customerId === customer.id && i.status !== 'draft').sort((a, b) => (a.issuedAt < b.issuedAt ? 1 : -1)) : [];
    // Merchant receipts are internal cost records — never show them to the customer.
    const evidence = data.evidence
      .filter((e) => e.type !== 'receipt' && ((!!customer && e.customerId === customer.id) || jobIds.has(e.jobId)))
      .sort((a, b) => (a.at < b.at ? 1 : -1));
    return { jobs, quotes, invoices, evidence };
  }, [data, identity]);
  const firstName = identity.name.split(' ')[0] || identity.name;
  return { state, actions, data, config, company: config.company, ...identity, firstName, ...derived };
}

/** People the presenter can "view the portal as". */
export function portalPeople(state: DemoState): { name: string; email: string }[] {
  const d = state.data;
  const out = new Map<string, { name: string; email: string }>();
  const add = (name: string, email?: string) => {
    if (!email) return;
    const key = email.toLowerCase();
    if (!out.has(key)) out.set(key, { name, email: key });
  };
  add('Priya Shah', PRIYA_EMAIL);
  d.leads.filter((l) => l.createdAt.startsWith(DEMO_DATE)).forEach((l) => add(l.customerName, l.email));
  d.customers.filter((c) => c.customerSince === DEMO_DATE).forEach((c) => add(c.name, c.email));
  FEATURED_CUSTOMERS.forEach((email) => {
    const c = d.customers.find((x) => x.email.toLowerCase() === email);
    if (c) add(c.name, c.email);
  });
  const key = state.persona.portalCustomerKey.toLowerCase();
  if (!out.has(key)) add(portalIdentity(state).name, key);
  return [...out.values()];
}

/** Active (in progress / today), upcoming and completed jobs. */
export function groupJobs(jobs: Job[]) {
  const active = jobs.filter((j) => j.status === 'in-progress' || j.status === 'blocked' || (!isJobDone(j) && (j.scheduledStart ?? '').startsWith(DEMO_DATE)));
  const upcoming = jobs
    .filter((j) => !isJobDone(j) && !active.includes(j))
    .sort((a, b) => ((a.scheduledStart ?? '9999') < (b.scheduledStart ?? '9999') ? -1 : 1));
  const done = jobs.filter(isJobDone).sort((a, b) => ((a.completedAt ?? a.scheduledStart ?? a.createdAt) < (b.completedAt ?? b.scheduledStart ?? b.createdAt) ? 1 : -1));
  return { active, upcoming, done };
}

export function crewMembers(data: DemoData, ids: string[]): TeamMember[] {
  return ids.map((id) => data.team.find((m) => m.id === id)).filter((m): m is TeamMember => !!m);
}

export function crewNames(data: DemoData, ids: string[]): string {
  const names = crewMembers(data, ids).map((m) => m.firstName);
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
}

/** "today", "tomorrow" or "on Friday 16 October 2026". */
export function whenPhrase(iso: string): string {
  const rel = relativeDay(iso);
  if (rel === 'Today' || rel === 'Tomorrow') return rel.toLowerCase();
  return `on ${longDate(iso)}`;
}

/** Estimated arrival when the technician has set off. */
export function etaFor(job: Job): string | undefined {
  if (!job.onTheWayAt) return undefined;
  const d = parseLocal(job.onTheWayAt);
  d.setMinutes(d.getMinutes() + (job.travelMinutes ?? 15));
  return time(toLocalIso(d));
}

export function useCallBusiness() {
  const toast = useToast();
  const { company } = useConfig();
  return useCallback(
    () => toast({ title: `Calling ${company.companyName}…`, description: `${company.phone} — demo only, no real call is placed.`, tone: 'info' }),
    [toast, company.companyName, company.phone],
  );
}

// ---------------------------------------------------------------- status language

type Tone = NonNullable<ComponentProps<typeof Badge>['tone']>;

export function customerJobStatus(job: Job, invoice?: Invoice): { label: string; tone: Tone } {
  switch (job.status) {
    case 'new':
      return { label: 'Being arranged', tone: 'gray' };
    case 'quoted':
      return { label: 'Quote to approve', tone: 'amber' };
    case 'scheduled':
      return job.onTheWayAt ? { label: 'On the way', tone: 'teal' } : { label: 'Booked', tone: 'blue' };
    case 'in-progress':
      return { label: 'In progress', tone: 'teal' };
    case 'blocked':
      return { label: 'Paused', tone: 'amber' };
    case 'completed':
      return { label: 'Completed', tone: 'green' };
    case 'invoiced':
      return invoice?.status === 'paid' ? { label: 'Paid', tone: 'green' } : { label: 'Invoice ready', tone: 'violet' };
    case 'closed':
      return { label: 'Paid · Closed', tone: 'green' };
    default:
      return { label: job.status, tone: 'gray' };
  }
}

export function JobStatusBadge({ job, className }: { job: Job; className?: string }) {
  const data = useDemoData();
  const s = customerJobStatus(job, getInvoice(data, job.invoiceId));
  return (
    <Badge tone={s.tone} dot className={className}>
      {s.label}
    </Badge>
  );
}

const QUOTE_LABEL: Record<QuoteStatus, [Tone, string]> = {
  draft: ['gray', 'Being prepared'],
  sent: ['amber', 'Awaiting your approval'],
  viewed: ['amber', 'Awaiting your approval'],
  accepted: ['green', 'Accepted'],
  declined: ['red', 'Declined'],
  expired: ['gray', 'Expired'],
};

export function QuoteStatusBadge({ status, className }: { status: QuoteStatus; className?: string }) {
  const [tone, label] = QUOTE_LABEL[status];
  return (
    <Badge tone={tone} dot className={className}>
      {label}
    </Badge>
  );
}

const INVOICE_LABEL: Record<InvoiceStatus, [Tone, string]> = {
  draft: ['gray', 'Draft'],
  sent: ['amber', 'Due'],
  due: ['amber', 'Due'],
  overdue: ['red', 'Overdue'],
  paid: ['green', 'Paid'],
};

export function InvoiceStatusBadge({ status, className }: { status: InvoiceStatus; className?: string }) {
  const [tone, label] = INVOICE_LABEL[status];
  return (
    <Badge tone={tone} dot className={className}>
      {label}
    </Badge>
  );
}

export function LivePill({ label = 'Live', tone = 'success' }: { label?: string; tone?: 'success' | 'warning' }) {
  return (
    <span
      className={cx(
        'inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-bold uppercase tracking-wide',
        tone === 'success' ? 'bg-success-soft text-success-ink' : 'bg-warning-soft text-warning-ink',
      )}
    >
      <span className="relative flex size-2" aria-hidden>
        <span className={cx('absolute inline-flex size-full animate-ping rounded-full opacity-75', tone === 'success' ? 'bg-success' : 'bg-warning')} />
        <span className={cx('relative inline-flex size-2 rounded-full', tone === 'success' ? 'bg-success' : 'bg-warning')} />
      </span>
      {label}
    </span>
  );
}

// ---------------------------------------------------------------- job steps

export type StepKey = 'request' | 'quote' | 'scheduled' | 'onway' | 'started' | 'completed' | 'invoice';

export interface PortalStep {
  key: StepKey;
  label: string;
  icon: LucideIcon;
  done: boolean;
  when?: string;
  detail?: string;
  cta?: { label: string; to: string };
}

const stamp = (iso?: string) => (iso ? `${relativeDay(iso)} · ${time(iso)}` : undefined);

export function jobSteps(data: DemoData, job: Job): PortalStep[] {
  const lead = getLead(data, job.leadId);
  const quote = getQuote(data, job.quoteId);
  const invoice = getInvoice(data, job.invoiceId);
  const finished = isJobDone(job) || !!job.completedAt;
  const started = !!job.startedAt || finished || job.status === 'in-progress' || job.status === 'blocked';
  const onWay = !!job.onTheWayAt || started;
  const quoteDone = quote ? quote.status === 'accepted' || started : job.status !== 'new' && job.status !== 'quoted';
  const quotePending = !!quote && !quoteDone && isQuotePending(quote.status);
  const issued = !!invoice && invoice.status !== 'draft';
  const crew = crewNames(data, job.assignedWorkerIds);
  return [
    { key: 'request', label: 'Request received', icon: Inbox, done: true, when: stamp(lead?.createdAt ?? job.createdAt), detail: lead ? `Reference ${lead.ref}` : `Job ${job.ref}` },
    {
      key: 'quote',
      label: 'Quote accepted',
      icon: FileCheck,
      done: quoteDone,
      when: quoteDone ? stamp(quote?.acceptedAt) : undefined,
      detail: quote ? `${quote.ref} · ${money(quoteTotal(quote))}${quotePending ? ' · waiting for your approval' : ''}` : quoteDone ? 'Price agreed' : undefined,
      cta: quotePending ? { label: 'Review quote', to: `/portal/quotes/${quote!.id}` } : undefined,
    },
    {
      key: 'scheduled',
      label: 'Scheduled',
      icon: CalendarCheck,
      done: !!job.scheduledStart,
      when: job.scheduledStart ? `${relativeDay(job.scheduledStart)} · ${timeRange(job.scheduledStart, job.scheduledEnd)}` : undefined,
      detail: job.scheduledStart && crew ? `With ${crew}` : undefined,
    },
    { key: 'onway', label: 'Technician on the way', icon: Truck, done: onWay, when: stamp(job.onTheWayAt ?? job.startedAt) },
    { key: 'started', label: 'Work started', icon: Hammer, done: started, when: stamp(job.startedAt) },
    { key: 'completed', label: 'Work completed', icon: ClipboardCheck, done: finished, when: stamp(job.completedAt) },
    {
      key: 'invoice',
      label: 'Invoice issued',
      icon: ReceiptText,
      done: issued,
      when: issued ? stamp(invoice!.issuedAt) : undefined,
      detail: issued ? (invoice!.status === 'paid' ? `${invoice!.ref} · paid ${dayMonth(invoice!.paidAt)} — thank you` : `${invoice!.ref} · ${money(invoiceTotal(invoice!), true)} due ${invoice!.dueDate ? dayMonth(invoice!.dueDate) : 'within 14 days'}`) : undefined,
    },
  ];
}

/** Steps for a request the office hasn't converted yet — only the first is done. */
export function requestSteps(lead: Lead): PortalStep[] {
  return [
    { key: 'request', label: 'Request received', icon: Inbox, done: true, when: stamp(lead.createdAt), detail: `Reference ${lead.ref}` },
    { key: 'quote', label: 'Quote accepted', icon: FileCheck, done: false, detail: lead.estimateRange ? `Instant estimate ${money(lead.estimateRange[0])}–${money(lead.estimateRange[1])}` : undefined },
    { key: 'scheduled', label: 'Scheduled', icon: CalendarCheck, done: false, detail: lead.preferredSlot ? `You asked for ${lead.preferredSlot.label}` : undefined },
    { key: 'onway', label: 'Technician on the way', icon: Truck, done: false },
    { key: 'started', label: 'Work started', icon: Hammer, done: false },
    { key: 'completed', label: 'Work completed', icon: ClipboardCheck, done: false },
    { key: 'invoice', label: 'Invoice issued', icon: ReceiptText, done: false },
  ];
}

export function currentStepIndex(steps: PortalStep[]): number {
  let idx = 0;
  steps.forEach((s, i) => {
    if (s.done) idx = i;
  });
  return idx;
}

/** Which step is "live" right now (technician travelling or working). */
export function liveStep(job: Job): { key: StepKey; label: string; tone: 'success' | 'warning' } | undefined {
  if (job.status === 'blocked') return { key: 'started', label: 'Paused', tone: 'warning' };
  if (job.status === 'in-progress') return { key: 'started', label: 'Live', tone: 'success' };
  if (job.onTheWayAt && !job.startedAt && !isJobDone(job)) return { key: 'onway', label: 'On the way', tone: 'success' };
  return undefined;
}

/** Compact segmented tracker used on cards. */
export function MiniTracker({ steps, live }: { steps: PortalStep[]; live?: boolean }) {
  const idx = currentStepIndex(steps);
  const current = steps[idx];
  const next = steps.slice(idx + 1).find((s) => !s.done);
  const action = steps.find((s) => !s.done && s.cta);
  const doneCount = steps.filter((s) => s.done).length;
  return (
    <div>
      <div className="flex gap-1.5" role="img" aria-label={`${doneCount} of ${steps.length} steps complete. Latest: ${current.label}.`}>
        {steps.map((s, i) => (
          <span
            key={s.key}
            className={cx('h-2 flex-1 rounded-full transition-colors duration-500', s.done ? 'bg-secondary-solid' : s.cta ? 'bg-warning' : 'bg-line', i === idx && live && 'animate-pulse')}
            aria-hidden
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p className="text-sm text-ink">
          <span className="font-semibold">{current.label}</span>
          {current.when && <span className="text-muted"> · {current.when}</span>}
        </p>
        <p className="text-xs font-semibold text-muted">
          Step {idx + 1} of {steps.length}
        </p>
      </div>
      {action ? (
        <p className="mt-1 text-[13px] font-semibold text-warning-ink">Action needed: {action.label.toLowerCase()}</p>
      ) : (
        next && <p className="mt-1 text-[13px] text-muted">Next: {next.label}</p>
      )}
    </div>
  );
}

/** Vertical, accessible status timeline. */
export function StepTimeline({ steps, live, liveNode }: { steps: PortalStep[]; live?: { key: StepKey; label: string; tone: 'success' | 'warning' }; liveNode?: ReactNode }) {
  const idx = currentStepIndex(steps);
  return (
    <ol className="relative">
      {steps.map((s, i) => {
        const current = i === idx;
        const isLive = !!live && live.key === s.key && current;
        const action = !s.done && !!s.cta;
        const Icon = s.icon;
        return (
          <li key={s.key} className="relative flex gap-4 pb-6 last:pb-0" aria-current={current ? 'step' : undefined}>
            {i < steps.length - 1 && (
              <span
                aria-hidden
                className={cx('absolute left-[19px] top-11 h-[calc(100%-2.75rem)] w-0.5 rounded-full transition-colors duration-500', s.done && steps[i + 1].done ? 'bg-secondary-solid' : 'bg-line')}
              />
            )}
            <span className="relative z-[1] mt-0.5 shrink-0">
              {isLive && <span aria-hidden className={cx('absolute inset-0 animate-pulse-ring rounded-full', live.tone === 'warning' ? 'bg-warning' : 'bg-secondary')} />}
              <span
                className={cx(
                  'relative grid size-10 place-items-center rounded-full border-2 transition',
                  s.done
                    ? current
                      ? 'border-secondary-solid bg-secondary-solid text-secondary-on shadow-raised'
                      : 'border-secondary-solid bg-secondary-soft text-secondary-ink'
                    : action
                      ? 'border-warning bg-warning-soft text-warning-ink'
                      : 'border-line-2 bg-surface text-muted',
                )}
              >
                {s.done && !current ? <CheckCircle2 className="size-5" aria-hidden /> : <Icon className="size-[18px]" aria-hidden />}
              </span>
            </span>
            <div className="min-w-0 flex-1 pt-1.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className={cx('text-[15px] font-semibold', s.done || action ? 'text-ink' : 'text-muted')}>{s.label}</p>
                {isLive ? (
                  <LivePill label={live.label} tone={live.tone} />
                ) : current ? (
                  <Badge tone="brand">Latest update</Badge>
                ) : action ? (
                  <Badge tone="amber">Action needed</Badge>
                ) : s.done ? (
                  <span className="text-xs font-semibold text-success-ink">Done</span>
                ) : (
                  <span className="text-xs font-medium text-muted">Upcoming</span>
                )}
              </div>
              {s.when && <p className="mt-0.5 text-[13px] text-muted">{s.when}</p>}
              {s.detail && <p className="mt-0.5 text-[13px] text-ink-2">{s.detail}</p>}
              {action && s.cta && (
                <LinkButton to={s.cta.to} size="sm" className="mt-2.5">
                  {s.cta.label}
                </LinkButton>
              )}
              {isLive && liveNode}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ---------------------------------------------------------------- small building blocks

export function PortalHeading({ title, subtitle, back, actions, eyebrow }: { title: ReactNode; subtitle?: ReactNode; back?: { to: string; label: string }; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="mb-6 animate-fade-in">
      {back && (
        <Link to={back.to} className="mb-3 inline-flex items-center gap-1.5 rounded-lg text-sm font-semibold text-muted transition hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden />
          {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && <div className="mb-1.5">{eyebrow}</div>}
          <h1 className="font-display text-[26px] font-extrabold leading-tight tracking-tight text-primary-ink sm:text-[30px]">{title}</h1>
          {subtitle && <div className="mt-1 text-[15px] text-muted">{subtitle}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function SectionTitle({ title, count, subtitle, id }: { title: string; count?: number; subtitle?: string; id?: string }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 id={id} className="flex items-center gap-2 font-display text-lg font-extrabold text-ink">
          {title}
          {count !== undefined && <span className="rounded-full bg-subtle px-2 py-0.5 text-xs font-bold text-muted">{count}</span>}
        </h2>
        {subtitle && <p className="text-[13px] text-muted">{subtitle}</p>}
      </div>
    </div>
  );
}

export function ServiceTile({ service, size = 'md' }: { service: ServiceType; size?: 'sm' | 'md' }) {
  const cfg = useConfig();
  const s = cfg.services.find((x) => x.id === service);
  const tone = serviceTone(s?.color ?? '#475467');
  return (
    <span className={cx('grid shrink-0 place-items-center', size === 'sm' ? 'size-9 rounded-xl' : 'size-12 rounded-2xl')} style={{ background: tone.soft, color: tone.ink }}>
      <ServiceIcon name={s?.icon ?? 'wrench'} className={size === 'sm' ? 'size-4.5' : 'size-6'} />
    </span>
  );
}

export function DateTile({ iso }: { iso: string }) {
  const d = parseLocal(iso.slice(0, 10));
  return (
    <div className="w-16 shrink-0 overflow-hidden rounded-xl border border-line bg-surface text-center shadow-sm" aria-hidden>
      <span className="block bg-secondary-solid py-0.5 text-[11px] font-bold uppercase tracking-wider text-secondary-on">{d.toLocaleDateString('en-GB', { month: 'short' })}</span>
      <span className="block pt-1.5 font-display text-[26px] font-extrabold leading-none text-ink">{d.getDate()}</span>
      <span className="block pb-1.5 pt-0.5 text-[11px] font-semibold text-muted">{d.toLocaleDateString('en-GB', { weekday: 'short' })}</span>
    </div>
  );
}

export function CrewList({ ids, emptyText = 'Your technician will be confirmed shortly.' }: { ids: string[]; emptyText?: string }) {
  const data = useDemoData();
  const members = crewMembers(data, ids);
  if (!members.length)
    return (
      <p className="flex items-center gap-2 text-sm text-muted">
        <UserRound className="size-4" aria-hidden /> {emptyText}
      </p>
    );
  return (
    <ul className="space-y-3">
      {members.map((m) => (
        <li key={m.id} className="flex items-center gap-3">
          <Avatar name={m.name} color={m.color} size="md" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{m.name}</p>
            <p className="truncate text-xs text-muted">{m.role}</p>
          </div>
          <BadgeCheck className="ml-auto size-4.5 shrink-0 text-success" aria-label="ID-checked and insured" />
        </li>
      ))}
    </ul>
  );
}

export function CrewFaces({ ids }: { ids: string[] }) {
  const data = useDemoData();
  const members = crewMembers(data, ids);
  if (!members.length) return <span className="text-[13px] font-medium text-muted">Technician TBC</span>;
  return (
    <span className="inline-flex items-center gap-2" title={members.map((m) => m.name).join(' & ')}>
      <span className="inline-flex">
        {members.slice(0, 3).map((m, i) => (
          <Avatar key={m.id} name={m.name} color={m.color} size="sm" ring className={i ? '-ml-2' : ''} />
        ))}
      </span>
      <span className="text-[13px] font-medium text-ink-2">{crewNames(data, ids)}</span>
    </span>
  );
}

// ---------------------------------------------------------------- empty / pending states

export function PortalNoAccount() {
  const { actions, email } = usePortal();
  return (
    <div className="py-10">
      <EmptyState
        icon={UserRound}
        title="We couldn’t find your account"
        text={`There’s no customer record for ${email} yet. Choose another person from “Viewing as” above.`}
        action={<Button onClick={() => actions.setPersona({ portalCustomerKey: PRIYA_EMAIL })}>View as Priya Shah</Button>}
      />
    </div>
  );
}

export function PortalPending({ what }: { what: string }) {
  const { lead } = usePortal();
  return (
    <div className="py-6">
      <EmptyState
        icon={Clock}
        title={`${what} will appear here once your booking is confirmed`}
        text={`We’re confirming request ${lead?.ref ?? ''} — you’ll get a text shortly.`}
        action={
          <LinkButton to="/portal" variant="outline">
            View your request
          </LinkButton>
        }
      />
    </div>
  );
}

// ---------------------------------------------------------------- recurring plans

export function RecurringPlanCard({ plan }: { plan: RecurringPlan }) {
  const cfg = useConfig();
  const toast = useToast();
  const svc = cfg.services.find((s) => s.id === plan.service);
  const [skips, setSkips] = useState(0);
  const [paused, setPaused] = useState(false);
  const next = addDays(plan.nextDue, skips * plan.frequencyWeeks * 7);
  const every = plan.frequencyWeeks >= 52 ? 'Once a year' : `Every ${plan.frequencyWeeks} weeks`;
  return (
    <div className={cx('rounded-xl border p-4 transition', paused ? 'border-dashed border-line-2 bg-subtle/60' : 'border-line bg-surface')}>
      <div className="flex items-start gap-3">
        <ServiceTile service={plan.service} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-ink">{plan.label}</p>
            {paused ? (
              <Badge tone="gray">Paused</Badge>
            ) : (
              <Badge tone="green" dot>
                Active
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-[13px] text-muted">
            {svc?.name ?? 'Service'} · {every} · {money(plan.pricePerVisit)} per visit
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-2">
            <Repeat className="size-4 text-secondary-ink" aria-hidden />
            {paused ? 'No visits until you resume' : <>Next visit due <span className="font-semibold text-ink">{longDate(next)}</span></>}
          </p>
        </div>
      </div>
      <div className="mt-3.5 flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={paused}
          icon={<SkipForward className="size-3.5" />}
          onClick={() => {
            const moved = addDays(next, plan.frequencyWeeks * 7);
            setSkips((n) => n + 1);
            toast({ title: 'Next visit skipped', description: `We’ll see you ${whenPhrase(moved)} instead. The office has been notified (demo).` });
          }}
        >
          Skip next visit
        </Button>
        <Button
          variant={paused ? 'soft' : 'ghost'}
          size="sm"
          icon={paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
          onClick={() => {
            setPaused((p) => !p);
            toast(
              paused
                ? { title: 'Plan resumed', description: `Your ${plan.label.toLowerCase()} is back on — next visit ${whenPhrase(next)}.` }
                : { title: 'Plan paused', description: 'No visits will be booked until you resume. (Demo — nothing is cancelled.)', tone: 'info' },
            );
          }}
        >
          {paused ? 'Resume plan' : 'Pause plan'}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- messages

function Bubble({ m }: { m: Message }) {
  const data = useDemoData();
  const mine = m.from === 'customer';
  const member = data.team.find((t) => t.name === m.author);
  return (
    <div className={cx('flex items-end gap-2 animate-rise', mine ? 'justify-end' : 'justify-start')}>
      {!mine && <Avatar name={m.author} color={member?.color} size="sm" />}
      <div className={cx('max-w-[82%] sm:max-w-[72%]', mine && 'text-right')}>
        <div
          className={cx(
            'inline-block whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-left text-sm leading-relaxed',
            mine ? 'rounded-br-md bg-secondary-solid text-secondary-on' : 'rounded-bl-md border border-line bg-surface text-ink shadow-sm',
          )}
        >
          {m.text}
        </div>
        <p className="mt-1 px-1 text-[11px] text-muted">
          {mine ? 'You' : m.author} · {relativeDay(m.at)} {time(m.at)}
        </p>
      </div>
    </div>
  );
}

/** A job's message thread with a composer that posts as the customer. */
export function MessageThread({ job, author, maxHeight = 'max-h-[420px]' }: { job: Job; author: string; maxHeight?: string }) {
  const { state, actions } = useDemo();
  const toast = useToast();
  const [text, setText] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const count = job.messages.length;
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [count, job.id]);
  const send = (e?: FormEvent) => {
    e?.preventDefault();
    const t = text.trim();
    if (!t) return;
    actions.sendMessage(job.id, 'customer', author, t);
    setText('');
    toast({ title: 'Message sent', description: `${state.config.company.companyName} will reply here — usually within the hour.` });
  };
  return (
    <div>
      <div ref={listRef} role="log" aria-live="polite" aria-label={`Messages about ${job.ref}`} className={cx('space-y-3 overflow-y-auto rounded-xl bg-canvas p-3 sm:p-4', maxHeight)}>
        {count === 0 ? (
          <p className="py-8 text-center text-sm text-muted">No messages yet — ask us anything about this job.</p>
        ) : (
          job.messages.map((m) => <Bubble key={m.id} m={m} />)
        )}
      </div>
      <form onSubmit={send} className="mt-3 flex items-end gap-2">
        <label htmlFor={id} className="sr-only">
          Write a message about {job.ref}
        </label>
        <textarea
          id={id}
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Write a message…"
          className={cx(inputClass, 'h-auto min-h-12 flex-1 resize-none py-2.5')}
        />
        <Button type="submit" disabled={!text.trim()} className="h-12" icon={<Send className="size-4" />} aria-label="Send message">
          <span className="max-sm:hidden">Send</span>
        </Button>
      </form>
      <p className="mt-2 text-xs text-muted">Press Enter to send · Shift + Enter for a new line</p>
    </div>
  );
}

// ---------------------------------------------------------------- invoices: view & pay

function InvoiceViewModal({ invoiceId, onClose, onPay }: { invoiceId: string | null; onClose: () => void; onPay: (id: string) => void }) {
  const { state } = useDemo();
  const toast = useToast();
  const invoice = getInvoice(state.data, invoiceId ?? undefined);
  if (!invoice) return null;
  const customer = getCustomer(state.data, invoice.customerId);
  const job = getJob(state.data, invoice.jobId);
  const total = invoiceTotal(invoice);
  const paid = invoice.status === 'paid';
  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={paid ? `Receipt · ${invoice.ref}` : `Invoice ${invoice.ref}`}
      description={job ? `${job.title} · ${job.ref}` : undefined}
      footer={
        <>
          <Button variant="outline" icon={<Download className="size-4" />} onClick={() => toast({ title: 'PDF downloaded', description: `${invoice.ref}.pdf saved (demo — no file is created).`, tone: 'info' })}>
            Download PDF
          </Button>
          {isOutstanding(invoice) ? (
            <Button icon={<CreditCard className="size-4" />} onClick={() => onPay(invoice.id)}>
              Pay {money(total, true)}
            </Button>
          ) : (
            <Button variant="dark" onClick={onClose}>
              Close
            </Button>
          )}
        </>
      }
    >
      <DocumentPreview kind="invoice" doc={invoice} customer={customer} />
    </Modal>
  );
}

type PayPhase = 'form' | 'processing' | 'success';

/** Mounts a fresh payment dialog for each invoice it is opened for. */
function PaymentModal({ invoiceId, onClose, onViewReceipt }: { invoiceId: string | null; onClose: () => void; onViewReceipt: (id: string) => void }) {
  return invoiceId ? <PaymentDialog key={invoiceId} invoiceId={invoiceId} onClose={onClose} onViewReceipt={onViewReceipt} /> : null;
}

function PaymentDialog({ invoiceId, onClose, onViewReceipt }: { invoiceId: string; onClose: () => void; onViewReceipt: (id: string) => void }) {
  const { state, actions } = useDemo();
  const toast = useToast();
  const [phase, setPhase] = useState<PayPhase>('form');
  const phaseRef = useRef<PayPhase>('form');
  const timer = useRef<number | undefined>(undefined);
  const doneRef = useRef<HTMLButtonElement>(null);
  phaseRef.current = phase;
  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => {
    if (phase === 'success') window.setTimeout(() => doneRef.current?.focus(), 50);
  }, [phase]);
  const close = useCallback(() => {
    if (phaseRef.current !== 'processing') onClose();
  }, [onClose]);

  const invoice = getInvoice(state.data, invoiceId);
  if (!invoice) return null;
  const customer = getCustomer(state.data, invoice.customerId);
  const job = getJob(state.data, invoice.jobId);
  const total = invoiceTotal(invoice);
  const holder = customer?.name ?? 'Card holder';

  const pay = () => {
    setPhase('processing');
    const id = invoice.id;
    timer.current = window.setTimeout(() => {
      actions.markInvoicePaid(id, 'Card (online)', 'customer');
      setPhase('success');
      toast({ title: 'Payment received', description: `${money(total, true)} paid for ${invoice.ref}. Thank you!` });
    }, 1200);
  };

  const field = (label: string, value: string, extra?: string) => (
    <label className={cx('block', extra)}>
      <span className="mb-1.5 block text-[13px] font-semibold text-ink-2">{label}</span>
      <input readOnly value={value} className={cx(inputClass, 'bg-subtle text-ink-2')} />
    </label>
  );

  return (
    <Modal
      open
      onClose={close}
      size="md"
      title={phase === 'success' ? 'Payment complete' : `Pay invoice ${invoice.ref}`}
      description={phase === 'success' ? undefined : `Secure payment to ${state.config.company.companyName}`}
      footer={
        phase === 'form' ? (
          <>
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button size="lg" icon={<Lock className="size-4" />} onClick={pay} data-autofocus>
              Pay {money(total, true)}
            </Button>
          </>
        ) : phase === 'success' ? (
          <>
            <Button variant="outline" icon={<ReceiptText className="size-4" />} onClick={() => onViewReceipt(invoice.id)}>
              View receipt
            </Button>
            <Button ref={doneRef} onClick={close}>
              Done
            </Button>
          </>
        ) : undefined
      }
    >
      {phase === 'form' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-xl bg-canvas p-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Amount due</p>
              <p className="truncate text-sm text-ink-2">{job?.title ?? invoice.ref}</p>
              <p className="text-[13px] text-muted">{invoice.dueDate ? `Due ${dayMonthYear(invoice.dueDate)}` : 'Due within 14 days'}</p>
            </div>
            <p className="tabular font-display text-3xl font-extrabold text-ink">{money(total, true)}</p>
          </div>
          <div className="flex items-start gap-2.5 rounded-xl border border-dashed border-warning bg-warning-soft p-3.5 text-sm text-warning-ink">
            <ShieldCheck className="mt-0.5 size-4.5 shrink-0" aria-hidden />
            <div>
              <p className="font-semibold">Demo payment — no card needed</p>
              <p className="mt-0.5 opacity-90">Nothing is charged. The card below is pre-filled test data.</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-[13px] font-semibold text-ink-2">Card number</span>
              <span className="relative block">
                <CreditCard className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-muted" aria-hidden />
                <input readOnly value="•••• •••• •••• 4242" className={cx(inputClass, 'tabular bg-subtle pl-10 pr-16 tracking-wider text-ink-2')} />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded bg-surface px-1.5 py-0.5 text-[10px] font-extrabold tracking-wider text-primary-ink ring-1 ring-line" aria-hidden>
                  VISA
                </span>
              </span>
            </label>
            {field('Expiry', '12 / 28')}
            {field('Security code', '•••')}
            {field('Name on card', holder, 'sm:col-span-2')}
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <Lock className="size-3.5" aria-hidden /> Payments are encrypted and processed securely (simulated in this demo).
          </p>
        </div>
      )}
      {phase === 'processing' && (
        <div role="status" aria-live="polite" className="flex flex-col items-center py-10 text-center">
          <span className="grid size-16 place-items-center rounded-full bg-secondary-soft">
            <Loader2 className="size-8 animate-spin text-secondary-ink" aria-hidden />
          </span>
          <p className="mt-4 font-display text-lg font-bold text-ink">Processing payment…</p>
          <p className="mt-1 text-sm text-muted">Confirming {money(total, true)} with your bank (demo)</p>
        </div>
      )}
      {phase === 'success' && (
        <div role="status" aria-live="polite" className="text-center">
          <span className="relative mx-auto mt-2 grid size-20 animate-pop place-items-center rounded-full bg-success-soft text-success-ink">
            <span className="absolute inset-0 animate-pulse-ring rounded-full bg-success/25" aria-hidden />
            <CheckCircle2 className="relative size-11" aria-hidden />
          </span>
          <p className="mt-4 font-display text-2xl font-extrabold text-ink">Payment received</p>
          <p className="mt-1 text-sm text-muted">
            Thank you{customer ? `, ${customer.name.split(' ')[0]}` : ''} — {state.config.company.companyName} has been notified.
          </p>
          <dl className="mt-5 divide-y divide-line rounded-xl border border-line text-left text-sm">
            {[
              ['Receipt', `RCPT-${invoice.ref.replace(/\D/g, '')}`],
              ['Invoice', invoice.ref],
              ['Amount paid', money(total, true)],
              ['Paid', invoice.paidAt ? `${dayMonthYear(invoice.paidAt)} at ${time(invoice.paidAt)}` : 'Just now'],
              ['Method', 'Card (online) •••• 4242'],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-4 px-4 py-2.5">
                <dt className="text-muted">{k}</dt>
                <dd className="font-semibold text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-muted">A copy of your receipt has been emailed to {customer?.email ?? 'you'} (demo — nothing is sent).</p>
        </div>
      )}
    </Modal>
  );
}

/** Shared "View invoice" + "Pay now" dialogs. Render `dialogs` once in the page. */
export function useInvoiceDialogs() {
  const [payId, setPayId] = useState<string | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const closePay = useCallback(() => setPayId(null), []);
  const closeView = useCallback(() => setViewId(null), []);
  const openPay = useCallback((id: string) => {
    setViewId(null);
    setPayId(id);
  }, []);
  const openView = useCallback((id: string) => {
    setPayId(null);
    setViewId(id);
  }, []);
  const dialogs = (
    <>
      <PaymentModal invoiceId={payId} onClose={closePay} onViewReceipt={openView} />
      <InvoiceViewModal invoiceId={viewId} onClose={closeView} onPay={openPay} />
    </>
  );
  return { openPay, openView, dialogs };
}
