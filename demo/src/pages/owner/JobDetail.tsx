import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  Camera,
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  Mail,
  MapPin,
  Package,
  PauseCircle,
  Phone,
  Play,
  PoundSterling,
  ReceiptText,
  Send,
  Smartphone,
  Sparkles,
  TriangleAlert,
  Users,
} from 'lucide-react';
import type { Task } from '../../types/domain';
import { useDemo } from '../../app/DemoProvider';
import { getCustomer, getInvoice, getQuote, invoiceTotal, jobAddress, jobCosts, jobCustomerLabel, jobEstimatedMinutes, jobProgress, quoteTotal, tasksForJob } from '../../app/selectors';
import { Card, CardHeader, EmptyState, KeyValue, ProgressBar } from '../../components/common/Card';
import { Button, LinkButton } from '../../components/common/Button';
import { PriorityBadge, ServiceBadge, StatusBadge } from '../../components/common/Badge';
import { AvatarStack, WorkerAvatar } from '../../components/common/Avatar';
import { Tabs } from '../../components/common/Tabs';
import { Timeline } from '../../components/common/Timeline';
import { ConfirmDialog } from '../../components/common/Modal';
import { useToast } from '../../components/common/Toast';
import { AddIssueDialog, AddMaterialDialog, AddTimeDialog, BlockJobDialog, EvidenceDialog, ScheduleJobDialog } from '../../components/shared/JobActionDialogs';
import { EvidenceGrid } from '../../components/shared/EvidenceGrid';
import { DocumentPreview } from '../../components/shared/DocumentPreview';
import { cx } from '../../utils/cx';
import { duration, longDate, money, relativeDay, time, timeRange } from '../../utils/format';
import type { ReactNode } from 'react';

type Tab = 'overview' | 'tasks' | 'timeline' | 'costs' | 'evidence' | 'messages' | 'invoice';
type Dialog = null | 'time' | 'material' | 'issue' | 'evidence' | 'block' | 'schedule' | 'complete';

const OFFICE = 'w-sophie';

export default function JobDetail() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const { state, actions } = useDemo();
  const navigate = useNavigate();
  const toast = useToast();
  const d = state.data;
  const job = d.jobs.find((j) => j.id === id);
  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) ?? 'overview');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [taskForDialog, setTaskForDialog] = useState<string | undefined>();
  const [msg, setMsg] = useState('');
  useEffect(() => {
    const t = params.get('tab') as Tab | null;
    if (t) setTab(t);
  }, [params]);

  if (!job) return <EmptyState icon={BriefcaseBusiness} title="Job not found" action={<LinkButton to="/app/jobs">Back to jobs</LinkButton>} />;

  const customer = getCustomer(d, job.customerId);
  const tasks = tasksForJob(d, job.id);
  const prog = jobProgress(d, job);
  const est = jobEstimatedMinutes(d, job);
  const costs = jobCosts(d, job);
  const quote = getQuote(d, job.quoteId);
  const invoice = getInvoice(d, job.invoiceId);
  const evidence = d.evidence.filter((e) => e.jobId === job.id);
  const openIssues = job.issues.filter((i) => !i.resolved);
  const value = invoice ? invoiceTotal(invoice) : quote ? quoteTotal(quote) : job.quotedAmount ?? 0;
  const margin = value - costs.total;
  const isDone = ['completed', 'invoiced', 'closed'].includes(job.status);
  const openTasks = tasks.filter((t) => t.status !== 'completed').length;
  const worker = job.assignedWorkerIds[0];
  const variance = costs.minutes - est;

  const changeTab = (t: Tab) => {
    setTab(t);
    setParams(t === 'overview' ? {} : { tab: t }, { replace: true });
  };

  const start = () => {
    actions.updateJobStatus(job.id, 'in-progress', undefined, worker ?? OFFICE);
    toast({ title: 'Job started', description: job.title });
  };
  const complete = () => {
    actions.updateJobStatus(job.id, 'completed', undefined, worker ?? OFFICE);
    toast({ title: 'Job completed', description: `${job.title} — ready to invoice`, action: { label: 'Create invoice', to: `/app/jobs/${job.id}?tab=invoice` } });
  };
  const createInvoice = () => {
    actions.createInvoice(job.id);
    changeTab('invoice');
    toast({ title: 'Draft invoice created', description: `From ${quote ? quote.ref : 'job value'} — review and send.` });
  };
  const openWorker = () => {
    actions.setPersona({ persona: 'worker', workerId: worker ?? 'w-maya' });
    navigate(`/worker/jobs/${job.id}`);
  };
  const toggleTask = (t: Task) => {
    actions.updateTaskStatus(t.id, t.status === 'completed' ? 'ready' : 'completed', t.assignedWorkerId ?? OFFICE);
  };

  const aiSummary = (() => {
    const parts: string[] = [];
    if (job.status === 'scheduled') parts.push(`${job.title} is booked for ${relativeDay(job.scheduledStart).toLowerCase()} ${timeRange(job.scheduledStart, job.scheduledEnd)} with ${job.assignedWorkerIds.map((w) => d.team.find((m) => m.id === w)?.firstName).join(' & ')}.`);
    if (job.status === 'in-progress') parts.push(`In progress — ${prog.done} of ${prog.total} tasks done.`);
    if (job.status === 'blocked') parts.push(`Blocked: ${job.blockedReason}.`);
    if (isDone) parts.push(`Completed in ${duration(costs.minutes)} against an estimate of ${duration(est)}.`);
    if (variance > 5) parts.push(`Running ${duration(variance)} over estimate${job.issues.length ? ` because of ${job.issues[job.issues.length - 1].title.toLowerCase()}` : ''}.`);
    if (job.issues.length) parts.push(`${job.issues.length} issue${job.issues.length > 1 ? 's' : ''} recorded${openIssues.length ? `, ${openIssues.length} still open` : ', all resolved on site'}.`);
    if (evidence.length) parts.push(`${evidence.length} photo${evidence.length > 1 ? 's' : ''} on file for the customer.`);
    if (quote) parts.push(`Quote ${quote.ref} (${money(quoteTotal(quote))}) is ${quote.status}.`);
    if (job.status === 'completed' && !invoice) parts.push('Next step: create and send the invoice.');
    if (invoice) parts.push(`Invoice ${invoice.ref} is ${invoice.status}.`);
    if (margin > 0 && isDone) parts.push(`Estimated margin ${money(margin)}.`);
    return parts.join(' ');
  })();

  return (
    <div className="space-y-6">
      <Link to="/app/jobs" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> All jobs
      </Link>

      {/* Header */}
      <div className="card overflow-hidden">
        <div className="h-1.5" style={{ background: state.config.services.find((s) => s.id === job.service)!.color }} aria-hidden />
        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge kind="job" status={job.status} />
                <ServiceBadge service={job.service} />
                <span className="text-xs font-semibold text-muted">{job.ref}</span>
              </div>
              <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink md:text-[28px]">{job.title}</h1>
              <div className="mt-2 flex flex-col gap-1.5 text-sm text-ink-2 md:flex-row md:flex-wrap md:gap-x-5">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="size-4 text-muted" aria-hidden />
                  {customer ? (
                    <Link to={`/app/customers/${customer.id}`} className="font-semibold hover:text-secondary-ink">
                      {customer.name}
                    </Link>
                  ) : (
                    jobCustomerLabel(d, job)
                  )}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-4 text-muted" aria-hidden /> {jobAddress(d, job)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-4 text-muted" aria-hidden /> {job.scheduledStart ? `${longDate(job.scheduledStart)} · ${timeRange(job.scheduledStart, job.scheduledEnd)}` : 'Not scheduled'}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 xl:justify-end">
              <Button variant="ghost" icon={<Smartphone className="size-4" />} onClick={openWorker}>
                Worker view
              </Button>
              {['new', 'quoted', 'scheduled'].includes(job.status) && (
                <>
                  <Button variant="outline" icon={<CalendarDays className="size-4" />} onClick={() => setDialog('schedule')}>
                    {job.scheduledStart ? 'Reschedule' : 'Schedule'}
                  </Button>
                  <Button icon={<Play className="size-4" />} onClick={start}>
                    Start Job
                  </Button>
                </>
              )}
              {job.status === 'in-progress' && (
                <>
                  <Button variant="outline" className="text-danger-ink" icon={<PauseCircle className="size-4" />} onClick={() => setDialog('block')}>
                    Mark Blocked
                  </Button>
                  <Button icon={<CheckCircle2 className="size-4" />} onClick={() => (openTasks ? setDialog('complete') : complete())}>
                    Complete
                  </Button>
                </>
              )}
              {job.status === 'blocked' && (
                <>
                  <Button variant="outline" icon={<CheckCircle2 className="size-4" />} onClick={() => setDialog('complete')}>
                    Complete
                  </Button>
                  <Button
                    icon={<Play className="size-4" />}
                    onClick={() => {
                      actions.updateJobStatus(job.id, 'in-progress', undefined, worker ?? OFFICE);
                      toast({ title: 'Job resumed', description: 'Blocking issue marked resolved.' });
                    }}
                  >
                    Resume
                  </Button>
                </>
              )}
              {job.status === 'completed' && !invoice && job.customerId && (
                <Button icon={<ReceiptText className="size-4" />} onClick={createInvoice}>
                  Create Invoice
                </Button>
              )}
              {invoice && invoice.status === 'draft' && (
                <Button icon={<Send className="size-4" />} onClick={() => { actions.sendInvoice(invoice.id); toast({ title: 'Invoice sent', description: `${invoice.ref} emailed to the customer (demo)` }); }}>
                  Send Invoice
                </Button>
              )}
              {invoice && ['sent', 'due', 'overdue'].includes(invoice.status) && (
                <Button icon={<PoundSterling className="size-4" />} onClick={() => { actions.markInvoicePaid(invoice.id, 'Bank transfer'); toast({ title: 'Marked paid', description: `${invoice.ref} · ${money(invoiceTotal(invoice))}` }); }}>
                  Mark Paid
                </Button>
              )}
              {job.status === 'closed' && (
                <span className="inline-flex h-10 items-center gap-2 rounded-control bg-success-soft px-4 text-sm font-bold text-success-ink">
                  <CheckCircle2 className="size-4" aria-hidden /> Paid & closed
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {openIssues.length > 0 && (
        <div className="flex flex-col gap-3 rounded-card border border-danger/25 bg-danger-soft p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 size-5 shrink-0 text-danger-ink" aria-hidden />
            <div>
              <p className="font-bold text-ink">{openIssues[0].title}</p>
              <p className="text-sm text-ink-2">{openIssues[0].detail ?? job.blockedReason}</p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => { actions.resolveIssue(job.id, openIssues[0].id); toast({ title: 'Issue resolved' }); }}>
            Mark resolved
          </Button>
        </div>
      )}

      <Tabs<Tab>
        label="Job sections"
        value={tab}
        onChange={changeTab}
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'tasks', label: 'Tasks', count: tasks.length },
          { id: 'timeline', label: 'Timeline', count: job.timeline.length },
          { id: 'costs', label: 'Time & Costs' },
          { id: 'evidence', label: 'Evidence', count: evidence.length },
          { id: 'messages', label: 'Messages', count: job.messages.length },
          { id: 'invoice', label: 'Quote / Invoice' },
        ]}
      />

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <MiniCard label="Progress" value={`${prog.pct}%`} sub={`${prog.done} of ${prog.total} tasks`}>
              <ProgressBar value={prog.pct} className="mt-2 h-1.5" tone={job.status === 'blocked' ? 'red' : prog.pct === 100 ? 'green' : 'brand'} label="Job progress" />
            </MiniCard>
            <MiniCard label="Schedule" value={job.scheduledStart ? time(job.scheduledStart) : '—'} sub={job.scheduledStart ? `${relativeDay(job.scheduledStart)} · to ${time(job.scheduledEnd)}` : 'Unscheduled'} />
            <MiniCard label="Assigned team" value={<AvatarStack ids={job.assignedWorkerIds} size="sm" />} sub={job.assignedWorkerIds.map((w) => d.team.find((m) => m.id === w)?.firstName).join(' & ') || 'Unassigned'} />
            <MiniCard label="Quote" value={money(job.quotedAmount ?? (quote ? quoteTotal(quote) : 0))} sub={quote ? `${quote.ref} · ${quote.status}` : 'No quote'} />
            <MiniCard label="Actual time" value={duration(costs.minutes)} sub={<span className={variance > 5 ? 'font-semibold text-warning-ink' : ''}>Estimate {duration(est)}{variance > 5 ? ` · +${variance}m` : ''}</span>} />
            <MiniCard label="Actual cost" value={money(costs.total, true)} sub={`Labour ${money(costs.labour, true)} · materials ${money(costs.materials, true)}`} />
          </div>

          <div className="grid grid-cols-1 gap-6xl:grid-cols-[1.4fr_1fr]">
            <div className="space-y-6">
              <Card>
                <CardHeader title="Tasks" subtitle={`${prog.done}/${prog.total} complete`} action={<button type="button" className="text-[13px] font-semibold text-secondary-ink hover:underline" onClick={() => changeTab('tasks')}>Manage</button>} />
                <TaskList tasks={tasks} onToggle={toggleTask} compact />
              </Card>
              <Card>
                <CardHeader title="Evidence" icon={Camera} action={<Button size="sm" variant="soft" icon={<Camera className="size-4" />} onClick={() => setDialog('evidence')}>Add photo</Button>} />
                <EvidenceGrid items={evidence.slice(0, 4)} cols="grid-cols-2 sm:grid-cols-4" />
              </Card>
            </div>
            <div className="space-y-6">
              <div className="rounded-card border border-secondary-tint bg-gradient-to-b from-secondary-soft to-surface p-5">
                <p className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wider text-secondary-ink">
                  <Sparkles className="size-4" aria-hidden /> AI summary
                </p>
                <p className="mt-2 text-[15px] leading-relaxed text-ink">{aiSummary}</p>
              </div>
              <Card>
                <CardHeader title="Job summary" icon={FileText} />
                <p className="text-[15px] text-ink-2">{job.instructions ?? 'No instructions.'}</p>
                {customer && (
                  <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4">
                    <KeyValue label="Phone">
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="size-3.5 text-muted" aria-hidden /> {customer.phone}
                      </span>
                    </KeyValue>
                    <KeyValue label="Email">
                      <span className="inline-flex items-center gap-1.5 break-all">
                        <Mail className="size-3.5 shrink-0 text-muted" aria-hidden /> {customer.email}
                      </span>
                    </KeyValue>
                  </dl>
                )}
              </Card>
              {job.issues.length > 0 && (
                <Card>
                  <CardHeader title="Issues" icon={TriangleAlert} />
                  <ul className="space-y-2">
                    {job.issues.map((i) => (
                      <li key={i.id} className={cx('rounded-xl p-3 text-sm', i.resolved ? 'bg-subtle' : 'bg-danger-soft')}>
                        <p className="font-semibold text-ink">
                          {i.title} <span className={cx('ml-1 text-xs font-bold', i.resolved ? 'text-success-ink' : 'text-danger-ink')}>{i.resolved ? 'Resolved' : 'Open'}</span>
                        </p>
                        {i.detail && <p className="mt-0.5 text-ink-2">{i.detail}</p>}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'tasks' && (
        <Card>
          <CardHeader
            title="Tasks"
            subtitle="Tick to complete — changes appear instantly in the worker app and customer portal."
            action={
              <div className="flex gap-2">
                <Button size="sm" variant="outline" icon={<Clock className="size-4" />} onClick={() => setDialog('time')}>
                  Add time
                </Button>
                <Button size="sm" variant="outline" icon={<TriangleAlert className="size-4" />} onClick={() => setDialog('issue')}>
                  Add issue
                </Button>
              </div>
            }
          />
          <TaskList tasks={tasks} onToggle={toggleTask} />
        </Card>
      )}

      {tab === 'timeline' && (
        <Card>
          <CardHeader title="Timeline" subtitle="Everything that happened on this job" />
          <Timeline entries={job.timeline} />
        </Card>
      )}

      {tab === 'costs' && (
        <div className="grid grid-cols-1 gap-6xl:grid-cols-[1.4fr_1fr]">
          <Card>
            <CardHeader title="Time by task" action={<Button size="sm" variant="outline" icon={<Clock className="size-4" />} onClick={() => setDialog('time')}>Add time</Button>} />
            <table className="w-full text-sm">
              <thead className="text-left text-xs font-semibold uppercase tracking-wide text-muted">
                <tr>
                  <th className="pb-2">Task</th>
                  <th className="pb-2 text-right">Estimate</th>
                  <th className="pb-2 text-right">Actual</th>
                  <th className="pb-2 text-right">Variance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {tasks.map((t) => {
                  const v = (t.actualMinutes ?? 0) - t.estimatedMinutes;
                  return (
                    <tr key={t.id}>
                      <td className="py-2.5 pr-3 text-ink">{t.title}</td>
                      <td className="tabular py-2.5 text-right text-muted">{t.estimatedMinutes}m</td>
                      <td className="tabular py-2.5 text-right font-semibold">{t.actualMinutes !== undefined ? `${t.actualMinutes}m` : '—'}</td>
                      <td className={cx('tabular py-2.5 text-right font-semibold', t.actualMinutes === undefined ? 'text-muted' : v > 0 ? 'text-warning-ink' : 'text-success-ink')}>{t.actualMinutes === undefined ? '—' : `${v > 0 ? '+' : ''}${v}m`}</td>
                    </tr>
                  );
                })}
                <tr className="font-bold">
                  <td className="pt-3">Total</td>
                  <td className="tabular pt-3 text-right">{duration(est)}</td>
                  <td className="tabular pt-3 text-right">{duration(costs.minutes)}</td>
                  <td className={cx('tabular pt-3 text-right', variance > 0 ? 'text-warning-ink' : 'text-success-ink')}>{variance > 0 ? '+' : ''}{variance}m</td>
                </tr>
              </tbody>
            </table>
          </Card>
          <div className="space-y-6">
            <Card>
              <CardHeader title="Materials" icon={Package} action={<Button size="sm" variant="outline" onClick={() => setDialog('material')}>Add material</Button>} />
              {job.materials.length ? (
                <ul className="divide-y divide-line text-sm">
                  {job.materials.map((m) => (
                    <li key={m.id} className="flex justify-between gap-3 py-2">
                      <span className="text-ink-2">{m.description}</span>
                      <span className="tabular font-semibold">{money(m.cost, true)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">No materials recorded.</p>
              )}
            </Card>
            <Card>
              <CardHeader title="Job profitability" icon={PoundSterling} />
              <dl className="space-y-2 text-sm">
                <Row label="Job value" value={money(value, true)} />
                <Row label={`Labour (${duration(costs.minutes)})`} value={`−${money(costs.labour, true)}`} />
                <Row label="Materials" value={`−${money(costs.materials, true)}`} />
                <div className="flex justify-between border-t border-line pt-2 text-base font-extrabold">
                  <dt>Margin</dt>
                  <dd className={cx('tabular', margin >= 0 ? 'text-success-ink' : 'text-danger-ink')}>{money(margin, true)}</dd>
                </div>
              </dl>
            </Card>
          </div>
        </div>
      )}

      {tab === 'evidence' && (
        <Card>
          <CardHeader title="Photos & documents" subtitle="Shared automatically with the customer portal" action={<Button size="sm" icon={<Camera className="size-4" />} onClick={() => setDialog('evidence')}>Add evidence</Button>} />
          <EvidenceGrid items={evidence} />
        </Card>
      )}

      {tab === 'messages' && (
        <Card className="max-w-3xl">
          <CardHeader title="Customer messages" subtitle="Texts and portal messages in one thread (demo — nothing is sent)" />
          <div className="space-y-3">
            {job.messages.map((m) => (
              <div key={m.id} className={cx('flex', m.from === 'business' ? 'justify-end' : 'justify-start')}>
                <div className={cx('max-w-[80%] rounded-2xl px-4 py-2.5 text-sm', m.from === 'business' ? 'rounded-br-md bg-secondary-solid text-secondary-on' : 'rounded-bl-md bg-subtle text-ink')}>
                  <p>{m.text}</p>
                  <p className={cx('mt-1 text-[11px]', m.from === 'business' ? 'text-white/70' : 'text-muted')}>
                    {m.author} · {relativeDay(m.at)} {time(m.at)}
                  </p>
                </div>
              </div>
            ))}
            {!job.messages.length && <p className="text-sm text-muted">No messages yet.</p>}
          </div>
          <form
            className="mt-4 flex gap-2 border-t border-line pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!msg.trim()) return;
              actions.sendMessage(job.id, 'business', 'Sophie Clarke', msg.trim());
              setMsg('');
            }}
          >
            <input value={msg} onChange={(e) => setMsg(e.target.value)} aria-label="Message" placeholder={`Message ${customer?.name.split(' ')[0] ?? 'customer'}…`} className="h-11 flex-1 rounded-control border border-line-2 px-3.5 text-sm outline-none focus:border-secondary focus:ring-4 focus:ring-secondary/15" />
            <Button type="submit" icon={<Send className="size-4" />}>
              Send
            </Button>
          </form>
        </Card>
      )}

      {tab === 'invoice' && (
        <div className="grid grid-cols-1 gap-6xl:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink">Quote</h2>
              {quote && (
                <div className="flex gap-2">
                  {quote.status === 'draft' && (
                    <Button size="sm" icon={<Send className="size-4" />} onClick={() => { actions.sendQuote(quote.id); toast({ title: 'Quote sent', description: `${quote.ref} sent to the customer (demo)` }); }}>
                      Send Quote
                    </Button>
                  )}
                  {['sent', 'viewed'].includes(quote.status) && (
                    <Button size="sm" variant="outline" onClick={() => { actions.acceptQuote(quote.id, OFFICE); toast({ title: 'Quote marked accepted' }); }}>
                      Mark accepted
                    </Button>
                  )}
                  <LinkButton size="sm" variant="outline" to={`/app/quotes/${quote.id}`}>
                    Open builder
                  </LinkButton>
                </div>
              )}
            </div>
            {quote ? (
              <DocumentPreview kind="quote" doc={quote} customer={customer} />
            ) : (
              <EmptyState
                icon={FileText}
                title="No quote on this job"
                action={
                  <Button onClick={() => { const q = actions.createQuoteForJob(job.id); if (q) navigate(`/app/quotes/${q}`); }}>
                    Create Quote
                  </Button>
                }
              />
            )}
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink">Invoice</h2>
              {invoice && (
                <div className="flex flex-wrap gap-2">
                  <StatusBadge kind="invoice" status={invoice.status} />
                  {invoice.status === 'draft' && (
                    <Button size="sm" icon={<Send className="size-4" />} onClick={() => { actions.sendInvoice(invoice.id); toast({ title: 'Invoice sent', description: `${invoice.ref} emailed to the customer (demo)` }); }}>
                      Send Invoice
                    </Button>
                  )}
                  {['sent', 'due', 'overdue'].includes(invoice.status) && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => { actions.sendReminder(invoice.id); toast({ title: 'Reminder sent', description: `${invoice.ref} (demo)` }); }}>
                        Send Reminder
                      </Button>
                      <Button size="sm" icon={<PoundSterling className="size-4" />} onClick={() => { actions.markInvoicePaid(invoice.id, 'Bank transfer'); toast({ title: 'Marked paid', description: invoice.ref }); }}>
                        Mark Paid
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
            {invoice ? (
              <DocumentPreview kind="invoice" doc={invoice} customer={customer} />
            ) : (
              <EmptyState
                icon={ReceiptText}
                title="Not invoiced yet"
                text={isDone ? 'The job is complete — create the invoice from the accepted quote.' : 'Complete the job first, or create a draft now.'}
                action={job.customerId ? <Button onClick={createInvoice} icon={<ReceiptText className="size-4" />}>Create Invoice</Button> : undefined}
              />
            )}
          </div>
        </div>
      )}

      {/* Dialogs */}
      <AddTimeDialog open={dialog === 'time'} onClose={() => setDialog(null)} job={job} tasks={tasks} by={worker ?? OFFICE} defaultTaskId={taskForDialog} />
      <AddMaterialDialog open={dialog === 'material'} onClose={() => setDialog(null)} job={job} tasks={tasks} by={worker ?? OFFICE} />
      <AddIssueDialog open={dialog === 'issue'} onClose={() => setDialog(null)} job={job} tasks={tasks} by={worker ?? OFFICE} />
      <EvidenceDialog open={dialog === 'evidence'} onClose={() => setDialog(null)} job={job} tasks={tasks} by={worker ?? OFFICE} defaultType={isDone || prog.pct > 50 ? 'after' : 'before'} />
      <BlockJobDialog open={dialog === 'block'} onClose={() => setDialog(null)} job={job} by={worker ?? OFFICE} />
      {dialog === 'schedule' && <ScheduleJobDialog open onClose={() => setDialog(null)} job={job} />}
      <ConfirmDialog
        open={dialog === 'complete'}
        onClose={() => {
          setDialog(null);
          setTaskForDialog(undefined);
        }}
        title="Complete this job?"
        text={`${openTasks} task${openTasks === 1 ? ' is' : 's are'} still open. Completing the job will mark ${openTasks === 1 ? 'it' : 'them'} complete at the estimated time.`}
        confirmLabel="Complete job"
        onConfirm={complete}
      />
    </div>
  );
}

function MiniCard({ label, value, sub, children }: { label: string; value: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <div className="tabular mt-1 font-display text-xl font-extrabold text-ink">{value}</div>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-ink-2">
      <dt>{label}</dt>
      <dd className="tabular">{value}</dd>
    </div>
  );
}

function TaskList({ tasks, onToggle, compact }: { tasks: Task[]; onToggle: (t: Task) => void; compact?: boolean }) {
  if (!tasks.length) return <p className="text-sm text-muted">No task breakdown for this job.</p>;
  return (
    <ul className="divide-y divide-line">
      {tasks.map((t) => (
        <li key={t.id} className="flex items-center gap-3 py-2.5">
          <button type="button" onClick={() => onToggle(t)} aria-label={t.status === 'completed' ? `Reopen ${t.title}` : `Complete ${t.title}`} className="shrink-0 rounded-full">
            {t.status === 'completed' ? <CheckCircle2 className="size-6 text-success" /> : t.status === 'blocked' ? <TriangleAlert className="size-6 text-danger" /> : <Circle className={cx('size-6', t.status === 'in-progress' ? 'text-accent' : 'text-line-2')} />}
          </button>
          <div className="min-w-0 flex-1">
            <Link to={`/app/tasks/${t.id}`} className={cx('text-sm font-semibold hover:text-secondary-ink', t.status === 'completed' ? 'text-muted line-through decoration-line-2' : 'text-ink')}>
              {t.order}. {t.title}
            </Link>
            {!compact && t.outcome && <p className="text-xs text-muted">{t.outcome}</p>}
          </div>
          {!compact && <PriorityBadge priority={t.priority} />}
          <span className="tabular hidden text-xs text-muted sm:inline">{t.actualMinutes !== undefined ? `${t.actualMinutes}/${t.estimatedMinutes}m` : `${t.estimatedMinutes}m`}</span>
          {t.assignedWorkerId && <WorkerAvatar id={t.assignedWorkerId} size="xs" />}
          {!compact && <StatusBadge kind="task" status={t.status} />}
        </li>
      ))}
    </ul>
  );
}

