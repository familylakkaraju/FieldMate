import { Link, useParams } from 'react-router-dom';
import {
  Camera,
  Check,
  CheckCheck,
  ChevronLeft,
  CircleDot,
  ClipboardList,
  Clock,
  ListChecks,
  MapPin,
  MessageSquareText,
  Mic,
  Navigation,
  Package,
  PartyPopper,
  Phone,
  Play,
  Plus,
  StickyNote,
  Timer,
  TriangleAlert,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { Job, Task, TimelineKind } from '../../types/domain';
import { useDemo } from '../../app/DemoProvider';
import { getCustomer, jobAddress, jobEstimatedMinutes, jobProgress, jobsForWorker, tasksForJob } from '../../app/selectors';
import { parseLocal } from '../../data/demoClock';
import { Badge, ServiceBadge, StatusBadge } from '../../components/common/Badge';
import { EmptyState, ProgressBar } from '../../components/common/Card';
import { AvatarStack } from '../../components/common/Avatar';
import { useToast } from '../../components/common/Toast';
import { EvidenceGrid } from '../../components/shared/EvidenceGrid';
import { formatElapsed, isJobDone, jobHeadline, useCurrentWorker, useDemoNow, useWorkerSheets, workerBtn } from '../../components/worker/WorkerUi';
import { cx } from '../../utils/cx';
import { duration, money, relativeDay, time, timeRange } from '../../utils/format';

const big = 'inline-flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-control px-4 text-[15px] font-semibold transition active:scale-[0.98]';
const BIG = {
  primary: cx(big, 'bg-secondary-solid text-secondary-on shadow-sm hover:brightness-110'),
  outline: cx(big, 'border border-line-2 bg-surface text-ink hover:bg-subtle'),
  accent: cx(big, 'bg-accent-solid text-accent-on shadow-sm hover:brightness-110'),
};

const KIND_ICON: Partial<Record<TimelineKind, LucideIcon>> = {
  status: CircleDot,
  task: Check,
  time: Timer,
  material: Package,
  issue: TriangleAlert,
  evidence: Camera,
  voice: Mic,
  contact: Navigation,
  message: MessageSquareText,
  schedule: Clock,
  note: StickyNote,
};

/** W02 — the worker's job screen. */
export default function WorkerJob() {
  const { id } = useParams();
  const { state, actions } = useDemo();
  const d = state.data;
  const { workerId } = useCurrentWorker();
  const sheets = useWorkerSheets();
  const toast = useToast();
  const now = useDemoNow(1000);
  const job = d.jobs.find((j) => j.id === id);
  if (!job) return <MissingJob id={id} />;

  const tasks = tasksForJob(d, job.id);
  const prog = jobProgress(d, job);
  const round = job.kind === 'round';
  const unit = round ? 'homes' : 'tasks';
  const one = round ? 'home' : 'task';
  const done = isJobDone(job.status);
  const notStarted = job.status === 'scheduled' || job.status === 'new' || job.status === 'quoted';
  const customer = getCustomer(d, job.customerId);
  const headline = jobHeadline(d, job);
  const address = jobAddress(d, job);
  const est = jobEstimatedMinutes(d, job);
  const evidence = d.evidence.filter((e) => e.jobId === job.id);
  const elapsed = job.startedAt ? Math.max(0, (parseLocal(job.completedAt ?? now).getTime() - parseLocal(job.startedAt).getTime()) / 1000) : 0;
  const overMins = job.startedAt && !done ? Math.round(elapsed / 60 - est) : 0;
  const materialsTotal = job.materials.reduce((a, m) => a + m.cost, 0);
  const notes = [...job.timeline].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0)).slice(0, 6);
  const nextJob = jobsForWorker(d, workerId).find((j) => j.id !== job.id && !isJobDone(j.status));
  const byName = (by?: string) => d.team.find((m) => m.id === by)?.firstName ?? (by === 'customer' ? 'Customer' : by === 'system' ? 'FieldMate' : 'Office');

  const start = () => {
    actions.updateJobStatus(job.id, 'in-progress', undefined, workerId);
    toast({ title: `${job.ref} started`, description: 'Timer running — the customer sees “In progress”.' });
  };
  const resume = () => {
    actions.updateJobStatus(job.id, 'in-progress', undefined, workerId);
    toast({ title: `${job.ref} resumed`, description: 'Back in progress — the office has been updated.' });
  };
  const onWay = () => {
    actions.onTheWay(job.id, workerId);
    toast({ title: 'Customer notified', description: round ? 'Round customers texted that you’re on the way (demo SMS).' : `“On my way” text sent to ${headline} (demo SMS).` });
  };
  const openMaps = () => toast({ title: 'Opening maps (demo)', description: address, tone: 'info' });
  const toggleTask = (t: Task) => {
    if (t.status === 'completed') {
      actions.updateTaskStatus(t.id, 'ready', workerId);
      toast({ title: `${round ? 'Home' : 'Task'} reopened`, description: t.title, tone: 'info' });
      return;
    }
    actions.updateTaskStatus(t.id, 'completed', workerId);
    const left = tasks.filter((x) => x.status !== 'completed' && x.id !== t.id).length;
    toast({ title: `${round ? 'Home' : 'Task'} completed`, description: left ? `${t.title} · ${left} ${left === 1 ? one : unit} left` : 'All done — tap Complete job when you’re ready.' });
  };

  const tiles: { label: string; icon: LucideIcon; onClick: () => void; tone?: 'warn' | 'go' }[] = [
    ...(!done ? [{ label: round ? 'Complete home' : 'Complete task', icon: ListChecks, onClick: () => sheets.openQuick(job.id, 'tasks') }] : []),
    { label: 'Add photo', icon: Camera, onClick: () => sheets.openEvidence(job.id) },
    { label: 'Record time', icon: Timer, onClick: () => sheets.openTime(job.id) },
    { label: 'Add material', icon: Package, onClick: () => sheets.openMaterial(job.id) },
    { label: 'Record issue', icon: TriangleAlert, onClick: () => sheets.openIssue(job.id), tone: 'warn' as const },
    ...(done
      ? []
      : notStarted
        ? [{ label: 'Start job', icon: Play, onClick: start, tone: 'go' as const }]
        : job.status === 'blocked'
          ? [{ label: 'Resume job', icon: Play, onClick: resume, tone: 'go' as const }]
          : [{ label: 'Complete job', icon: CheckCheck, onClick: () => sheets.completeJob(job.id), tone: 'go' as const }]),
  ];

  return (
    <div className="flex min-h-full flex-col">
      <div className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-line/80 bg-canvas/90 px-2 py-1 backdrop-blur">
        <Link to="/worker/today" className="inline-flex h-11 items-center gap-0.5 rounded-control pl-1 pr-3 text-sm font-semibold text-secondary-ink hover:bg-subtle">
          <ChevronLeft className="size-5" aria-hidden /> Today
        </Link>
        <span className="text-[13px] font-bold text-ink-2">{job.ref}</span>
        <button type="button" onClick={() => sheets.openQuick(job.id)} aria-label="Quick update" className="grid size-11 place-items-center rounded-control text-ink-2 hover:bg-subtle">
          <Plus className="size-5" aria-hidden />
        </button>
      </div>

      <div className="flex-1 pb-4">
        <section className="px-4 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <ServiceBadge service={job.service} />
            <StatusBadge kind="job" status={job.status} />
          </div>
          <h1 className="mt-2 font-display text-[26px] font-extrabold leading-tight tracking-tight text-ink">{headline}</h1>
          {round && (
            <p className="mt-0.5 text-sm font-semibold text-ink-2">
              {prog.total} homes · {job.area}
            </p>
          )}
          <p className="mt-1.5 flex items-start gap-1.5 text-sm text-muted">
            <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden /> {address}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={openMaps} className={workerBtn.outline}>
              <Navigation className="size-4" aria-hidden /> Navigate
            </button>
            <button type="button" onClick={() => sheets.openCall(job.id)} className={workerBtn.outline}>
              <Phone className="size-4" aria-hidden /> {customer ? 'Call customer' : 'Call office'}
            </button>
          </div>
        </section>

        {done && <CompletePanel job={job} elapsed={elapsed} photos={evidence.length} total={prog.total} unit={unit} nextJob={nextJob} nextLabel={nextJob ? jobHeadline(d, nextJob) : ''} />}

        <section className="card mx-4 mt-4 p-4" aria-label="Job timer and progress">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">{done ? 'Time on site' : job.startedAt ? 'On site for' : 'Scheduled'}</p>
              <p className="tabular mt-1 font-display text-[32px] font-extrabold leading-none text-ink" role="timer" aria-live="off">
                {job.startedAt ? formatElapsed(elapsed) : timeRange(job.scheduledStart, job.scheduledEnd)}
              </p>
              <p className="mt-1.5 text-[13px] text-muted">
                {job.startedAt ? `Started ${time(job.startedAt)} · estimate ${duration(est)}` : `Estimate ${duration(est)}${job.travelMinutes ? ` · ${job.travelMinutes} min drive` : ''}`}
              </p>
            </div>
            {job.status === 'in-progress' && (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-xs font-bold text-success-ink">
                <span className="relative flex size-2" aria-hidden>
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-success" />
                </span>
                Live
              </span>
            )}
            {job.status === 'blocked' && (
              <Badge tone="red" dot>
                Paused
              </Badge>
            )}
          </div>
          {overMins > 0 && <p className="mt-2 text-[13px] font-semibold text-warning-ink">Running {duration(overMins)} over the estimate</p>}
          {job.blockedReason && job.status === 'blocked' && <p className="mt-2 text-[13px] font-semibold text-danger-ink">Blocked — {job.blockedReason}</p>}
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-[13px] font-semibold text-ink-2">
              <span>
                {prog.done} of {prog.total} {unit}
              </span>
              <span className="tabular text-muted">{prog.pct}%</span>
            </div>
            <ProgressBar value={prog.pct} tone={done ? 'green' : job.status === 'blocked' ? 'red' : 'brand'} label="Job progress" />
          </div>
        </section>

        <section className="mx-4 mt-4" aria-label="Job actions">
          {!done && (
            <button
              type="button"
              onClick={() => sheets.openVoice(job.id)}
              className="group flex w-full items-center gap-3.5 rounded-card bg-accent-solid p-4 text-left text-accent-on shadow-raised transition hover:brightness-110 active:scale-[0.99]"
            >
              <span className="relative grid size-12 shrink-0 place-items-center rounded-full bg-white/20">
                <span className="absolute inset-0 animate-pulse-ring rounded-full bg-white/30" aria-hidden />
                <Mic className="relative size-6" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-bold">Voice update</span>
                <span className="block text-[13px] opacity-85">Say what you did — FieldMate updates tasks, time & photos</span>
              </span>
            </button>
          )}
          <div className={cx('mt-2.5 grid gap-2', tiles.length === 4 ? 'grid-cols-2' : 'grid-cols-3')}>
            {tiles.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.label}
                  type="button"
                  onClick={t.onClick}
                  className={cx(
                    'flex min-h-[84px] flex-col items-center justify-center gap-1.5 rounded-xl border p-2 text-center text-[12px] font-semibold shadow-card transition active:scale-[0.97]',
                    t.tone === 'go' ? 'border-secondary-solid bg-secondary-solid text-secondary-on hover:brightness-110' : 'border-line bg-surface text-ink hover:bg-subtle',
                  )}
                >
                  <span className={cx('grid size-9 place-items-center rounded-lg', t.tone === 'go' ? 'bg-white/20' : t.tone === 'warn' ? 'bg-warning-soft text-warning-ink' : 'bg-secondary-soft text-secondary-ink')}>
                    <Icon className="size-4.5" aria-hidden />
                  </span>
                  {t.label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="card mx-4 mt-4 p-4" aria-labelledby="wj-instr">
          <h2 id="wj-instr" className="flex items-center gap-2 text-[15px] font-bold text-ink">
            <ClipboardList className="size-4.5 text-secondary-ink" aria-hidden /> Job instructions
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-2">{job.instructions || 'No special instructions — follow the standard checklist and photograph before & after.'}</p>
          <div className="mt-3 flex items-center gap-2 text-[13px] text-muted">
            <AvatarStack ids={job.assignedWorkerIds} size="xs" />
            <span>{job.assignedWorkerIds.map((w) => byName(w)).join(' & ') || 'Unassigned'}</span>
            {job.quotedAmount ? <span className="ml-auto font-semibold text-ink-2">{money(job.quotedAmount)}</span> : null}
          </div>
        </section>

        <section className="mx-4 mt-5" aria-labelledby="wj-tasks">
          <div className="mb-2 flex items-end justify-between">
            <h2 id="wj-tasks" className="text-[17px] font-bold text-ink">
              {round ? 'Homes' : 'Tasks'}
            </h2>
            <span className="tabular text-[13px] font-semibold text-muted">
              {prog.done} of {prog.total} {unit}
            </span>
          </div>
          {tasks.length ? (
            <ul className="card divide-y divide-line overflow-hidden">
              {tasks.map((t) => {
                const complete = t.status === 'completed';
                const who = t.assignedWorkerId && t.assignedWorkerId !== workerId ? byName(t.assignedWorkerId) : undefined;
                const checks = t.checklist?.length ? `${t.checklist.filter((c) => c.done).length}/${t.checklist.length} checks` : '';
                return (
                  <li key={t.id} className="flex items-start gap-3 p-3">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={complete}
                      aria-label={`${t.title}${complete ? ' — done' : ''}`}
                      disabled={done}
                      onClick={() => toggleTask(t)}
                      className={cx(
                        'grid size-11 shrink-0 place-items-center rounded-full border-2 transition active:scale-90 disabled:cursor-default',
                        complete ? 'border-success bg-success text-white' : 'border-line-2 bg-surface text-transparent hover:border-secondary',
                      )}
                    >
                      <Check className={cx('size-5', complete && 'animate-pop')} strokeWidth={3} aria-hidden />
                    </button>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className={cx('text-[15px] font-semibold leading-snug', complete ? 'text-muted line-through' : 'text-ink')}>{t.title}</p>
                      {t.outcome && !complete && <p className="mt-0.5 text-[13px] text-muted">{t.outcome}</p>}
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                        {(t.status === 'in-progress' || t.status === 'blocked') && <StatusBadge kind="task" status={t.status} className="h-5 px-2 text-[11px]" />}
                        {complete && <span className="font-semibold text-success-ink">Done</span>}
                        <span className="tabular">{t.actualMinutes ? `${t.actualMinutes} of ${t.estimatedMinutes} min` : `est. ${t.estimatedMinutes} min`}</span>
                        {who && <span>· {who}</span>}
                        {checks && <span>· {checks}</span>}
                      </p>
                    </div>
                    {!done && (
                      <button type="button" onClick={() => sheets.openTime(job.id, t.id)} aria-label={`Record time on ${t.title}`} className="grid size-11 shrink-0 place-items-center rounded-control text-muted hover:bg-subtle hover:text-ink">
                        <Timer className="size-4.5" aria-hidden />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-line-2 p-4 text-sm text-muted">No tasks on this job.</p>
          )}
        </section>

        <section className="mx-4 mt-5" aria-labelledby="wj-photos">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 id="wj-photos" className="text-[17px] font-bold text-ink">
              Photos <span className="text-sm font-semibold text-muted">{evidence.length}</span>
            </h2>
            <button type="button" onClick={() => sheets.openEvidence(job.id)} className={workerBtn.soft}>
              <Camera className="size-4" aria-hidden /> Add photo
            </button>
          </div>
          <EvidenceGrid items={evidence} cols="grid-cols-2" empty="No photos yet — add before & after shots" />
        </section>

        <section className="card mx-4 mt-5 p-4" aria-labelledby="wj-mat">
          <div className="flex items-center justify-between gap-2">
            <h2 id="wj-mat" className="flex items-center gap-2 text-[15px] font-bold text-ink">
              <Package className="size-4.5 text-secondary-ink" aria-hidden /> Materials
            </h2>
            <button type="button" onClick={() => sheets.openMaterial(job.id)} className="inline-flex h-11 items-center gap-1 rounded-control px-3 text-[13px] font-semibold text-secondary-ink hover:bg-subtle">
              <Plus className="size-4" aria-hidden /> Add
            </button>
          </div>
          {job.materials.length ? (
            <ul className="mt-1 divide-y divide-line text-sm">
              {job.materials.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0 truncate text-ink-2">{m.description}</span>
                  <span className="tabular font-semibold text-ink">{money(m.cost, true)}</span>
                </li>
              ))}
              <li className="flex items-center justify-between gap-3 pt-2.5 font-bold text-ink">
                <span>Total</span>
                <span className="tabular">{money(materialsTotal, true)}</span>
              </li>
            </ul>
          ) : (
            <p className="mt-1 text-sm text-muted">No materials used yet.</p>
          )}
        </section>

        <section className="card mx-4 mt-3 p-4" aria-labelledby="wj-iss">
          <div className="flex items-center justify-between gap-2">
            <h2 id="wj-iss" className="flex items-center gap-2 text-[15px] font-bold text-ink">
              <TriangleAlert className="size-4.5 text-warning-ink" aria-hidden /> Issues
            </h2>
            <button type="button" onClick={() => sheets.openIssue(job.id)} className="inline-flex h-11 items-center gap-1 rounded-control px-3 text-[13px] font-semibold text-secondary-ink hover:bg-subtle">
              <Plus className="size-4" aria-hidden /> Record
            </button>
          </div>
          {job.issues.length ? (
            <ul className="mt-1 space-y-2.5">
              {job.issues.map((i) => (
                <li key={i.id} className={cx('rounded-xl border p-3', i.resolved ? 'border-line bg-surface' : 'border-warning/40 bg-warning-soft')}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-ink">{i.title}</p>
                    <Badge tone={i.resolved ? 'green' : 'amber'} dot>
                      {i.resolved ? 'Resolved' : `Open · ${i.severity}`}
                    </Badge>
                  </div>
                  {i.detail && <p className="mt-1 text-[13px] text-ink-2">{i.detail}</p>}
                  <p className="mt-1 text-xs text-muted">
                    {time(i.at)} · {byName(i.by)}
                  </p>
                  {!i.resolved && (
                    <button
                      type="button"
                      onClick={() => {
                        actions.resolveIssue(job.id, i.id, workerId);
                        toast({ title: 'Issue resolved', description: i.title });
                      }}
                      className="mt-2 inline-flex h-11 items-center gap-1.5 rounded-control border border-line-2 bg-surface px-3 text-[13px] font-semibold text-ink hover:bg-subtle"
                    >
                      <Check className="size-4" aria-hidden /> Mark resolved
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-muted">No issues recorded.</p>
          )}
        </section>

        <section className="card mx-4 mt-3 p-4" aria-labelledby="wj-notes">
          <h2 id="wj-notes" className="flex items-center gap-2 text-[15px] font-bold text-ink">
            <StickyNote className="size-4.5 text-secondary-ink" aria-hidden /> Latest notes
          </h2>
          <ol className="mt-3 space-y-3">
            {notes.map((e) => {
              const Icon = KIND_ICON[e.kind] ?? CircleDot;
              return (
                <li key={e.id} className="flex gap-3">
                  <span className={cx('grid size-8 shrink-0 place-items-center rounded-full', e.kind === 'voice' ? 'bg-accent-soft text-accent-ink' : e.kind === 'issue' ? 'bg-warning-soft text-warning-ink' : 'bg-subtle text-ink-2')}>
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug text-ink">{e.text}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {relativeDay(e.at) === 'Today' ? '' : `${relativeDay(e.at)} `}
                      {time(e.at)} · {byName(e.by)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      </div>

      <div className="sticky bottom-0 z-20 border-t border-line bg-surface/95 px-4 pb-6 pt-3 backdrop-blur">
        {done ? (
          <Link to="/worker/today" className={cx(BIG.primary, 'w-full')}>
            Back to Today
          </Link>
        ) : notStarted ? (
          <div className="flex gap-2">
            {!job.onTheWayAt && (
              <button type="button" onClick={onWay} className={BIG.outline}>
                <Navigation className="size-4.5" aria-hidden /> On my way
              </button>
            )}
            <button type="button" onClick={start} className={BIG.primary}>
              <Play className="size-4.5" aria-hidden /> Start job
            </button>
          </div>
        ) : job.status === 'blocked' ? (
          <div className="flex gap-2">
            <button type="button" onClick={() => sheets.openVoice(job.id)} className={BIG.accent}>
              <Mic className="size-4.5" aria-hidden /> Voice update
            </button>
            <button type="button" onClick={resume} className={BIG.primary}>
              <Play className="size-4.5" aria-hidden /> Resume job
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button type="button" onClick={() => sheets.openVoice(job.id)} className={BIG.accent}>
              <Mic className="size-4.5" aria-hidden /> Voice update
            </button>
            <button type="button" onClick={() => sheets.completeJob(job.id)} className={BIG.primary}>
              <CheckCheck className="size-4.5" aria-hidden /> Complete job
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const CONFETTI = [
  { x: '8%', y: '14%', c: 'var(--brand-secondary)' },
  { x: '20%', y: '6%', c: 'var(--brand-accent)' },
  { x: '78%', y: '9%', c: 'var(--color-warning)' },
  { x: '90%', y: '22%', c: 'var(--brand-secondary)' },
  { x: '14%', y: '34%', c: 'var(--color-warning)' },
  { x: '84%', y: '40%', c: 'var(--brand-accent)' },
  { x: '32%', y: '12%', c: 'var(--color-success)' },
  { x: '66%', y: '4%', c: 'var(--color-success)' },
];

function CompletePanel({ job, elapsed, photos, total, unit, nextJob, nextLabel }: { job: Job; elapsed: number; photos: number; total: number; unit: string; nextJob?: Job; nextLabel: string }) {
  return (
    <section className="relative mx-4 mt-4 animate-pop overflow-hidden rounded-card border border-success/30 bg-success-soft p-5 text-center" aria-labelledby="wj-done">
      {CONFETTI.map((c, i) => (
        <span key={i} className="absolute size-2 animate-pop rounded-full" style={{ left: c.x, top: c.y, background: c.c, animationDelay: `${150 + i * 70}ms` }} aria-hidden />
      ))}
      <span className="relative mx-auto grid size-16 place-items-center rounded-full bg-success text-white shadow-raised">
        <span className="absolute inset-0 animate-pulse-ring rounded-full bg-success/40" aria-hidden />
        <PartyPopper className="relative size-8" aria-hidden />
      </span>
      <h2 id="wj-done" className="mt-3 font-display text-xl font-extrabold text-ink">
        Job complete
      </h2>
      <p className="mt-1 text-sm font-semibold text-success-ink">Customer notified, invoice ready for the office</p>
      <ul className="mt-4 grid grid-cols-3 gap-2">
        <li className="rounded-xl bg-surface px-2 py-2.5">
          <p className="tabular font-display text-base font-extrabold text-ink">{duration(Math.max(1, Math.round(elapsed / 60)))}</p>
          <p className="text-[11px] font-semibold text-muted">on site</p>
        </li>
        <li className="rounded-xl bg-surface px-2 py-2.5">
          <p className="tabular font-display text-base font-extrabold text-ink">{total}</p>
          <p className="text-[11px] font-semibold text-muted">{unit} done</p>
        </li>
        <li className="rounded-xl bg-surface px-2 py-2.5">
          <p className="tabular font-display text-base font-extrabold text-ink">{photos}</p>
          <p className="text-[11px] font-semibold text-muted">{photos === 1 ? 'photo' : 'photos'}</p>
        </li>
      </ul>
      <p className="mt-3 text-xs text-muted">
        {job.ref} completed {job.completedAt ? `at ${time(job.completedAt)}` : ''}
      </p>
      <div className="mt-4 grid gap-2">
        {nextJob && (
          <Link to={`/worker/jobs/${nextJob.id}`} className={cx(BIG.primary, 'w-full')}>
            Next: {nextLabel} · {time(nextJob.scheduledStart)}
          </Link>
        )}
        <Link to="/worker/today" className={cx(nextJob ? BIG.outline : BIG.primary, 'w-full')}>
          Back to Today
        </Link>
      </div>
    </section>
  );
}

function MissingJob({ id }: { id?: string }) {
  const { state, actions } = useDemo();
  const toast = useToast();
  const lead = state.data.leads.find((l) => l.jobNumberHint && `job-${l.jobNumberHint}` === id && l.status !== 'converted' && l.status !== 'lost');
  return (
    <div className="px-4 pb-8 pt-2">
      <Link to="/worker/today" className="inline-flex h-11 items-center gap-0.5 rounded-control pl-1 pr-3 text-sm font-semibold text-secondary-ink hover:bg-subtle">
        <ChevronLeft className="size-5" aria-hidden /> Today
      </Link>
      {lead ? (
        <div className="mt-4 rounded-card border-2 border-dashed border-line-2 bg-surface/70 p-6 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-warning-soft text-warning-ink">
            <Clock className="size-6" aria-hidden />
          </span>
          <h1 className="mt-3 font-display text-xl font-extrabold text-ink">Waiting for office confirmation</h1>
          <p className="mt-1.5 text-sm text-muted">
            {lead.customerName}’s booking{lead.preferredSlot ? ` (${lead.preferredSlot.label})` : ''} becomes {String(id).toUpperCase()} once the office converts the lead.
          </p>
          <button
            type="button"
            onClick={() => {
              actions.convertLeadToJob(lead.id);
              toast({ title: 'Office confirmed the booking', description: `${String(id).toUpperCase()} is now on your schedule.` });
            }}
            className={cx(workerBtn.soft, 'mt-4 w-full')}
          >
            <Zap className="size-4" aria-hidden /> Demo: office confirms now
          </button>
        </div>
      ) : (
        <div className="mt-4">
          <EmptyState
            icon={ClipboardList}
            title="Job not found"
            text="It may have been reassigned or removed by the office."
            action={
              <Link to="/worker/today" className={workerBtn.primary}>
                Back to Today
              </Link>
            }
          />
        </div>
      )}
    </div>
  );
}
