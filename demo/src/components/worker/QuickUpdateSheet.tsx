import { useState } from 'react';
import { Camera, Check, ChevronRight, Mic, Package, Timer, TriangleAlert, type LucideIcon } from 'lucide-react';
import type { Job, JobStatus } from '../../types/domain';
import { useDemo } from '../../app/DemoProvider';
import { jobCustomerLabel, jobsForWorker, tasksForJob } from '../../app/selectors';
import { serviceTone } from '../../theme/branding';
import { PhoneSheet } from '../common/Sheet';
import { StatusBadge } from '../common/Badge';
import { ServiceIcon } from '../common/ServiceIcon';
import { useToast } from '../common/Toast';
import { cx } from '../../utils/cx';
import { timeRange } from '../../utils/format';

export type QuickPick = 'voice' | 'evidence' | 'time' | 'material' | 'issue';

const DONE: JobStatus[] = ['completed', 'invoiced', 'closed'];

/** W03 — quick update launcher. Picks a job first when opened without one. */
export function QuickUpdateSheet({
  open,
  onClose,
  jobId,
  initialView = 'menu',
  workerId,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  jobId?: string;
  initialView?: 'menu' | 'tasks';
  workerId: string;
  onPick: (kind: QuickPick, jobId: string) => void;
}) {
  const { state, actions } = useDemo();
  const toast = useToast();
  const d = state.data;
  const [selected, setSelected] = useState<string | undefined>(jobId);
  const [ticked, setTicked] = useState<string[]>([]);
  const job = d.jobs.find((j) => j.id === selected);
  const choices = jobsForWorker(d, workerId).filter((j) => !DONE.includes(j.status));
  const headline = (j: Job) => (j.kind === 'round' ? j.title : jobCustomerLabel(d, j));
  const tone = (j: Job) => serviceTone(state.config.services.find((s) => s.id === j.service)?.color ?? '#475467');
  const icon = (j: Job) => state.config.services.find((s) => s.id === j.service)?.icon ?? 'wrench';

  if (!job) {
    return (
      <PhoneSheet open={open} onClose={onClose} title="Quick update">
        <p className="-mt-1 mb-3 text-sm text-muted">Which job is this update for?</p>
        {choices.length ? (
          <ul className="space-y-2">
            {choices.map((j) => {
              const t = tone(j);
              return (
                <li key={j.id}>
                  <button type="button" onClick={() => setSelected(j.id)} className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface p-3 text-left transition hover:bg-subtle">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl" style={{ background: t.soft, color: t.ink }}>
                      <ServiceIcon name={icon(j)} className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-bold text-ink">{headline(j)}</span>
                      <span className="tabular block text-xs text-muted">
                        {timeRange(j.scheduledStart, j.scheduledEnd)} · {j.ref}
                      </span>
                    </span>
                    <StatusBadge kind="job" status={j.status} />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-line-2 p-4 text-sm text-muted">No open jobs on your list today. Updates can be added from any job page.</p>
        )}
      </PhoneSheet>
    );
  }

  const round = job.kind === 'round';
  const tasks = tasksForJob(d, job.id);
  const listed = tasks.filter((t) => t.status !== 'completed' || ticked.includes(t.id));
  const t = tone(job);

  const toggle = (taskId: string) => {
    const task = tasks.find((x) => x.id === taskId);
    if (!task) return;
    if (task.status === 'completed') {
      actions.updateTaskStatus(task.id, 'ready', workerId);
      toast({ title: `${round ? 'Home' : 'Task'} reopened`, description: task.title, tone: 'info' });
      return;
    }
    actions.updateTaskStatus(task.id, 'completed', workerId);
    setTicked((xs) => [...xs, task.id]);
    const left = tasks.filter((x) => x.status !== 'completed' && x.id !== task.id).length;
    toast({ title: `${round ? 'Home' : 'Task'} completed`, description: left ? `${task.title} · ${left} left` : `${task.title} · all done — complete the job when ready` });
  };

  const tiles: { kind: QuickPick; label: string; sub: string; icon: LucideIcon }[] = [
    { kind: 'evidence', label: 'Add photo', sub: 'Before / after', icon: Camera },
    { kind: 'time', label: 'Record time', sub: 'Extra minutes', icon: Timer },
    { kind: 'material', label: 'Add material', sub: 'Parts & costs', icon: Package },
    { kind: 'issue', label: 'Record issue', sub: 'Problems found', icon: TriangleAlert },
  ];

  const taskSection = (
    <section aria-labelledby="qu-tasks" className={initialView === 'tasks' ? '' : 'mt-5'}>
      <h3 id="qu-tasks" className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted">
        <span>Complete {round ? 'a home' : 'a task'}</span>
        <span className="tabular normal-case tracking-normal">
          {tasks.filter((x) => x.status === 'completed').length} of {tasks.length} done
        </span>
      </h3>
      {listed.length ? (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
          {listed.map((task) => {
            const done = task.status === 'completed';
            return (
              <li key={task.id}>
                <button type="button" role="checkbox" aria-checked={done} onClick={() => toggle(task.id)} className="flex min-h-14 w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-subtle">
                  <span className={cx('grid size-8 shrink-0 place-items-center rounded-full border-2 transition', done ? 'animate-pop border-success bg-success text-white' : 'border-line-2 text-transparent')}>
                    <Check className="size-4.5" strokeWidth={3} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cx('block text-sm font-semibold', done ? 'text-muted line-through' : 'text-ink')}>{task.title}</span>
                    <span className="block text-xs text-muted">{done ? 'Done — tap to undo' : `${task.status === 'blocked' ? 'Blocked · ' : task.status === 'in-progress' ? 'In progress · ' : ''}est. ${task.estimatedMinutes} min`}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="flex items-center gap-2 rounded-xl bg-success-soft p-3 text-sm font-semibold text-success-ink">
          <Check className="size-4" aria-hidden /> Every {round ? 'home' : 'task'} on this job is done.
        </p>
      )}
    </section>
  );

  return (
    <PhoneSheet open={open} onClose={onClose} title="Quick update" tall>
      <div className="-mt-1 mb-4 flex items-center gap-3 rounded-xl bg-subtle p-2.5">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg" style={{ background: t.soft, color: t.ink }}>
          <ServiceIcon name={icon(job)} className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-ink">{headline(job)}</span>
          <span className="tabular block text-xs text-muted">
            {job.ref} · {timeRange(job.scheduledStart, job.scheduledEnd)}
          </span>
        </span>
        {choices.length > 1 && (
          <button type="button" onClick={() => setSelected(undefined)} className="h-11 shrink-0 rounded-control px-3 text-[13px] font-semibold text-secondary-ink hover:bg-surface">
            Change
          </button>
        )}
      </div>

      {initialView === 'tasks' && taskSection}

      <button
        type="button"
        data-autofocus={initialView === 'menu' ? true : undefined}
        onClick={() => onPick('voice', job.id)}
        className={cx('group flex w-full items-center gap-3.5 rounded-card bg-accent-solid p-4 text-left text-accent-on shadow-raised transition hover:brightness-110 active:scale-[0.99]', initialView === 'tasks' && 'mt-5')}
      >
        <span className="relative grid size-12 shrink-0 place-items-center rounded-full bg-white/20">
          <span className="absolute inset-0 animate-pulse-ring rounded-full bg-white/30" aria-hidden />
          <Mic className="relative size-6" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-bold">Voice update</span>
          <span className="block text-[13px] opacity-85">Say what you did — FieldMate fills in the job</span>
        </span>
        <ChevronRight className="size-5 opacity-80 transition group-hover:translate-x-0.5" aria-hidden />
      </button>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <button key={tile.kind} type="button" onClick={() => onPick(tile.kind, job.id)} className="flex min-h-[76px] items-center gap-3 rounded-xl border border-line bg-surface p-3 text-left transition hover:bg-subtle active:scale-[0.98]">
              <span className={cx('grid size-10 shrink-0 place-items-center rounded-lg', tile.kind === 'issue' ? 'bg-warning-soft text-warning-ink' : 'bg-secondary-soft text-secondary-ink')}>
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-ink">{tile.label}</span>
                <span className="block text-xs text-muted">{tile.sub}</span>
              </span>
            </button>
          );
        })}
      </div>

      {initialView === 'menu' && taskSection}
    </PhoneSheet>
  );
}
