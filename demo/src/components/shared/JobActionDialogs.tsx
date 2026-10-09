import { useEffect, useState } from 'react';
import { CheckCircle2, CloudUpload, ImagePlus } from 'lucide-react';
import type { EvidenceItem, Job, Task } from '../../types/domain';
import { useDemo } from '../../app/DemoProvider';
import { PHOTO_LIBRARY } from '../../data/templates';
import { DEFAULT_CREW } from '../../data/templates';
import { ActionShell } from '../common/Sheet';
import { Button } from '../common/Button';
import { Segmented, SelectInput, TextArea, TextInput } from '../common/Form';
import { useToast } from '../common/Toast';
import { asset, cx } from '../../utils/cx';
import { money } from '../../utils/format';

type Variant = 'modal' | 'sheet';
interface Base {
  open: boolean;
  onClose: () => void;
  job: Job;
  tasks: Task[];
  by: string;
  variant?: Variant;
  defaultTaskId?: string;
}

const TaskSelect = ({ tasks, value, onChange, optional }: { tasks: Task[]; value: string; onChange: (v: string) => void; optional?: boolean }) => (
  <SelectInput label="Task" value={value} onChange={(e) => onChange(e.target.value)}>
    {optional && <option value="">Whole job</option>}
    {tasks.map((t) => (
      <option key={t.id} value={t.id}>
        {t.order}. {t.title}
      </option>
    ))}
  </SelectInput>
);

export function AddTimeDialog({ open, onClose, job, tasks, by, variant, defaultTaskId }: Base) {
  const { actions } = useDemo();
  const toast = useToast();
  const [taskId, setTaskId] = useState(defaultTaskId ?? tasks.find((t) => t.status === 'in-progress')?.id ?? tasks[0]?.id ?? '');
  const [minutes, setMinutes] = useState(15);
  const [note, setNote] = useState('');
  useEffect(() => {
    if (open) setTaskId(defaultTaskId ?? tasks.find((t) => t.status === 'in-progress')?.id ?? tasks[0]?.id ?? '');
  }, [open, defaultTaskId, tasks]);
  const save = () => {
    actions.addTaskTime(taskId, minutes, note || undefined, by);
    toast({ title: `+${minutes} min recorded`, description: tasks.find((t) => t.id === taskId)?.title });
    onClose();
    setNote('');
  };
  return (
    <ActionShell variant={variant} open={open} onClose={onClose} title="Record time" description={job.title} footer={<Button full={variant === 'sheet'} size={variant === 'sheet' ? 'lg' : 'md'} onClick={save} disabled={!taskId}>Add {minutes} minutes</Button>}>
      <div className="space-y-4">
        <TaskSelect tasks={tasks} value={taskId} onChange={setTaskId} />
        <div>
          <p className="mb-2 text-sm font-semibold text-ink-2">Extra time</p>
          <div className="grid grid-cols-4 gap-2">
            {[10, 15, 25, 30, 45, 60, 90, 120].map((m) => (
              <button key={m} type="button" aria-pressed={minutes === m} onClick={() => setMinutes(m)} className={cx('h-11 rounded-control border text-sm font-semibold', minutes === m ? 'border-secondary-solid bg-secondary-soft text-secondary-ink' : 'border-line-2 text-ink-2')}>
                {m < 60 ? `${m}m` : `${m / 60}h`}
              </button>
            ))}
          </div>
        </div>
        <TextInput label="Reason (optional)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. blocked downpipe" />
      </div>
    </ActionShell>
  );
}

export function AddMaterialDialog({ open, onClose, job, tasks, by, variant, defaultTaskId }: Base) {
  const { actions } = useDemo();
  const toast = useToast();
  const presets = job.service === 'plumbing' ? [['Compression fittings (15mm)', 6.8], ['Tap cartridge (35mm)', 18], ['Isolation valve (15mm)', 7.5], ['40mm waste trap', 9.4]] : job.service === 'gutter' ? [['Downpipe connector', 8.5], ['Gutter sealant', 6.2], ['Gutter guard (2m)', 14]] : [['Squeegee rubber', 4.5], ['Resin filter top-up', 12], ['Conservatory brush head', 18]];
  const [desc, setDesc] = useState(String(presets[0][0]));
  const [cost, setCost] = useState(String(presets[0][1]));
  const [taskId, setTaskId] = useState(defaultTaskId ?? '');
  const save = () => {
    const c = Number(cost) || 0;
    actions.addMaterial(job.id, desc, c, taskId || undefined, by);
    toast({ title: 'Material added', description: `${desc} — ${money(c, true)}` });
    onClose();
  };
  return (
    <ActionShell variant={variant} open={open} onClose={onClose} title="Add material" description={job.title} footer={<Button full={variant === 'sheet'} size={variant === 'sheet' ? 'lg' : 'md'} onClick={save}>Add material</Button>}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {presets.map(([d, c]) => (
            <button key={String(d)} type="button" onClick={() => { setDesc(String(d)); setCost(String(c)); }} className={cx('rounded-full border px-3 py-1.5 text-xs font-semibold', desc === d ? 'border-secondary-solid bg-secondary-soft text-secondary-ink' : 'border-line-2 text-ink-2')}>
              {String(d)}
            </button>
          ))}
        </div>
        <TextInput label="Description" value={desc} onChange={(e) => setDesc(e.target.value)} />
        <TextInput label="Cost (£)" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} />
        <TaskSelect tasks={tasks} value={taskId} onChange={setTaskId} optional />
      </div>
    </ActionShell>
  );
}

export function AddIssueDialog({ open, onClose, job, tasks, by, variant, defaultTaskId }: Base) {
  const { actions } = useDemo();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high'>('medium');
  const [taskId, setTaskId] = useState(defaultTaskId ?? '');
  const [block, setBlock] = useState(false);
  const suggestions = job.service === 'plumbing' ? ['Part not on van', 'Seized isolation valve', 'Customer not home'] : job.service === 'gutter' ? ['Blocked downpipe', 'Damaged gutter joint', 'Heavy moss build-up'] : ['Access to rear blocked', 'Cracked pane spotted', 'Moss on conservatory roof'];
  const save = () => {
    const t = title.trim() || suggestions[0];
    if (block) actions.updateJobStatus(job.id, 'blocked', t, by);
    else actions.addIssue(job.id, t, detail || undefined, severity, taskId || undefined, by);
    toast({ title: block ? 'Job marked blocked' : 'Issue recorded', description: t, tone: 'warning' });
    onClose();
    setTitle('');
    setDetail('');
  };
  return (
    <ActionShell variant={variant} open={open} onClose={onClose} title="Record issue" description={job.title} footer={<Button full={variant === 'sheet'} size={variant === 'sheet' ? 'lg' : 'md'} variant={block ? 'danger' : 'primary'} onClick={save}>{block ? 'Record & block job' : 'Record issue'}</Button>}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button key={s} type="button" onClick={() => setTitle(s)} className={cx('rounded-full border px-3 py-1.5 text-xs font-semibold', title === s ? 'border-danger bg-danger-soft text-danger-ink' : 'border-line-2 text-ink-2')}>
              {s}
            </button>
          ))}
        </div>
        <TextInput label="Issue" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={suggestions[0]} />
        <TextArea label="Details (optional)" rows={2} value={detail} onChange={(e) => setDetail(e.target.value)} />
        <div>
          <p className="mb-2 text-sm font-semibold text-ink-2">Severity</p>
          <Segmented label="Severity" value={severity} onChange={setSeverity} options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }]} />
        </div>
        <TaskSelect tasks={tasks} value={taskId} onChange={setTaskId} optional />
        <label className="flex items-center gap-2.5 text-sm font-medium text-ink">
          <input type="checkbox" checked={block} onChange={(e) => setBlock(e.target.checked)} className="size-4.5 accent-[var(--brand-secondary-solid)]" /> This stops the job — mark it blocked
        </label>
      </div>
    </ActionShell>
  );
}

export function EvidenceDialog({ open, onClose, job, tasks, by, variant, defaultTaskId, defaultType }: Base & { defaultType?: 'before' | 'after' }) {
  const { actions } = useDemo();
  const toast = useToast();
  const library = PHOTO_LIBRARY[job.service];
  const [type, setType] = useState<'before' | 'after'>(defaultType ?? 'before');
  const [picked, setPicked] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [taskId, setTaskId] = useState(defaultTaskId ?? '');
  const [progress, setProgress] = useState<number | null>(null);
  useEffect(() => {
    if (!open) return;
    setType(defaultType ?? 'before');
    setPicked(null);
    setProgress(null);
    setTaskId(defaultTaskId ?? tasks.find((t) => /photo/i.test(t.title) && t.status !== 'completed')?.id ?? '');
  }, [open, defaultType, defaultTaskId, tasks]);
  const options = [...library].sort((a, b) => (a.type === type ? -1 : 0) - (b.type === type ? -1 : 0));
  const upload = () => {
    if (!picked) return;
    setProgress(0);
    let p = 0;
    const timer = window.setInterval(() => {
      p += 20;
      setProgress(p);
      if (p >= 100) {
        window.clearInterval(timer);
        const item = library.find((x) => x.url === picked)!;
        actions.addEvidence(job.id, [{ type: type as EvidenceItem['type'], url: picked, caption: caption.trim() || item.caption, taskId: taskId || undefined }], by);
        toast({ title: `${type === 'before' ? 'Before' : 'After'} photo added`, description: `Linked to ${job.ref}${taskId ? ` · ${tasks.find((t) => t.id === taskId)?.title}` : ''}` });
        onClose();
        setCaption('');
      }
    }, 160);
  };
  return (
    <ActionShell
      variant={variant}
      open={open}
      onClose={onClose}
      tall
      title="Add photo evidence"
      description="Demo camera — choose a sample photo (no real upload)."
      footer={
        progress !== null ? (
          <div>
            <div className="flex items-center justify-between text-sm font-semibold text-ink">
              <span className="flex items-center gap-2">
                <CloudUpload className="size-4 text-secondary-ink" aria-hidden /> Uploading…
              </span>
              <span className="tabular">{progress}%</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-subtle">
              <div className="h-2 rounded-full bg-secondary transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : (
          <Button full={variant === 'sheet'} size={variant === 'sheet' ? 'lg' : 'md'} disabled={!picked} icon={<ImagePlus className="size-4.5" />} onClick={upload}>
            Upload photo
          </Button>
        )
      }
    >
      <div className="space-y-4">
        <Segmented label="Photo type" value={type} onChange={setType} options={[{ value: 'before', label: 'Before' }, { value: 'after', label: 'After' }]} />
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Demo photos">
          {options.map((p) => (
            <button
              key={p.url}
              type="button"
              role="radio"
              aria-checked={picked === p.url}
              aria-label={p.caption}
              onClick={() => {
                setPicked(p.url);
                if (!caption) setCaption(p.caption);
              }}
              className={cx('relative aspect-square overflow-hidden rounded-xl ring-offset-2 transition', picked === p.url ? 'ring-3 ring-secondary-solid' : 'hover:opacity-90')}
            >
              <img src={asset(p.url)} alt="" className="size-full object-cover" />
              {picked === p.url && (
                <span className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-secondary-solid text-white">
                  <CheckCircle2 className="size-4" aria-hidden />
                </span>
              )}
            </button>
          ))}
        </div>
        <TextInput label="Caption" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="What does this photo show?" />
        <TaskSelect tasks={tasks} value={taskId} onChange={setTaskId} optional />
      </div>
    </ActionShell>
  );
}

export function BlockJobDialog({ open, onClose, job, by, variant }: Omit<Base, 'tasks'>) {
  const { actions } = useDemo();
  const toast = useToast();
  const [reason, setReason] = useState('Waiting for parts');
  const save = () => {
    actions.updateJobStatus(job.id, 'blocked', reason, by);
    toast({ title: 'Job marked blocked', description: reason, tone: 'warning' });
    onClose();
  };
  return (
    <ActionShell variant={variant} open={open} onClose={onClose} title="Mark job blocked" description="The office and customer will see the job is paused." footer={<Button variant="danger" onClick={save}>Mark blocked</Button>}>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {['Waiting for parts', 'Customer not home', 'Weather — unsafe to work', 'Access issue'].map((r) => (
            <button key={r} type="button" onClick={() => setReason(r)} className={cx('rounded-full border px-3 py-1.5 text-xs font-semibold', reason === r ? 'border-danger bg-danger-soft text-danger-ink' : 'border-line-2 text-ink-2')}>
              {r}
            </button>
          ))}
        </div>
        <TextInput label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
    </ActionShell>
  );
}

export function ScheduleJobDialog({ open, onClose, job }: { open: boolean; onClose: () => void; job: Job }) {
  const { state, actions } = useDemo();
  const toast = useToast();
  const workers = state.data.team.filter((m) => !m.isOffice && m.active);
  const [date, setDate] = useState(job.scheduledStart?.slice(0, 10) ?? '2026-10-12');
  const [start, setStart] = useState(job.scheduledStart?.slice(11, 16) ?? '10:00');
  const [mins, setMins] = useState(() => {
    if (job.scheduledStart && job.scheduledEnd) {
      const m = (s: string) => Number(s.slice(11, 13)) * 60 + Number(s.slice(14, 16));
      return m(job.scheduledEnd) - m(job.scheduledStart);
    }
    return job.estimatedMinutes ?? 90;
  });
  const [crew, setCrew] = useState<string[]>(job.assignedWorkerIds.length ? job.assignedWorkerIds : DEFAULT_CREW[job.service]);
  const save = () => {
    const [h, m] = start.split(':').map(Number);
    const endM = h * 60 + m + mins;
    const end = `${date}T${String(Math.floor(endM / 60)).padStart(2, '0')}:${String(endM % 60).padStart(2, '0')}`;
    actions.scheduleJob(job.id, `${date}T${start}`, end, crew);
    toast({ title: 'Job scheduled', description: `${job.title} · ${date} ${start}`, action: { label: 'View schedule', to: '/app/schedule' } });
    onClose();
  };
  return (
    <ActionShell
      open={open}
      onClose={onClose}
      title={job.scheduledStart ? 'Reschedule job' : 'Schedule job'}
      description={`${job.ref} · ${job.title}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!crew.length}>
            Save schedule
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <TextInput label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <TextInput label="Start" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
        <SelectInput label="Duration" value={String(mins)} onChange={(e) => setMins(Number(e.target.value))}>
          {[30, 45, 60, 75, 80, 90, 120, 150, 180, 240].map((m) => (
            <option key={m} value={m}>
              {m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}`}
            </option>
          ))}
        </SelectInput>
      </div>
      <p className="mb-2 mt-5 text-sm font-semibold text-ink-2">Assign team</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {workers.map((w) => {
          const on = crew.includes(w.id);
          return (
            <button key={w.id} type="button" aria-pressed={on} onClick={() => setCrew(on ? crew.filter((x) => x !== w.id) : [...crew, w.id])} className={cx('rounded-xl border p-3 text-left text-sm', on ? 'border-secondary-solid bg-secondary-soft' : 'border-line hover:bg-subtle')}>
              <span className="block font-semibold text-ink">{w.name}</span>
              <span className="block text-xs text-muted">{w.skills.slice(0, 2).join(', ')}</span>
            </button>
          );
        })}
      </div>
    </ActionShell>
  );
}
