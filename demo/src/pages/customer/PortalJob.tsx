import { Link, useParams } from 'react-router-dom';
import { Activity, CalendarCheck, CalendarPlus, Camera, CheckCircle2, Circle, ClipboardList, CreditCard, FileText, Loader2, MapPin, MessageSquare, ReceiptText, SearchX, ShieldCheck, Timer, TriangleAlert, Truck } from 'lucide-react';
import type { Invoice, Job } from '../../types/domain';
import { getCustomer, getInvoice, getJob, getQuote, invoiceTotal, jobAddress, jobEstimatedMinutes, jobProgress, quoteTotal } from '../../app/selectors';
import { dayMonthYear, duration, longDate, money, relativeDay, time, timeRange } from '../../utils/format';
import { cx } from '../../utils/cx';
import { Button, LinkButton } from '../../components/common/Button';
import { Card, CardHeader, EmptyState, KeyValue, ProgressBar } from '../../components/common/Card';
import { ServiceBadge } from '../../components/common/Badge';
import { useToast } from '../../components/common/Toast';
import { EvidenceGrid } from '../../components/shared/EvidenceGrid';
import { BeforeAfterPair } from '../../components/public/PublicBits';
import {
  CrewList,
  DateTile,
  etaFor,
  InvoiceStatusBadge,
  JobStatusBadge,
  jobSteps,
  liveStep,
  MessageThread,
  PortalHeading,
  QuoteStatusBadge,
  StepTimeline,
  useInvoiceDialogs,
  usePortal,
} from '../../components/customer/PortalUi';

export default function PortalJob() {
  const { id } = useParams();
  const { data, actions, customer, name, email, company } = usePortal();
  const { openPay, openView, dialogs } = useInvoiceDialogs();
  const job = getJob(data, id);

  if (!job) {
    return (
      <div className="py-8">
        <EmptyState
          icon={SearchX}
          title="We couldn’t find that job"
          text="It may have been removed, or it belongs to a different account."
          action={<LinkButton to="/portal/jobs">Back to my jobs</LinkButton>}
        />
      </div>
    );
  }

  const owner = getCustomer(data, job.customerId);
  const invoice = getInvoice(data, job.invoiceId);
  const issued = invoice && invoice.status !== 'draft' ? invoice : undefined;
  const steps = jobSteps(data, job);
  const live = liveStep(job);
  const prog = jobProgress(data, job);
  const evidence = data.evidence.filter((e) => e.jobId === job.id && e.type !== 'receipt').sort((a, b) => (a.at < b.at ? -1 : 1));
  const before = evidence.find((e) => e.type === 'before');
  const after = evidence.find((e) => e.type === 'after');
  const author = owner?.name ?? (customer?.name || name);
  const mismatch = !!owner && owner.email.toLowerCase() !== email;

  const liveNode =
    live?.key === 'onway' ? (
      <div className="mt-3 flex items-center gap-3 rounded-xl border border-line bg-canvas p-3.5 text-sm">
        <Truck className="size-5 shrink-0 text-secondary-ink" aria-hidden />
        <p className="text-ink-2">
          Arriving around <span className="font-semibold text-ink">{etaFor(job)}</span> — we’ll text you if anything changes.
        </p>
      </div>
    ) : live ? (
      <div className="mt-3 rounded-xl border border-line bg-canvas p-3.5">
        {job.status === 'blocked' && (
          <p className="mb-3 flex items-start gap-2 rounded-lg bg-warning-soft p-2.5 text-[13px] text-warning-ink">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              <span className="font-semibold">Briefly paused:</span> {job.blockedReason ?? 'waiting for a part'} — we’ll be back to finish as soon as possible.
            </span>
          </p>
        )}
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-ink">
            {prog.done} of {prog.total} tasks done
          </span>
          <span className="tabular font-bold text-secondary-ink">{prog.pct}%</span>
        </div>
        <ProgressBar value={prog.pct} className="mt-2" label="Work progress" tone={job.status === 'blocked' ? 'amber' : 'brand'} />
        {prog.tasks.length > 0 && (
          <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {prog.tasks.map((t) => (
              <li key={t.id} className="flex items-center gap-2 text-[13px]">
                {t.status === 'completed' ? (
                  <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />
                ) : t.status === 'in-progress' ? (
                  <Loader2 className="size-4 shrink-0 animate-spin text-secondary-ink" aria-hidden />
                ) : (
                  <Circle className="size-4 shrink-0 text-line-2" aria-hidden />
                )}
                <span className={cx('truncate', t.status === 'completed' ? 'text-ink-2' : 'text-muted')}>{t.title}</span>
                <span className="sr-only">{t.status === 'completed' ? '(done)' : t.status === 'in-progress' ? '(in progress)' : '(to do)'}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    ) : undefined;

  return (
    <>
      <PortalHeading
        back={{ to: '/portal/jobs', label: 'My jobs' }}
        eyebrow={
          <div className="flex flex-wrap items-center gap-2">
            <ServiceBadge service={job.service} />
            <span className="text-[13px] font-semibold text-muted">{job.ref}</span>
          </div>
        }
        title={job.title}
        subtitle={
          <span className="inline-flex items-start gap-1.5">
            <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
            {jobAddress(data, job)}
          </span>
        }
        actions={<JobStatusBadge job={job} className="h-7 px-3 text-[13px]" />}
      />

      {mismatch && owner && (
        <div className="mb-6 flex flex-col gap-3 rounded-card border border-dashed border-warning bg-warning-soft p-4 text-sm text-warning-ink sm:flex-row sm:items-center sm:justify-between">
          <p>
            This job belongs to <span className="font-bold">{owner.name}</span> — you’re viewing the portal as {name}.
          </p>
          <Button size="sm" variant="outline" onClick={() => actions.setPersona({ portalCustomerKey: owner.email })}>
            View as {owner.name.split(' ')[0]}
          </Button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="min-w-0 space-y-6">
          <Card className="animate-rise">
            <CardHeader title="Job status" subtitle={live ? 'Live updates from your technician' : 'Every step of your job, as it happens'} icon={Activity} />
            <StepTimeline steps={steps} live={live} liveNode={liveNode} />
          </Card>

          <div className="space-y-6 lg:hidden">
            <VisitCard job={job} />
            {issued && <InvoicePanel invoice={issued} onPay={openPay} onView={openView} />}
          </div>

          <Card>
            <CardHeader title="Before & after" subtitle={evidence.length ? `${evidence.length} ${evidence.length === 1 ? 'photo' : 'photos'} from your technician` : 'Photos are added as the work happens'} icon={Camera} />
            {before && after && <BeforeAfterPair before={before.url} after={after.url} title={after.caption ?? job.title} className="mb-4 max-w-xl" />}
            <EvidenceGrid items={evidence} cols="grid-cols-2 sm:grid-cols-3" empty="Your technician will add before and after photos during the visit." />
          </Card>

          <Card>
            <CardHeader
              title="Messages"
              subtitle={`Chat with ${company.companyName} about this job`}
              icon={MessageSquare}
              action={
                <Link to={`/portal/messages?job=${job.id}`} className="text-[13px] font-semibold text-secondary-ink hover:underline">
                  All messages
                </Link>
              }
            />
            <MessageThread job={job} author={author} />
          </Card>
        </div>

        <aside className="space-y-6" aria-label="Visit details">
          <div className="hidden space-y-6 lg:block">
            <VisitCard job={job} />
            {issued && <InvoicePanel invoice={issued} onPay={openPay} onView={openView} />}
          </div>
          <SummaryCard job={job} />
        </aside>
      </div>
      {dialogs}
    </>
  );
}

function VisitCard({ job }: { job: Job }) {
  const { data } = usePortal();
  const toast = useToast();
  const crew = job.assignedWorkerIds;
  const status = job.status;
  const onSite = status === 'in-progress' || status === 'blocked';
  const done = ['completed', 'invoiced', 'closed'].includes(status);
  const mins = jobEstimatedMinutes(data, job);
  return (
    <Card>
      <CardHeader title={crew.length > 1 ? 'Your technicians' : 'Your technician'} icon={ShieldCheck} />
      <CrewList ids={crew} />
      {crew.length > 0 && (
        <p className={cx('mt-3 rounded-lg px-3 py-2 text-[13px] font-semibold', onSite ? 'bg-success-soft text-success-ink' : job.onTheWayAt && !done ? 'bg-secondary-soft text-secondary-ink' : 'bg-subtle text-ink-2')}>
          {done
            ? `Visit completed ${job.completedAt ? `at ${time(job.completedAt)}` : ''}`.trim()
            : onSite
              ? `On site since ${time(job.startedAt) || 'this morning'}`
              : job.onTheWayAt
                ? `On the way — arriving around ${etaFor(job)}`
                : 'All our technicians are ID-checked and fully insured'}
        </p>
      )}

      <div className="mt-5 border-t border-line pt-5">
        <p className="mb-3 flex items-center gap-2 text-[15px] font-bold text-ink">
          <CalendarCheck className="size-4.5 text-secondary-ink" aria-hidden /> Appointment
        </p>
        {job.scheduledStart ? (
          <div className="flex items-start gap-4">
            <DateTile iso={job.scheduledStart} />
            <div className="min-w-0 text-sm">
              <p className="font-semibold text-ink">{longDate(job.scheduledStart)}</p>
              <p className="text-ink-2">Arrival window {timeRange(job.scheduledStart, job.scheduledEnd)}</p>
              {mins > 0 && (
                <p className="mt-1 flex items-center gap-1.5 text-[13px] text-muted">
                  <Timer className="size-3.5" aria-hidden /> About {duration(mins)} on site
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">We’ll confirm a date and time with you shortly.</p>
        )}
        {job.scheduledStart && !done && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<CalendarPlus className="size-3.5" />}
              onClick={() => toast({ title: 'Added to your calendar', description: `${longDate(job.scheduledStart)} · ${timeRange(job.scheduledStart, job.scheduledEnd)} (demo invite).` })}
            >
              Add to calendar
            </Button>
            <LinkButton to={`/portal/messages?job=${job.id}`} variant="ghost" size="sm">
              Reschedule
            </LinkButton>
          </div>
        )}
      </div>
    </Card>
  );
}

function InvoicePanel({ invoice, onPay, onView }: { invoice: Invoice; onPay: (id: string) => void; onView: (id: string) => void }) {
  const total = invoiceTotal(invoice);
  const paid = invoice.status === 'paid';
  return (
    <Card className={cx('animate-rise', !paid && 'ring-2 ring-secondary-tint')}>
      <CardHeader title="Invoice" subtitle={invoice.ref} icon={ReceiptText} action={<InvoiceStatusBadge status={invoice.status} />} />
      <p className="tabular font-display text-[34px] font-extrabold leading-none text-ink">{money(total, true)}</p>
      {paid ? (
        <p className="mt-2.5 flex items-center gap-1.5 text-sm font-semibold text-success-ink">
          <CheckCircle2 className="size-4.5" aria-hidden /> Paid on {dayMonthYear(invoice.paidAt)}
          {invoice.method ? ` · ${invoice.method}` : ''}
        </p>
      ) : (
        <p className="mt-2 text-sm text-ink-2">
          Issued {dayMonthYear(invoice.issuedAt)} · due {invoice.dueDate ? dayMonthYear(invoice.dueDate) : 'within 14 days'}
        </p>
      )}
      <div className="mt-4 grid gap-2">
        {!paid && (
          <Button size="lg" full icon={<CreditCard className="size-4.5" />} onClick={() => onPay(invoice.id)}>
            Pay {money(total, true)}
          </Button>
        )}
        <Button variant="outline" full icon={<FileText className="size-4" />} onClick={() => onView(invoice.id)}>
          {paid ? 'View receipt' : 'View invoice'}
        </Button>
      </div>
    </Card>
  );
}

function SummaryCard({ job }: { job: Job }) {
  const { data } = usePortal();
  const quote = getQuote(data, job.quoteId);
  return (
    <Card>
      <CardHeader title="Job summary" icon={ClipboardList} />
      <dl className="space-y-4">
        {job.instructions && <KeyValue label="What we’re doing">{job.instructions}</KeyValue>}
        <KeyValue label="Address">{jobAddress(data, job)}</KeyValue>
        {quote && quote.status !== 'draft' && (
          <KeyValue label="Quote">
            <span className="flex flex-wrap items-center gap-2">
              <Link to={`/portal/quotes/${quote.id}`} className="font-semibold text-secondary-ink hover:underline">
                {quote.ref} · {money(quoteTotal(quote))}
              </Link>
              <QuoteStatusBadge status={quote.status} />
            </span>
          </KeyValue>
        )}
        {!quote && job.quotedAmount !== undefined && <KeyValue label="Agreed price">{money(job.quotedAmount)}</KeyValue>}
        <KeyValue label="Booked">{relativeDay(job.createdAt) === 'Today' ? 'Today' : dayMonthYear(job.createdAt)}</KeyValue>
        <KeyValue label="Reference">{job.ref}</KeyValue>
      </dl>
    </Card>
  );
}
