import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AudioLines, Camera, Check, CheckCheck, ListChecks, Mic, Minus, Package, Pencil, Plus, Sparkles, Timer, TriangleAlert, type LucideIcon } from 'lucide-react';
import type { EvidenceItem, Job, ServiceType, Task } from '../../types/domain';
import { useDemo } from '../../app/DemoProvider';
import { PRIYA_LEAD_ID } from '../../data/leads';
import { VOICE_SCRIPTS, type VoiceScript } from '../../data/templates';
import { PhoneSheet } from '../common/Sheet';
import { useToast } from '../common/Toast';
import { asset, cx } from '../../utils/cx';
import { money } from '../../utils/format';

type Phase = 'idle' | 'listening' | 'transcript' | 'interpreting' | 'review' | 'applied';
type CardKey = 'tasks' | 'time' | 'issue' | 'material' | 'evidence';

const WORK_LABEL: Record<ServiceType, string> = { gutter: 'Gutter clean', window: 'Window clean', plumbing: 'Tap repair' };
const BARS = [0.35, 0.6, 0.9, 0.5, 0.75, 1, 0.55, 0.8, 0.4, 0.95, 0.65, 0.45, 0.85, 0.6, 1, 0.5, 0.7, 0.4, 0.9, 0.55, 0.75, 0.35, 0.6, 0.85];

const prefersReducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

interface Plan {
  script: VoiceScript;
  matched: Task[];
  timeTask?: Task;
}

/** Choose the script for this job and map its task titles onto the job's open tasks. */
function buildPlan(job: Job, tasks: Task[]): Plan {
  const script = (job.leadId === PRIYA_LEAD_ID ? VOICE_SCRIPTS['shah-gutter'] : VOICE_SCRIPTS[job.service]) ?? VOICE_SCRIPTS.gutter;
  const open = tasks.filter((t) => t.status !== 'completed');
  let matched = open.filter((t) => script.completeTaskTitles.includes(t.title));
  if (!matched.length && job.kind === 'round') matched = open; // "all the windows are done" → the remaining homes
  const timeTask = tasks.find((t) => t.title === script.timeTaskTitle) ?? matched[0] ?? tasks[0];
  return { script, matched, timeTask };
}

/** W04 — simulated voice update. No microphone or speech service is used. */
export function VoiceUpdateSheet({ open, onClose, job, tasks, by }: { open: boolean; onClose: () => void; job: Job; tasks: Task[]; by: string }) {
  const { state, actions } = useDemo();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [plan] = useState(() => buildPlan(job, tasks));
  const [reduced] = useState(prefersReducedMotion);
  const [phase, setPhase] = useState<Phase>('idle');
  const [words, setWords] = useState(0);
  const [editing, setEditing] = useState(false);
  const [minutes, setMinutes] = useState(plan.script.extraMinutes);
  const [taskSel, setTaskSel] = useState<string[]>(() => plan.matched.map((t) => t.id));
  const [include, setInclude] = useState<Record<CardKey, boolean>>({ tasks: true, time: true, issue: true, material: true, evidence: true });
  const [appliedCount, setAppliedCount] = useState(0);
  const reviewRef = useRef<HTMLDivElement>(null);

  const tokens = useMemo(() => plan.script.transcript.split(/\s+/), [plan]);
  const worker = state.data.team.find((m) => m.id === by);
  const round = job.kind === 'round';
  const { script, matched, timeTask } = plan;

  // Phase machine: listening → transcript (word stream) → interpreting → review.
  useEffect(() => {
    if (phase === 'listening') {
      const t = window.setTimeout(() => setPhase('transcript'), reduced ? 400 : 1500);
      return () => window.clearTimeout(t);
    }
    if (phase === 'transcript') {
      if (reduced) {
        setWords(tokens.length);
        const t = window.setTimeout(() => setPhase('interpreting'), 500);
        return () => window.clearTimeout(t);
      }
      let n = 0;
      const iv = window.setInterval(() => {
        n += 1;
        setWords(n);
        if (n >= tokens.length) window.clearInterval(iv);
      }, 60);
      const t = window.setTimeout(() => setPhase('interpreting'), tokens.length * 60 + 650);
      return () => {
        window.clearInterval(iv);
        window.clearTimeout(t);
      };
    }
    if (phase === 'interpreting') {
      const t = window.setTimeout(() => setPhase('review'), reduced ? 300 : 1200);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [phase, reduced, tokens.length]);

  useEffect(() => {
    if (phase === 'review' || phase === 'interpreting') reviewRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' });
  }, [phase, reduced]);

  const has = {
    tasks: matched.length > 0,
    time: !!timeTask && script.extraMinutes > 0,
    issue: !!script.issue,
    material: !!script.material,
    evidence: script.evidence.length > 0,
  };
  const active = (k: CardKey) => has[k] && include[k] && (k !== 'tasks' || taskSel.length > 0) && (k !== 'time' || minutes > 0);
  const count = (Object.keys(has) as CardKey[]).filter(active).length;
  const flip = (k: CardKey) => setInclude((x) => ({ ...x, [k]: !x[k] }));

  const start = () => {
    setWords(0);
    setPhase('listening');
  };

  const confirm = () => {
    const useTime = active('time');
    actions.applyVoiceUpdate(
      job.id,
      {
        transcript: script.transcript,
        completeTaskIds: active('tasks') ? taskSel : [],
        timeTaskId: useTime ? timeTask?.id : undefined,
        extraMinutes: useTime ? minutes : 0,
        issue: active('issue') ? script.issue : undefined,
        material: active('material') ? script.material : undefined,
        evidence: active('evidence') ? script.evidence.map((e) => ({ type: e.type as EvidenceItem['type'], url: e.url, caption: e.caption, taskId: timeTask?.id })) : [],
      },
      by,
    );
    setAppliedCount(count);
    setPhase('applied');
    toast({ title: 'Voice update applied', description: `${count} update${count === 1 ? '' : 's'} applied to ${job.ref} — the office and customer see it now.` });
  };

  const backToJob = () => {
    onClose();
    const path = `/worker/jobs/${job.id}`;
    if (location.pathname !== path) navigate(path);
  };

  const shown = tokens.slice(0, words).join(' ');
  const streaming = phase === 'transcript' && words < tokens.length;
  const announce =
    phase === 'listening'
      ? 'Listening'
      : phase === 'transcript'
        ? words >= tokens.length
          ? `Transcript: ${script.transcript}`
          : 'Transcribing'
        : phase === 'interpreting'
          ? 'FieldMate is interpreting the update'
          : phase === 'review'
            ? `${count} suggested updates ready to review`
            : phase === 'applied'
              ? `${appliedCount} updates applied to ${job.ref}`
              : '';

  const footer =
    phase === 'idle' ? (
      <button type="button" data-autofocus onClick={start} className="flex h-14 w-full items-center justify-center gap-2.5 rounded-control bg-accent-solid text-base font-bold text-accent-on shadow-raised transition hover:brightness-110 active:scale-[0.99]">
        <Mic className="size-5" aria-hidden /> Start Demo Voice Update
      </button>
    ) : phase === 'review' ? (
      <div className="grid grid-cols-[auto_1fr] gap-2">
        <button
          type="button"
          aria-pressed={editing}
          onClick={() => setEditing((v) => !v)}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-control border border-line-2 bg-surface px-4 text-[15px] font-semibold text-ink hover:bg-subtle"
        >
          {editing ? <Check className="size-4" aria-hidden /> : <Pencil className="size-4" aria-hidden />}
          {editing ? 'Done' : 'Edit'}
        </button>
        <button type="button" onClick={confirm} disabled={!count} className="inline-flex h-12 items-center justify-center gap-2 rounded-control bg-secondary-solid px-4 text-[15px] font-bold text-secondary-on shadow-sm transition hover:brightness-110 disabled:opacity-50">
          <CheckCheck className="size-5" aria-hidden /> Confirm Actions{count ? ` (${count})` : ''}
        </button>
      </div>
    ) : phase === 'applied' ? (
      <button type="button" data-autofocus onClick={backToJob} className="flex h-12 w-full items-center justify-center gap-2 rounded-control bg-secondary-solid text-[15px] font-bold text-secondary-on shadow-sm hover:brightness-110">
        Back to job
      </button>
    ) : (
      <p className="flex h-12 items-center justify-center gap-2 text-sm font-semibold text-muted">
        <span className="size-2 animate-pulse rounded-full bg-accent" aria-hidden />
        {phase === 'listening' ? 'Listening…' : phase === 'transcript' ? 'Transcribing…' : 'Interpreting…'}
      </p>
    );

  return (
    <PhoneSheet
      open={open}
      onClose={onClose}
      tall
      title={
        <span className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-full bg-accent-soft text-accent-ink">
            <Mic className="size-4" aria-hidden />
          </span>
          Voice update
        </span>
      }
      footer={footer}
    >
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
      <p className="-mt-1 mb-2 truncate text-[13px] text-muted">
        {job.ref} · {job.title}
      </p>

      {phase === 'applied' ? (
        <Applied count={appliedCount} job={job} />
      ) : (
        <>
          {(phase === 'idle' || phase === 'listening') && (
            <div className="flex flex-col items-center pb-2 pt-4 text-center">
              <button type="button" onClick={start} disabled={phase !== 'idle'} aria-label={phase === 'idle' ? 'Start demo voice update' : 'Listening'} className="relative grid size-44 place-items-center rounded-full outline-offset-4 disabled:cursor-default">
                {[0, 0.6, 1.2].map((delay) => (
                  <span
                    key={delay}
                    aria-hidden
                    className={cx('absolute inset-6 animate-pulse-ring rounded-full', phase === 'listening' ? 'bg-accent/35' : 'bg-accent/20')}
                    style={{ animationDelay: `${delay}s`, animationDuration: phase === 'listening' ? '1.5s' : '2.8s' }}
                  />
                ))}
                <span className={cx('relative grid size-24 place-items-center rounded-full bg-accent-solid text-accent-on shadow-float transition', phase === 'listening' && 'scale-105')}>
                  <Mic className="size-10" aria-hidden />
                </span>
              </button>
              {phase === 'idle' ? (
                <>
                  <h3 className="mt-3 font-display text-[22px] font-extrabold text-ink">Voice update</h3>
                  <p className="mt-1 max-w-[260px] text-sm text-muted">Speak naturally — FieldMate turns it into job updates</p>
                  <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-dashed border-warning bg-warning-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-warning-ink">
                    Demo — no microphone is used
                  </p>
                </>
              ) : (
                <>
                  <Waveform />
                  <p className="mt-2 text-base font-bold text-ink">Listening…</p>
                  <p className="text-[13px] text-muted">Talk like you would to the office</p>
                </>
              )}
            </div>
          )}

          {(phase === 'transcript' || phase === 'interpreting' || phase === 'review') && (
            <>
              <div className="flex items-center gap-3 rounded-xl bg-subtle px-3 py-2.5">
                <span className="relative grid size-9 shrink-0 place-items-center rounded-full bg-accent-solid text-accent-on">
                  <AudioLines className="size-4.5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-ink">{worker?.firstName ?? 'You'} · voice note</p>
                  <p className="tabular text-xs text-muted">0:{String(Math.min(59, Math.round(tokens.length / 2.4))).padStart(2, '0')} · transcribed on device (demo)</p>
                </div>
                {streaming && (
                  <span className="flex h-6 items-center gap-[2px]" aria-hidden>
                    {BARS.slice(0, 6).map((h, i) => (
                      <span key={i} className="w-[3px] origin-center animate-wave rounded-full bg-accent" style={{ height: `${h * 100}%`, animationDelay: `${i * 0.1}s` }} />
                    ))}
                  </span>
                )}
              </div>

              <figure className="relative mt-5 rounded-card border border-line bg-surface p-4 pt-5 shadow-card">
                <span className="absolute -top-3 left-4 inline-flex items-center gap-1.5 rounded-full bg-primary-solid px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-on">
                  <Mic className="size-3" aria-hidden /> Transcript
                </span>
                <blockquote className="text-[15px] font-medium leading-relaxed text-ink">
                  “{shown}
                  {streaming && <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-accent" aria-hidden />}
                  {!streaming && '”'}
                </blockquote>
              </figure>
            </>
          )}

          {phase === 'interpreting' && (
            <div ref={reviewRef} className="mt-4 animate-fade-in rounded-card border border-accent-tint bg-accent-soft p-4" aria-busy="true">
              <p className="flex items-center gap-2 text-sm font-bold text-accent-ink">
                <Sparkles className="size-4 animate-pulse" aria-hidden /> FieldMate is interpreting…
              </p>
              <div className="mt-3 space-y-2.5">
                <div className="skeleton h-3.5 w-11/12 rounded-full" />
                <div className="skeleton h-3.5 w-8/12 rounded-full" />
                <div className="skeleton h-3.5 w-9/12 rounded-full" />
                <div className="skeleton h-3.5 w-6/12 rounded-full" />
              </div>
            </div>
          )}

          {phase === 'review' && (
            <div ref={reviewRef} className="mt-5">
              <p className="mb-2.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent-ink">
                <Sparkles className="size-3.5" aria-hidden /> FieldMate understood
                <span className="ml-auto normal-case tracking-normal text-muted">{editing ? 'Editing — tap ✓ to include or skip' : `${count} update${count === 1 ? '' : 's'}`}</span>
              </p>
              <ul className="space-y-2.5">
                {has.tasks && (
                  <ReviewCard index={0} icon={ListChecks} on={include.tasks && taskSel.length > 0} onToggle={() => flip('tasks')} title={`Task: ${round ? 'Window round' : WORK_LABEL[job.service]} → Completed`}>
                    {editing ? (
                      <ul className="mt-2 space-y-1">
                        {matched.map((t) => {
                          const sel = taskSel.includes(t.id);
                          return (
                            <li key={t.id}>
                              <button
                                type="button"
                                role="checkbox"
                                aria-checked={sel}
                                onClick={() => setTaskSel((xs) => (sel ? xs.filter((x) => x !== t.id) : [...xs, t.id]))}
                                className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2 text-left text-[13px] font-medium text-ink-2 hover:bg-subtle"
                              >
                                <span className={cx('grid size-5 shrink-0 place-items-center rounded-md border-2', sel ? 'border-secondary-solid bg-secondary-solid text-secondary-on' : 'border-line-2 text-transparent')}>
                                  <Check className="size-3.5" strokeWidth={3} aria-hidden />
                                </span>
                                {t.title}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <ul className="mt-1.5 space-y-1">
                        {matched
                          .filter((t) => taskSel.includes(t.id))
                          .map((t) => (
                            <li key={t.id} className="flex items-center gap-2 text-[13px] text-ink-2">
                              <Check className="size-3.5 shrink-0 text-success" strokeWidth={3} aria-hidden /> {t.title}
                            </li>
                          ))}
                      </ul>
                    )}
                  </ReviewCard>
                )}

                {has.time && (
                  <ReviewCard index={1} icon={Timer} on={include.time && minutes > 0} onToggle={() => flip('time')} title={`Time: +${minutes} minutes`}>
                    <p className="mt-0.5 text-[13px] text-muted">Added to “{timeTask?.title}”</p>
                    {editing && (
                      <div className="mt-2 flex items-center gap-2">
                        <button type="button" onClick={() => setMinutes((m) => Math.max(5, m - 5))} aria-label="5 minutes less" className="grid size-11 place-items-center rounded-control border border-line-2 bg-surface text-ink hover:bg-subtle">
                          <Minus className="size-4" aria-hidden />
                        </button>
                        <span className="tabular min-w-20 text-center text-lg font-extrabold text-ink" aria-live="polite">
                          {minutes} min
                        </span>
                        <button type="button" onClick={() => setMinutes((m) => Math.min(180, m + 5))} aria-label="5 minutes more" className="grid size-11 place-items-center rounded-control border border-line-2 bg-surface text-ink hover:bg-subtle">
                          <Plus className="size-4" aria-hidden />
                        </button>
                      </div>
                    )}
                  </ReviewCard>
                )}

                {has.issue && script.issue && (
                  <ReviewCard index={2} icon={TriangleAlert} on={include.issue} onToggle={() => flip('issue')} title={`Issue: ${script.issue.title}`}>
                    <p className="mt-0.5 text-[13px] text-muted">
                      <span className="font-semibold text-success-ink">Resolved on site</span> — {script.issue.detail}
                    </p>
                  </ReviewCard>
                )}

                {has.material && script.material && (
                  <ReviewCard index={3} icon={Package} on={include.material} onToggle={() => flip('material')} title={`Material: ${script.material.description}`}>
                    <p className="mt-0.5 text-[13px] text-muted">{money(script.material.cost, true)} added to job costs</p>
                  </ReviewCard>
                )}

                {has.evidence && (
                  <ReviewCard index={4} icon={Camera} on={include.evidence} onToggle={() => flip('evidence')} title={`Evidence: ${script.evidence.length} photo${script.evidence.length === 1 ? '' : 's'} linked`}>
                    <div className="mt-2 flex gap-2">
                      {script.evidence.map((e) => (
                        <figure key={e.url} className="relative h-16 w-20 overflow-hidden rounded-lg bg-subtle">
                          <img src={asset(e.url)} alt={e.caption} className="size-full object-cover" />
                          <figcaption className={cx('absolute bottom-1 left-1 rounded px-1 text-[9px] font-bold uppercase tracking-wide', e.type === 'after' ? 'bg-success text-white' : 'bg-black/65 text-white')}>{e.type}</figcaption>
                        </figure>
                      ))}
                    </div>
                  </ReviewCard>
                )}
              </ul>
              <p className="mt-3 text-center text-xs text-muted">Nothing changes until you confirm.</p>
            </div>
          )}
        </>
      )}
    </PhoneSheet>
  );
}

function Waveform() {
  return (
    <div className="mt-1 flex h-12 items-center justify-center gap-[3px]" aria-hidden>
      {BARS.map((h, i) => (
        <span
          key={i}
          className="w-[4px] origin-center animate-wave rounded-full bg-accent"
          style={{ height: `${h * 100}%`, animationDelay: `${((i * 7) % 10) * 0.08}s`, animationDuration: `${0.75 + (i % 4) * 0.15}s` }}
        />
      ))}
    </div>
  );
}

function ReviewCard({ index, icon: Icon, on, onToggle, title, children }: { index: number; icon: LucideIcon; on: boolean; onToggle: () => void; title: string; children?: ReactNode }) {
  return (
    <li className={cx('animate-rise rounded-xl border p-3 shadow-card transition', on ? 'border-line bg-surface' : 'border-dashed border-line-2 bg-subtle/60')} style={{ animationDelay: `${index * 150}ms` }}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={`Include “${title}”`}
          onClick={onToggle}
          className={cx('grid size-11 shrink-0 place-items-center rounded-full border-2 transition', on ? 'border-success bg-success text-white' : 'border-line-2 bg-surface text-line-2')}
        >
          <Check className="size-5" strokeWidth={3} aria-hidden />
        </button>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex items-start justify-between gap-2">
            <p className={cx('text-[15px] font-bold leading-snug', on ? 'text-ink' : 'text-muted line-through')}>{title}</p>
            <Icon className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
          </div>
          {children}
          {!on && <p className="mt-1 text-xs font-semibold text-muted">Skipped — won’t be applied</p>}
        </div>
      </div>
    </li>
  );
}

function Applied({ count, job }: { count: number; job: Job }) {
  return (
    <div className="flex flex-col items-center pb-4 pt-6 text-center">
      <div className="relative grid size-28 place-items-center">
        <span className="absolute inset-2 animate-pulse-ring rounded-full bg-success/30" aria-hidden />
        <span className="relative grid size-20 animate-pop place-items-center rounded-full bg-success text-white shadow-float">
          <CheckCheck className="size-10" aria-hidden />
        </span>
      </div>
      <h3 className="mt-4 font-display text-[22px] font-extrabold text-ink">
        {count} update{count === 1 ? '' : 's'} applied to {job.ref}
      </h3>
      <p className="mt-1.5 max-w-[280px] text-sm text-muted">Tasks, time, issue and photos are on the job timeline — the office and the customer portal update instantly.</p>
      <ul className="mt-5 w-full space-y-2 text-left">
        {['Job timeline updated', 'Office dashboard notified', 'Customer portal refreshed'].map((t, i) => (
          <li key={t} className="flex animate-rise items-center gap-2.5 rounded-xl bg-success-soft px-3 py-2.5 text-sm font-semibold text-success-ink" style={{ animationDelay: `${150 + i * 120}ms` }}>
            <Check className="size-4" strokeWidth={3} aria-hidden /> {t}
          </li>
        ))}
      </ul>
    </div>
  );
}
