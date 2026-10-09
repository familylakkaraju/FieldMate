import { useMemo, useState, type DragEvent } from 'react';
import { Link } from 'react-router-dom';
import { Clock, GripVertical } from 'lucide-react';
import type { Task, TaskStatus } from '../../types/domain';
import { useDemo } from '../../app/DemoProvider';
import { getCustomer, getJob } from '../../app/selectors';
import { addDays, DEMO_DATE } from '../../data/demoClock';
import { PageHeader } from '../../components/common/Card';
import { FilterChips, SelectInput } from '../../components/common/Form';
import { PriorityBadge, ServiceBadge, StatusBadge } from '../../components/common/Badge';
import { WorkerAvatar } from '../../components/common/Avatar';
import { useToast } from '../../components/common/Toast';
import { cx } from '../../utils/cx';
import { relativeDay } from '../../utils/format';

const COLUMNS: TaskStatus[] = ['ready', 'scheduled', 'in-progress', 'blocked', 'completed'];

export default function Tasks() {
  const { state, actions } = useDemo();
  const toast = useToast();
  const d = state.data;
  const [range, setRange] = useState<'today' | 'week' | 'all'>('today');
  const [worker, setWorker] = useState('all');
  const [dragOver, setDragOver] = useState<TaskStatus | null>(null);

  const tasks = useMemo(() => {
    const until = addDays(DEMO_DATE, 7);
    return d.tasks.filter((t) => {
      const j = getJob(d, t.jobId);
      if (!j) return false;
      const day = j.scheduledStart?.slice(0, 10);
      if (range === 'today' && day !== DEMO_DATE) return false;
      if (range === 'week' && (!day || day < DEMO_DATE || day >= until)) return false;
      if (range === 'all' && ['closed', 'invoiced'].includes(j.status)) return false;
      if (worker !== 'all' && t.assignedWorkerId !== worker) return false;
      return true;
    });
  }, [d, range, worker]);

  const move = (taskId: string, status: TaskStatus) => {
    const t = d.tasks.find((x) => x.id === taskId);
    if (!t || t.status === status) return;
    actions.updateTaskStatus(taskId, status, t.assignedWorkerId ?? 'w-sophie');
    toast({ title: `Task moved to ${status.replace('-', ' ')}`, description: t.title });
  };

  const onDrop = (e: DragEvent, status: TaskStatus) => {
    e.preventDefault();
    setDragOver(null);
    const id = e.dataTransfer.getData('text/plain');
    if (id) move(id, status);
  };

  return (
    <div>
      <PageHeader title="Tasks" subtitle="Drag cards between columns — or open a task to update it. Changes sync to the worker app." />
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <FilterChips label="Date range" value={range} onChange={setRange} options={[{ value: 'today', label: 'Today' }, { value: 'week', label: 'Next 7 days' }, { value: 'all', label: 'All open jobs' }]} />
        <div className="w-full md:w-56">
          <SelectInput label="Worker" value={worker} onChange={(e) => setWorker(e.target.value)} className="[&_label]:sr-only">
            <option value="all">Everyone</option>
            {d.team.filter((m) => !m.isOffice).map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </SelectInput>
        </div>
      </div>
      <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        {COLUMNS.map((status) => {
          const items = tasks.filter((t) => t.status === status).sort((a, b) => (getJob(d, a.jobId)?.scheduledStart ?? '') < (getJob(d, b.jobId)?.scheduledStart ?? '') ? -1 : 1);
          return (
            <section
              key={status}
              aria-label={`${status} tasks`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(status);
              }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => onDrop(e, status)}
              className="w-[280px] shrink-0"
            >
              <div className="mb-2 flex items-center justify-between px-1">
                <StatusBadge kind="task" status={status} />
                <span className="text-xs font-semibold text-muted">{items.length}</span>
              </div>
              <div className={cx('min-h-40 space-y-2 rounded-card p-2 transition', dragOver === status ? 'bg-secondary-soft ring-2 ring-secondary-solid' : 'bg-subtle/70')}>
                {items.map((t) => (
                  <TaskCard key={t.id} task={t} onMove={move} />
                ))}
                {!items.length && <p className="p-4 text-center text-xs text-muted">Drop tasks here</p>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function TaskCard({ task, onMove }: { task: Task; onMove: (id: string, s: TaskStatus) => void }) {
  const { state } = useDemo();
  const job = getJob(state.data, task.jobId)!;
  const customer = getCustomer(state.data, job.customerId);
  return (
    <article
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/plain', task.id)}
      className="group cursor-grab rounded-xl border border-line bg-surface p-3 shadow-card transition hover:shadow-raised active:cursor-grabbing"
    >
      <div className="flex items-start gap-2">
        <GripVertical className="mt-0.5 size-4 shrink-0 text-line-2 group-hover:text-muted" aria-hidden />
        <div className="min-w-0 flex-1">
          <Link to={`/app/tasks/${task.id}`} className="text-sm font-semibold text-ink hover:text-secondary-ink">
            {task.title}
          </Link>
          <p className="mt-0.5 truncate text-xs text-muted">
            {job.ref} · {customer?.name ?? job.title}
          </p>
        </div>
        {task.assignedWorkerId && <WorkerAvatar id={task.assignedWorkerId} size="xs" />}
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <ServiceBadge service={job.service} short className="h-5 px-2 text-[11px]" />
        <PriorityBadge priority={task.priority} />
        <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted">
          <Clock className="size-3" aria-hidden /> {relativeDay(job.scheduledStart)} {job.scheduledStart?.slice(11, 16)}
        </span>
      </div>
      <label className="sr-only" htmlFor={`mv-${task.id}`}>
        Move {task.title}
      </label>
      <select
        id={`mv-${task.id}`}
        value={task.status}
        onChange={(e) => onMove(task.id, e.target.value as TaskStatus)}
        className="mt-2 h-8 w-full rounded-lg border border-line bg-canvas px-2 text-xs font-semibold text-ink-2 md:sr-only md:focus:not-sr-only"
      >
        {COLUMNS.map((c) => (
          <option key={c} value={c}>
            Move to: {c.replace('-', ' ')}
          </option>
        ))}
      </select>
    </article>
  );
}
