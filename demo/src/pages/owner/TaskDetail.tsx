import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Camera, CheckCircle2, CheckSquare, Clock, ClipboardCheck, Link2, Package, Pause, Play, Square, TriangleAlert } from 'lucide-react';
import { useDemo } from '../../app/DemoProvider';
import { getCustomer, getJob, getTask, tasksForJob } from '../../app/selectors';
import { Card, CardHeader, EmptyState, KeyValue } from '../../components/common/Card';
import { Button, LinkButton } from '../../components/common/Button';
import { PriorityBadge, ServiceBadge, StatusBadge } from '../../components/common/Badge';
import { WorkerAvatar } from '../../components/common/Avatar';
import { Timeline } from '../../components/common/Timeline';
import { useToast } from '../../components/common/Toast';
import { AddIssueDialog, AddMaterialDialog, AddTimeDialog, EvidenceDialog } from '../../components/shared/JobActionDialogs';
import { EvidenceGrid } from '../../components/shared/EvidenceGrid';
import { cx } from '../../utils/cx';
import { money, relativeDayTime } from '../../utils/format';

export default function TaskDetail() {
  const { id } = useParams();
  const { state, actions } = useDemo();
  const toast = useToast();
  const d = state.data;
  const task = getTask(d, id);
  const [dialog, setDialog] = useState<null | 'time' | 'material' | 'issue' | 'evidence'>(null);
  if (!task) return <EmptyState icon={ClipboardCheck} title="Task not found" action={<LinkButton to="/app/tasks">Back to tasks</LinkButton>} />;
  const job = getJob(d, task.jobId)!;
  const customer = getCustomer(d, job.customerId);
  const siblings = tasksForJob(d, job.id);
  const dependency = siblings.find((t) => t.id === task.dependsOn);
  const evidence = d.evidence.filter((e) => e.taskId === task.id);
  const issues = job.issues.filter((i) => i.taskId === task.id);
  const materials = job.materials.filter((m) => m.taskId === task.id);
  const member = d.team.find((m) => m.id === task.assignedWorkerId);
  const by = task.assignedWorkerId ?? 'w-sophie';
  const set = (s: typeof task.status, label: string) => {
    actions.updateTaskStatus(task.id, s, by);
    toast({ title: label, description: task.title });
  };

  return (
    <div className="space-y-6">
      <Link to={`/app/jobs/${job.id}?tab=tasks`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> {job.ref} · {job.title}
      </Link>
      <div className="card p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge kind="task" status={task.status} />
              <ServiceBadge service={job.service} />
              <PriorityBadge priority={task.priority} />
              <span className="text-xs font-semibold text-muted">Task {task.order} of {siblings.length}</span>
            </div>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink">{task.title}</h1>
            {task.outcome && (
              <p className="mt-1 flex items-start gap-2 text-[15px] text-ink-2">
                <CheckCircle2 className="mt-0.5 size-4.5 shrink-0 text-accent-ink" aria-hidden /> Outcome: {task.outcome}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {task.status !== 'in-progress' && task.status !== 'completed' && (
              <Button icon={<Play className="size-4" />} onClick={() => set('in-progress', 'Task started')}>
                Start
              </Button>
            )}
            {task.status === 'in-progress' && (
              <Button variant="outline" icon={<Pause className="size-4" />} onClick={() => set('ready', 'Task paused')}>
                Pause
              </Button>
            )}
            {task.status !== 'blocked' && task.status !== 'completed' && (
              <Button variant="outline" className="text-danger-ink" icon={<TriangleAlert className="size-4" />} onClick={() => set('blocked', 'Task blocked')}>
                Block
              </Button>
            )}
            {task.status !== 'completed' ? (
              <Button icon={<CheckCircle2 className="size-4" />} onClick={() => set('completed', 'Task completed')}>
                Complete
              </Button>
            ) : (
              <Button variant="outline" onClick={() => set('ready', 'Task reopened')}>
                Reopen
              </Button>
            )}
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
          <Button size="sm" variant="soft" icon={<Clock className="size-4" />} onClick={() => setDialog('time')}>
            Add Time
          </Button>
          <Button size="sm" variant="soft" icon={<Package className="size-4" />} onClick={() => setDialog('material')}>
            Add Material
          </Button>
          <Button size="sm" variant="soft" icon={<TriangleAlert className="size-4" />} onClick={() => setDialog('issue')}>
            Add Issue
          </Button>
          <Button size="sm" variant="soft" icon={<Camera className="size-4" />} onClick={() => setDialog('evidence')}>
            Add Evidence
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          {task.checklist && (
            <Card>
              <CardHeader title="Checklist" />
              <ul className="space-y-2">
                {task.checklist.map((c) => (
                  <li key={c.label} className="flex items-center gap-2.5 text-sm">
                    {c.done || task.status === 'completed' ? <CheckSquare className="size-5 text-success" aria-hidden /> : <Square className="size-5 text-line-2" aria-hidden />}
                    <span className={cx(c.done || task.status === 'completed' ? 'text-muted line-through' : 'text-ink')}>{c.label}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <Card>
            <CardHeader title="Evidence" icon={Camera} />
            <EvidenceGrid items={evidence} cols="grid-cols-2 sm:grid-cols-3" empty="No photos linked to this task yet" />
          </Card>
          <Card>
            <CardHeader title="Task timeline" />
            <Timeline entries={task.timeline} empty="No updates on this task yet." />
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Details" />
            <dl className="grid grid-cols-2 gap-4">
              <KeyValue label="Worker">
                <span className="inline-flex items-center gap-2">
                  {task.assignedWorkerId && <WorkerAvatar id={task.assignedWorkerId} size="xs" />} {member?.name ?? 'Unassigned'}
                </span>
              </KeyValue>
              <KeyValue label="When">{relativeDayTime(job.scheduledStart)}</KeyValue>
              <KeyValue label="Estimated">{task.estimatedMinutes} min</KeyValue>
              <KeyValue label="Actual">
                <span className={cx((task.actualMinutes ?? 0) > task.estimatedMinutes && 'font-bold text-warning-ink')}>{task.actualMinutes !== undefined ? `${task.actualMinutes} min` : '—'}</span>
              </KeyValue>
              <KeyValue label="Customer" className="col-span-2">
                {customer?.name ?? job.title}
              </KeyValue>
              <KeyValue label="Depends on" className="col-span-2">
                {dependency ? (
                  <Link to={`/app/tasks/${dependency.id}`} className="inline-flex items-center gap-1.5 hover:text-secondary-ink">
                    <Link2 className="size-3.5" aria-hidden /> {dependency.title} <StatusBadge kind="task" status={dependency.status} className="h-5 px-2 text-[11px]" />
                  </Link>
                ) : (
                  'No dependency'
                )}
              </KeyValue>
            </dl>
          </Card>
          <Card>
            <CardHeader title="Issues" icon={TriangleAlert} />
            {issues.length ? (
              issues.map((i) => (
                <p key={i.id} className={cx('mb-2 rounded-lg p-3 text-sm', i.resolved ? 'bg-subtle' : 'bg-danger-soft')}>
                  <span className="font-semibold">{i.title}</span>
                  {i.detail ? ` — ${i.detail}` : ''}
                </p>
              ))
            ) : (
              <p className="text-sm text-muted">No issues.</p>
            )}
          </Card>
          <Card>
            <CardHeader title="Materials" icon={Package} />
            {materials.length ? (
              materials.map((m) => (
                <p key={m.id} className="flex justify-between text-sm">
                  <span>{m.description}</span>
                  <span className="tabular font-semibold">{money(m.cost, true)}</span>
                </p>
              ))
            ) : (
              <p className="text-sm text-muted">No materials.</p>
            )}
          </Card>
        </div>
      </div>
      <AddTimeDialog open={dialog === 'time'} onClose={() => setDialog(null)} job={job} tasks={siblings} by={by} defaultTaskId={task.id} />
      <AddMaterialDialog open={dialog === 'material'} onClose={() => setDialog(null)} job={job} tasks={siblings} by={by} defaultTaskId={task.id} />
      <AddIssueDialog open={dialog === 'issue'} onClose={() => setDialog(null)} job={job} tasks={siblings} by={by} defaultTaskId={task.id} />
      <EvidenceDialog open={dialog === 'evidence'} onClose={() => setDialog(null)} job={job} tasks={siblings} by={by} defaultTaskId={task.id} />
    </div>
  );
}
