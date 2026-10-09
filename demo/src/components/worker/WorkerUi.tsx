import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, CircleDashed, Clock, MapPin, Mic, Navigation, Phone, PhoneOff, Play, TriangleAlert, Zap } from 'lucide-react';
import type { DemoData, Job, JobStatus, Lead, ServiceType, TeamMember } from '../../types/domain';
import { useDemo } from '../../app/DemoProvider';
import { getCustomer, jobAddress, jobCustomerLabel, jobProgress, jobsForWorker } from '../../app/selectors';
import { DEMO_DATE, demoClock, parseLocal } from '../../data/demoClock';
import { DEFAULT_CREW } from '../../data/templates';
import { serviceTone } from '../../theme/branding';
import { PhoneSheet } from '../common/Sheet';
import { Badge, DemoBadge, ServiceBadge, StatusBadge } from '../common/Badge';
import { ProgressBar } from '../common/Card';
import { Avatar } from '../common/Avatar';
import { ServiceIcon } from '../common/ServiceIcon';
import { useToast } from '../common/Toast';
import { AddIssueDialog, AddMaterialDialog, AddTimeDialog, EvidenceDialog } from '../shared/JobActionDialogs';
import { QuickUpdateSheet, type QuickPick } from './QuickUpdateSheet';
import { VoiceUpdateSheet } from './VoiceUpdateSheet';
import { cx } from '../../utils/cx';
import { duration, timeRange } from '../../utils/format';

// ---------------------------------------------------------------- helpers

export const DONE_STATUSES: JobStatus[] = ['completed', 'invoiced', 'closed'];
export const isJobDone = (status: JobStatus) => DONE_STATUSES.includes(status);

/** Minutes between two local ISO datetimes. */
export function minutesBetween(a?: string, b?: string): number | undefined {
  if (!a || !b) return undefined;
  return Math.round((parseLocal(b).getTime() - parseLocal(a).getTime()) / 60000);
}

/** Main line for a job card: the customer, or the round name for multi-home rounds. */
export function jobHeadline(d: DemoData, j: Job): string {
  return j.kind === 'round' ? j.title : jobCustomerLabel(d, j);
}

export function greetingFor(iso: string): string {
  const h = Number(iso.slice(11, 13));
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

const pad = (n: number) => String(n).padStart(2, '0');

/** 1:05:09 / 12:04 style stopwatch text. */
export function formatElapsed(totalSecs: number): string {
  const s = Math.max(0, Math.floor(totalSecs));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
}

/** The demo clock, re-read on an interval (for timers, greetings and the status bar). */
export function useDemoNow(intervalMs = 1000): string {
  const [now, setNow] = useState(() => demoClock());
  useEffect(() => {
    const t = window.setInterval(() => setNow(demoClock()), intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs]);
  return now;
}

/** Current field worker (persona.workerId, falling back to Maya Khan). */
export function useCurrentWorker(): { workerId: string; worker?: TeamMember } {
  const { state } = useDemo();
  const team = state.data.team;
  const worker = team.find((m) => m.id === state.persona.workerId && !m.isOffice) ?? team.find((m) => m.id === 'w-maya') ?? team.find((m) => !m.isOffice && m.active);
  return { workerId: worker?.id ?? 'w-maya', worker };
}

export function useServiceTone(service: ServiceType) {
  const { state } = useDemo();
  const svc = state.config.services.find((s) => s.id === service);
  return { tone: serviceTone(svc?.color ?? '#475467'), icon: svc?.icon ?? 'wrench', name: svc?.name ?? 'Service' };
}

/** The job a worker is most likely updating: in progress → blocked → next scheduled today. */
export function currentJobFor(d: DemoData, workerId: string): Job | undefined {
  const today = jobsForWorker(d, workerId);
  return today.find((j) => j.status === 'in-progress') ?? today.find((j) => j.status === 'blocked') ?? today.find((j) => j.status === 'scheduled' || j.status === 'new');
}

const SERVICE_NOUN: Record<ServiceType, string> = { gutter: 'gutter clean', window: 'window clean', plumbing: 'plumbing repair' };

export interface PendingVisit {
  lead: Lead;
  start: string;
  end: string;
  title: string;
  crew: string[];
}

/** Website / phone leads booked into today's slot for this worker but not yet confirmed by the office. */
export function pendingVisitsForWorker(d: DemoData, workerId: string, dateKey = DEMO_DATE): PendingVisit[] {
  return d.leads
    .filter((l) => l.status !== 'converted' && l.status !== 'lost' && l.preferredSlot?.date === dateKey)
    .map((l) => {
      const slot = l.preferredSlot!;
      const crew = slot.workerIds?.length ? slot.workerIds : DEFAULT_CREW[l.service];
      const surname = l.customerName.trim().split(/\s+/).slice(-1)[0] ?? l.customerName;
      return { lead: l, start: `${slot.date}T${slot.start}`, end: `${slot.date}T${slot.end}`, title: `${surname} ${SERVICE_NOUN[l.service]}`, crew };
    })
    .filter((p) => p.crew.includes(workerId));
}

// ---------------------------------------------------------------- sheets context

type SheetState =
  | { kind: 'quick'; jobId?: string; view?: 'menu' | 'tasks' }
  | { kind: 'voice'; jobId: string }
  | { kind: 'evidence'; jobId: string; type?: 'before' | 'after'; taskId?: string }
  | { kind: 'time'; jobId: string; taskId?: string }
  | { kind: 'material'; jobId: string }
  | { kind: 'issue'; jobId: string }
  | { kind: 'call'; jobId: string }
  | { kind: 'complete'; jobId: string };

export interface WorkerSheets {
  workerId: string;
  openQuick: (jobId?: string, view?: 'menu' | 'tasks') => void;
  openVoice: (jobId: string) => void;
  openEvidence: (jobId: string, type?: 'before' | 'after', taskId?: string) => void;
  openTime: (jobId: string, taskId?: string) => void;
  openMaterial: (jobId: string) => void;
  openIssue: (jobId: string) => void;
  openCall: (jobId: string) => void;
  /** Completes the job — asks first when tasks are still open. */
  completeJob: (jobId: string) => void;
  close: () => void;
}

const noop = () => undefined;
const SheetsContext = createContext<WorkerSheets>({
  workerId: 'w-maya',
  openQuick: noop,
  openVoice: noop,
  openEvidence: noop,
  openTime: noop,
  openMaterial: noop,
  openIssue: noop,
  openCall: noop,
  completeJob: noop,
  close: noop,
});

export const useWorkerSheets = () => useContext(SheetsContext);

/**
 * Owns every worker bottom sheet. Render it inside the phone screen (a `relative overflow-hidden`
 * element) so the sheets open inside the device frame rather than over the presenter's screen.
 */
export function WorkerSheetsProvider({ children }: { children: ReactNode }) {
  const { state, actions } = useDemo();
  const { workerId } = useCurrentWorker();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const close = useCallback(() => setSheet(null), []);

  const d = state.data;
  const jobId = sheet?.jobId;
  const job = jobId ? d.jobs.find((j) => j.id === jobId) : undefined;
  const allTasks = d.tasks;
  // Stable task list per job so dialogs that sync on `tasks` don't reset while open.
  const tasks = useMemo(() => (jobId ? allTasks.filter((t) => t.jobId === jobId).sort((a, b) => a.order - b.order) : []), [allTasks, jobId]);

  const finish = useCallback(
    (id: string) => {
      const j = state.data.jobs.find((x) => x.id === id);
      if (!j) return;
      actions.updateJobStatus(id, 'completed', undefined, workerId);
      toast({ title: `${j.ref} complete`, description: 'Customer notified · invoice ready for the office' });
      setSheet(null);
      const path = `/worker/jobs/${id}`;
      if (location.pathname !== path) navigate(path);
    },
    [state.data.jobs, actions, workerId, toast, location.pathname, navigate],
  );

  const api = useMemo<WorkerSheets>(
    () => ({
      workerId,
      openQuick: (id, view) => setSheet({ kind: 'quick', jobId: id, view }),
      openVoice: (id) => setSheet({ kind: 'voice', jobId: id }),
      openEvidence: (id, type, taskId) => setSheet({ kind: 'evidence', jobId: id, type, taskId }),
      openTime: (id, taskId) => setSheet({ kind: 'time', jobId: id, taskId }),
      openMaterial: (id) => setSheet({ kind: 'material', jobId: id }),
      openIssue: (id) => setSheet({ kind: 'issue', jobId: id }),
      openCall: (id) => setSheet({ kind: 'call', jobId: id }),
      completeJob: (id) => {
        const open = state.data.tasks.filter((t) => t.jobId === id && t.status !== 'completed');
        if (open.length) setSheet({ kind: 'complete', jobId: id });
        else finish(id);
      },
      close,
    }),
    [workerId, close, finish, state.data.tasks],
  );

  const pick = (kind: QuickPick, id: string) => {
    if (kind === 'voice') setSheet({ kind: 'voice', jobId: id });
    else if (kind === 'evidence') setSheet({ kind: 'evidence', jobId: id });
    else if (kind === 'time') setSheet({ kind: 'time', jobId: id });
    else if (kind === 'material') setSheet({ kind: 'material', jobId: id });
    else setSheet({ kind: 'issue', jobId: id });
  };

  const evidenceType = (j: Job): 'before' | 'after' => (isJobDone(j.status) || jobProgress(d, j).pct >= 50 ? 'after' : 'before');

  return (
    <SheetsContext.Provider value={api}>
      {children}
      {sheet?.kind === 'quick' && <QuickUpdateSheet open onClose={close} jobId={sheet.jobId} initialView={sheet.view} workerId={workerId} onPick={pick} />}
      {job && sheet?.kind === 'voice' && <VoiceUpdateSheet open onClose={close} job={job} tasks={tasks} by={workerId} />}
      {job && sheet?.kind === 'evidence' && <EvidenceDialog variant="sheet" open onClose={close} job={job} tasks={tasks} by={workerId} defaultType={sheet.type ?? evidenceType(job)} defaultTaskId={sheet.taskId} />}
      {job && sheet?.kind === 'time' && <AddTimeDialog variant="sheet" open onClose={close} job={job} tasks={tasks} by={workerId} defaultTaskId={sheet.taskId} />}
      {job && sheet?.kind === 'material' && <AddMaterialDialog variant="sheet" open onClose={close} job={job} tasks={tasks} by={workerId} />}
      {job && sheet?.kind === 'issue' && <AddIssueDialog variant="sheet" open onClose={close} job={job} tasks={tasks} by={workerId} />}
      {job && sheet?.kind === 'call' && <CallSheet job={job} onClose={close} />}
      {job && sheet?.kind === 'complete' && <CompleteJobSheet job={job} openTitles={tasks.filter((t) => t.status !== 'completed').map((t) => t.title)} onClose={close} onConfirm={() => finish(job.id)} />}
    </SheetsContext.Provider>
  );
}

// ---------------------------------------------------------------- call + complete sheets

function CallSheet({ job, onClose }: { job: Job; onClose: () => void }) {
  const { state } = useDemo();
  const { tone } = useServiceTone(job.service);
  const customer = getCustomer(state.data, job.customerId);
  const office = state.data.team.find((m) => m.isOffice && m.active);
  const name = customer?.name ?? office?.name ?? state.config.company.companyName;
  const phone = customer?.phone || office?.phone || state.config.company.phone;
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setSecs((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, []);
  return (
    <PhoneSheet open onClose={onClose} title={customer ? 'Call customer' : 'Call the office'} tall>
      <div className="flex flex-col items-center pb-2 pt-4 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted" aria-live="polite">
          {secs < 3 ? 'Calling…' : 'Ringing…'}
        </p>
        <div className="relative mt-6 grid size-32 place-items-center">
          <span className="absolute inset-3 animate-pulse-ring rounded-full bg-success/30" aria-hidden />
          <span className="absolute inset-3 animate-pulse-ring rounded-full bg-success/25 [animation-delay:0.6s]" aria-hidden />
          <span className="absolute inset-3 animate-pulse-ring rounded-full bg-success/20 [animation-delay:1.2s]" aria-hidden />
          <Avatar name={name} color={customer ? tone.color : office?.color} size="xl" className="relative size-24 text-2xl shadow-raised" />
        </div>
        <h3 className="mt-5 font-display text-2xl font-extrabold text-ink">{name}</h3>
        <p className="tabular mt-1 text-base font-semibold text-ink-2">{phone}</p>
        <p className="mt-0.5 text-sm text-muted">{customer ? `${job.ref} · ${job.title}` : 'Office coordinator'}</p>
        <DemoBadge className="mt-4">Demo — no call is placed</DemoBadge>
        <button type="button" onClick={onClose} aria-label="Hang up" className="mt-8 grid size-16 place-items-center rounded-full bg-danger-ink text-white shadow-float transition active:scale-95">
          <PhoneOff className="size-7" aria-hidden />
        </button>
        <span className="mt-2 text-xs font-semibold text-muted" aria-hidden>
          Hang up
        </span>
      </div>
    </PhoneSheet>
  );
}

function CompleteJobSheet({ job, openTitles, onClose, onConfirm }: { job: Job; openTitles: string[]; onClose: () => void; onConfirm: () => void }) {
  const n = openTitles.length;
  const unit = job.kind === 'round' ? (n === 1 ? 'home' : 'homes') : n === 1 ? 'task' : 'tasks';
  return (
    <PhoneSheet
      open
      onClose={onClose}
      title="Complete this job?"
      footer={
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} className="h-12 rounded-control border border-line-2 bg-surface text-[15px] font-semibold text-ink hover:bg-subtle">
            Keep working
          </button>
          <button type="button" data-autofocus onClick={onConfirm} className="h-12 rounded-control bg-secondary-solid text-[15px] font-semibold text-secondary-on shadow-sm hover:brightness-110">
            Complete all
          </button>
        </div>
      }
    >
      <div className="flex items-start gap-3 rounded-xl bg-warning-soft p-3.5 text-warning-ink">
        <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
        <p className="text-sm font-semibold">
          {n} {unit} still open — complete {n === 1 ? 'it' : 'them'} too?
        </p>
      </div>
      <ul className="mt-3 space-y-2">
        {openTitles.map((t) => (
          <li key={t} className="flex items-center gap-2.5 text-sm text-ink-2">
            <CircleDashed className="size-4 shrink-0 text-muted" aria-hidden />
            {t}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[13px] text-muted">
        {job.ref} will be marked complete. The customer is notified and the office can invoice straight away.
      </p>
    </PhoneSheet>
  );
}

// ---------------------------------------------------------------- job cards

const btn = 'inline-flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-control px-3 text-[13px] font-semibold transition active:scale-[0.98]';
export const workerBtn = {
  primary: cx(btn, 'bg-secondary-solid text-secondary-on shadow-sm hover:brightness-110'),
  outline: cx(btn, 'border border-line-2 bg-surface text-ink hover:bg-subtle'),
  soft: cx(btn, 'bg-secondary-soft text-secondary-ink hover:bg-secondary-tint'),
  accent: cx(btn, 'bg-accent-solid text-accent-on shadow-sm hover:brightness-110'),
};

/** Full job card used on the worker's Today screen. */
export function WorkerJobCard({ job, label }: { job: Job; label?: string }) {
  const { state, actions } = useDemo();
  const d = state.data;
  const { workerId, worker } = useCurrentWorker();
  const sheets = useWorkerSheets();
  const toast = useToast();
  const navigate = useNavigate();
  const { tone } = useServiceTone(job.service);
  const prog = jobProgress(d, job);
  const mins = minutesBetween(job.scheduledStart, job.scheduledEnd) ?? job.estimatedMinutes;
  const headline = jobHeadline(d, job);
  const round = job.kind === 'round';
  const link = `/worker/jobs/${job.id}`;
  const notStarted = job.status === 'scheduled' || job.status === 'new' || job.status === 'quoted';

  const start = () => {
    actions.updateJobStatus(job.id, 'in-progress', undefined, workerId);
    toast({ title: `${job.ref} started`, description: 'Timer running — the office and customer can see you’re on site.' });
    navigate(link);
  };
  const resume = () => {
    actions.updateJobStatus(job.id, 'in-progress', undefined, workerId);
    toast({ title: `${job.ref} resumed`, description: 'Issue cleared — back in progress.' });
  };
  const onWay = () => {
    actions.onTheWay(job.id, workerId);
    toast({ title: 'Customer notified', description: round ? 'Round customers texted that you’re on the way (demo SMS).' : `“${worker?.firstName ?? 'Your technician'} is on the way” sent to ${headline} (demo SMS).` });
  };

  return (
    <article className="card overflow-hidden">
      <div className="flex">
        <span className="w-1.5 shrink-0" style={{ background: tone.color }} aria-hidden />
        <div className="min-w-0 flex-1 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="tabular flex items-center gap-1.5 text-[13px] font-semibold text-ink-2">
                <Clock className="size-3.5 text-muted" aria-hidden />
                {timeRange(job.scheduledStart, job.scheduledEnd)}
                {mins ? <span className="font-medium text-muted">· {duration(mins)}</span> : null}
              </p>
              <Link to={link} className="mt-0.5 block truncate text-[17px] font-bold text-ink hover:underline">
                {headline}
              </Link>
              <p className="mt-0.5 flex items-center gap-1 truncate text-[13px] text-muted">
                <MapPin className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">{round ? `${prog.total} homes · ${job.area ?? ''}` : jobAddress(d, job)}</span>
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              {label && <span className="rounded-full bg-primary-solid px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-on">{label}</span>}
              <StatusBadge kind="job" status={job.status} />
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <ServiceBadge service={job.service} />
            <span className="text-xs font-semibold text-muted">{job.ref}</span>
          </div>

          {(job.status === 'in-progress' || job.status === 'blocked') && (
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-xs font-semibold text-ink-2">
                <span>
                  {prog.done} of {prog.total} {round ? 'homes' : 'tasks'} done
                </span>
                <span className="tabular text-muted">{prog.pct}%</span>
              </div>
              <ProgressBar value={prog.pct} tone={job.status === 'blocked' ? 'red' : 'brand'} label={`${job.ref} progress`} />
            </div>
          )}

          {job.atRisk && (
            <p className="mt-3 flex items-start gap-2 rounded-lg bg-warning-soft px-3 py-2 text-[13px] font-medium text-warning-ink">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              {job.atRisk}
            </p>
          )}
          {notStarted && job.onTheWayAt && (
            <p className="mt-3 flex items-center gap-2 text-[13px] font-semibold text-success-ink">
              <Navigation className="size-4" aria-hidden /> On the way · customer notified {job.onTheWayAt.slice(11, 16)}
            </p>
          )}

          <div className="mt-3.5 flex gap-2">
            <button
              type="button"
              onClick={() => sheets.openCall(job.id)}
              aria-label={round ? 'Call the office' : `Call ${headline}`}
              className="grid size-11 shrink-0 place-items-center rounded-control border border-line-2 bg-surface text-ink transition hover:bg-subtle active:scale-[0.98]"
            >
              <Phone className="size-4.5" aria-hidden />
            </button>
            {notStarted && !job.onTheWayAt && (
              <button type="button" onClick={onWay} className={cx(workerBtn.outline, 'flex-1')}>
                <Navigation className="size-4" aria-hidden /> On my way
              </button>
            )}
            {notStarted && job.onTheWayAt && (
              <Link to={link} className={cx(workerBtn.outline, 'flex-1')}>
                Open job
              </Link>
            )}
            {notStarted && (
              <button type="button" onClick={start} className={cx(workerBtn.primary, 'flex-1')}>
                <Play className="size-4" aria-hidden /> Start job
              </button>
            )}
            {job.status === 'in-progress' && (
              <button type="button" onClick={() => sheets.openVoice(job.id)} className={cx(workerBtn.soft, 'flex-1')}>
                <Mic className="size-4" aria-hidden /> Voice update
              </button>
            )}
            {job.status === 'blocked' && (
              <button type="button" onClick={resume} className={cx(workerBtn.outline, 'flex-1')}>
                <Play className="size-4" aria-hidden /> Resume
              </button>
            )}
            {!notStarted && (
              <Link to={link} className={cx(isJobDone(job.status) ? workerBtn.outline : workerBtn.primary, 'flex-1')}>
                Open job <ChevronRight className="size-4" aria-hidden />
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

/** Compact job row (job lists, "Done today"). */
export function WorkerJobRow({ job, showProgress = true }: { job: Job; showProgress?: boolean }) {
  const { state } = useDemo();
  const d = state.data;
  const { tone, icon } = useServiceTone(job.service);
  const prog = jobProgress(d, job);
  const round = job.kind === 'round';
  return (
    <Link to={`/worker/jobs/${job.id}`} className="card flex items-center gap-3 p-3 transition hover:shadow-raised active:scale-[0.99]">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl" style={{ background: tone.soft, color: tone.ink }}>
        <ServiceIcon name={icon} className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="tabular block text-xs font-semibold text-muted">
          {timeRange(job.scheduledStart, job.scheduledEnd)} · {job.ref}
        </span>
        <span className="block truncate text-[15px] font-bold text-ink">{jobHeadline(d, job)}</span>
        <span className="block truncate text-xs text-muted">{round ? `${prog.total} homes · ${job.area ?? ''}` : job.area ?? jobAddress(d, job)}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <StatusBadge kind="job" status={job.status} />
        {showProgress && prog.total > 1 && !isJobDone(job.status) && (
          <span className="tabular text-[11px] font-semibold text-muted">
            {prog.done}/{prog.total} {round ? 'homes' : 'tasks'}
          </span>
        )}
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
    </Link>
  );
}

/** Dashed placeholder for a booked-but-unconfirmed visit (e.g. Priya Shah before the office converts her lead). */
export function PendingVisitCard({ visit, compact }: { visit: PendingVisit; compact?: boolean }) {
  const { actions } = useDemo();
  const toast = useToast();
  const { tone } = useServiceTone(visit.lead.service);
  const mins = minutesBetween(visit.start, visit.end);
  const confirm = () => {
    const jobId = actions.convertLeadToJob(visit.lead.id);
    toast({
      title: 'Office confirmed the booking',
      description: `${visit.title} is now on your schedule${jobId ? ` as ${jobId.toUpperCase()}` : ''}.`,
      action: jobId ? { label: 'Open job', to: `/worker/jobs/${jobId}` } : undefined,
    });
  };
  const place = [visit.lead.address, visit.lead.town].filter(Boolean).join(', ');
  return (
    <article className={cx('rounded-card border-2 border-dashed border-line-2 bg-surface/70', compact ? 'p-3' : 'p-4')} aria-label={`Pending office confirmation: ${visit.title}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="tabular flex items-center gap-1.5 text-[13px] font-semibold text-ink-2">
            <Clock className="size-3.5 text-muted" aria-hidden />
            {timeRange(visit.start, visit.end)}
            {mins ? <span className="font-medium text-muted">· {duration(mins)}</span> : null}
          </p>
          <p className="mt-0.5 truncate text-[17px] font-bold text-ink">{visit.lead.customerName}</p>
          {place && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-[13px] text-muted">
              <MapPin className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{place}</span>
            </p>
          )}
        </div>
        <Badge tone="amber" dot>
          Pending
        </Badge>
      </div>
      <p className="mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-[13px] font-semibold" style={{ background: tone.soft, color: tone.ink }}>
        <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
        Pending office confirmation — {visit.title} {timeRange(visit.start, visit.end)}
      </p>
      <button type="button" onClick={confirm} className={cx(workerBtn.soft, 'mt-3 w-full')}>
        <Zap className="size-4" aria-hidden /> Demo: office confirms now
      </button>
    </article>
  );
}
