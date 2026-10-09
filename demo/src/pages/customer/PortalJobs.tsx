import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, ChevronRight, ClipboardCheck, History, Repeat, Sparkles } from 'lucide-react';
import type { HistoryItem, Job } from '../../types/domain';
import { getInvoice, invoiceTotal, jobProgress } from '../../app/selectors';
import { dayMonthYear, money, relativeDay, timeRange } from '../../utils/format';
import { LinkButton } from '../../components/common/Button';
import { ProgressBar } from '../../components/common/Card';
import { ServiceBadge } from '../../components/common/Badge';
import {
  CrewFaces,
  groupJobs,
  JobStatusBadge,
  liveStep,
  LivePill,
  PortalHeading,
  PortalNoAccount,
  PortalPending,
  RecurringPlanCard,
  SectionTitle,
  ServiceTile,
  usePortal,
} from '../../components/customer/PortalUi';

export default function PortalJobs() {
  const { customer, lead, jobs } = usePortal();
  if (!customer) return lead ? <PortalPending what="Your jobs" /> : <PortalNoAccount />;
  const g = groupJobs(jobs);
  const plans = customer.recurring ?? [];
  const history = [...customer.history].sort((a, b) => (a.date < b.date ? 1 : -1));
  const sections = [
    { id: 'active', label: 'Active', count: g.active.length },
    { id: 'upcoming', label: 'Upcoming', count: g.upcoming.length },
    { id: 'completed', label: 'Completed', count: g.done.length + history.length },
    { id: 'recurring', label: 'Recurring', count: plans.length },
  ];
  const jump = (id: string) => document.getElementById(`portal-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <>
      <PortalHeading title="My jobs" subtitle={`Every visit to ${customer.address}, ${customer.town} — past, present and planned.`} />

      <div className="no-scrollbar -mx-1 mb-7 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Jump to section">
        {sections.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => jump(s.id)}
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full border border-line-2 bg-surface px-3.5 text-[13px] font-semibold text-ink-2 transition hover:border-muted hover:text-ink"
          >
            {s.label}
            <span className="rounded-full bg-subtle px-1.5 text-[11px] text-muted">{s.count}</span>
          </button>
        ))}
      </div>

      <div className="space-y-10">
        <section id="portal-active" aria-labelledby="h-active" className="scroll-mt-32">
          <SectionTitle id="h-active" title="Active" count={g.active.length} subtitle="In progress or happening today" />
          <JobList jobs={g.active} empty="Nothing in progress right now." />
        </section>

        <section id="portal-upcoming" aria-labelledby="h-upcoming" className="scroll-mt-32">
          <SectionTitle id="h-upcoming" title="Upcoming" count={g.upcoming.length} subtitle="Booked or being arranged" />
          <JobList
            jobs={g.upcoming}
            empty="No other visits booked."
            action={
              <LinkButton to="/quote" variant="soft" size="sm" icon={<Sparkles className="size-3.5" />}>
                Book another service
              </LinkButton>
            }
          />
        </section>

        <section id="portal-completed" aria-labelledby="h-completed" className="scroll-mt-32">
          <SectionTitle id="h-completed" title="Completed" count={g.done.length + history.length} subtitle="Finished work, photos and receipts" />
          <JobList jobs={g.done} empty={history.length ? '' : 'Completed jobs will appear here.'} />
          {history.length > 0 && <EarlierVisits items={history} />}
        </section>

        <section id="portal-recurring" aria-labelledby="h-recurring" className="scroll-mt-32">
          <SectionTitle id="h-recurring" title="Recurring" count={plans.length} subtitle="Regular visits — skip or pause any time" />
          {plans.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {plans.map((p) => (
                <RecurringPlanCard key={`${p.service}-${p.label}`} plan={p} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-start gap-3 rounded-card border border-dashed border-line-2 bg-surface/60 p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2.5 text-sm text-muted">
                <Repeat className="size-5 shrink-0" aria-hidden /> No recurring plan yet — regular window and gutter cleans keep your home looking its best.
              </p>
              <LinkButton to="/quote?service=window" variant="outline" size="sm">
                Set up a plan
              </LinkButton>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function JobList({ jobs, empty, action }: { jobs: Job[]; empty: string; action?: ReactNode }) {
  if (!jobs.length) {
    if (!empty) return null;
    return (
      <div className="flex flex-col items-start gap-3 rounded-card border border-dashed border-line-2 bg-surface/60 p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2.5 text-sm text-muted">
          <CalendarClock className="size-5 shrink-0" aria-hidden /> {empty}
        </p>
        {action}
      </div>
    );
  }
  return (
    <ul className="grid gap-3">
      {jobs.map((j) => (
        <li key={j.id}>
          <PortalJobCard job={j} />
        </li>
      ))}
    </ul>
  );
}

function PortalJobCard({ job }: { job: Job }) {
  const { data } = usePortal();
  const prog = jobProgress(data, job);
  const live = liveStep(job);
  const invoice = getInvoice(data, job.invoiceId);
  const when = job.completedAt
    ? `Completed ${relativeDay(job.completedAt).toLowerCase() === 'today' ? 'today' : dayMonthYear(job.completedAt)}`
    : job.scheduledStart
      ? `${relativeDay(job.scheduledStart)} · ${timeRange(job.scheduledStart, job.scheduledEnd)}`
      : 'Time to be confirmed';
  return (
    <Link
      to={`/portal/jobs/${job.id}`}
      className="card group flex flex-col gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-raised sm:flex-row sm:items-center sm:p-5"
      aria-label={`${job.title}, ${job.ref}. ${when}. View job`}
    >
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <ServiceTile service={job.service} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display text-base font-bold text-ink">{job.title}</p>
            <JobStatusBadge job={job} />
            {live && <LivePill label={live.label} tone={live.tone} />}
          </div>
          <p className="mt-0.5 text-[13px] text-muted">
            {job.ref} · {when}
          </p>
          {live?.key === 'started' && (
            <div className="mt-2.5 flex max-w-sm items-center gap-3">
              <ProgressBar value={prog.pct} label="Work progress" tone={live.tone === 'warning' ? 'amber' : 'brand'} />
              <span className="tabular shrink-0 text-xs font-semibold text-ink-2">{prog.pct}% done</span>
            </div>
          )}
          {invoice && invoice.status !== 'draft' && (
            <p className="mt-1.5 text-[13px] text-ink-2">
              Invoice {invoice.ref} · {money(invoiceTotal(invoice), true)} {invoice.status === 'paid' ? '· paid' : '· ready to pay'}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-line pt-3 sm:justify-end sm:border-0 sm:pt-0">
        <CrewFaces ids={job.assignedWorkerIds} />
        <span className="inline-flex shrink-0 items-center gap-0.5 text-sm font-semibold text-secondary-ink">
          View
          <ChevronRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

function EarlierVisits({ items }: { items: HistoryItem[] }) {
  return (
    <div className="card mt-4 p-4 sm:p-5">
      <p className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">
        <History className="size-4 text-muted" aria-hidden /> Earlier visits
      </p>
      <ul className="divide-y divide-line">
        {items.slice(0, 8).map((h, i) => (
          <li key={`${h.date}-${i}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 py-2.5 text-sm">
            <span className="flex min-w-0 items-center gap-2.5">
              <ClipboardCheck className="size-4 shrink-0 text-success" aria-hidden />
              <span className="min-w-0">
                <span className="block truncate font-medium text-ink">{h.title}</span>
                <span className="block text-xs text-muted">{dayMonthYear(h.date)}</span>
              </span>
            </span>
            <span className="flex items-center gap-3">
              <ServiceBadge service={h.service} short />
              <span className="tabular w-16 text-right font-semibold text-ink-2">{money(h.value)}</span>
            </span>
          </li>
        ))}
      </ul>
      {items.length > 8 && <p className="mt-2 text-xs text-muted">+ {items.length - 8} more visits on record</p>}
    </div>
  );
}
