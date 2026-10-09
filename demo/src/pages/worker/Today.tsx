import { useState } from 'react';
import { Briefcase, ChevronDown, CircleCheckBig, CloudSun, ListChecks, PoundSterling } from 'lucide-react';
import type { Job } from '../../types/domain';
import { useDemo } from '../../app/DemoProvider';
import { jobsForWorker } from '../../app/selectors';
import { DEMO_DATE, parseLocal } from '../../data/demoClock';
import { Logo } from '../../components/common/Logo';
import { WorkerAvatar } from '../../components/common/Avatar';
import { greetingFor, isJobDone, pendingVisitsForWorker, PendingVisitCard, useCurrentWorker, useDemoNow, WorkerJobCard, WorkerJobRow, type PendingVisit } from '../../components/worker/WorkerUi';
import { cx } from '../../utils/cx';
import { money } from '../../utils/format';

type Item = { kind: 'job'; at: string; job: Job } | { kind: 'pending'; at: string; visit: PendingVisit };

export default function Today() {
  const { state } = useDemo();
  const d = state.data;
  const { workerId, worker } = useCurrentWorker();
  const now = useDemoNow(30000);
  const [showDone, setShowDone] = useState(false);

  const jobs = jobsForWorker(d, workerId);
  const active = jobs.filter((j) => !isJobDone(j.status));
  const done = jobs.filter((j) => isJobDone(j.status));
  const pending = pendingVisitsForWorker(d, workerId);
  const scheduledValue = jobs.reduce((a, j) => a + (j.quotedAmount ?? 0), 0);
  const activeIds = new Set(active.map((j) => j.id));
  const openTasks = d.tasks.filter((t) => activeIds.has(t.jobId) && t.status !== 'completed' && (t.assignedWorkerId ? t.assignedWorkerId === workerId : true)).length;

  const items: Item[] = [
    ...active.map((job): Item => ({ kind: 'job', at: job.scheduledStart ?? '', job })),
    ...pending.map((visit): Item => ({ kind: 'pending', at: visit.start, visit })),
  ].sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));

  const nowId = active.find((j) => j.status === 'in-progress')?.id;
  const nextId = active.find((j) => j.status === 'scheduled' || j.status === 'new')?.id;
  const dateLabel = parseLocal(DEMO_DATE).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const services = worker?.services ?? [];
  const weather = services.includes('gutter') ? 'good gutter weather' : services.includes('window') ? 'streak-free window weather' : 'dry all day';

  const tiles = [
    { icon: Briefcase, value: String(jobs.length), label: jobs.length === 1 ? 'job' : 'jobs' },
    { icon: ListChecks, value: String(openTasks), label: openTasks === 1 ? 'open task' : 'open tasks' },
    { icon: PoundSterling, value: money(scheduledValue), label: 'scheduled work' },
  ];

  return (
    <div className="px-4 pb-8 pt-3">
      <header className="flex items-center justify-between gap-3">
        <Logo size={32} />
        <WorkerAvatar id={workerId} size="md" />
      </header>

      <section aria-labelledby="today-greeting" className="relative mt-3 overflow-hidden rounded-[24px] bg-primary-solid p-5 text-primary-on shadow-raised">
        <span className="pointer-events-none absolute -right-10 -top-12 size-44 rounded-full bg-white/10" aria-hidden />
        <span className="pointer-events-none absolute -bottom-16 right-10 size-36 rounded-full bg-white/5" aria-hidden />
        <p className="relative text-[13px] font-semibold opacity-80">{dateLabel}</p>
        <h1 id="today-greeting" className="relative mt-1 font-display text-[26px] font-extrabold leading-tight">
          {greetingFor(now)}, {worker?.firstName ?? 'there'}
        </h1>
        <p className="relative mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
          <CloudSun className="size-4" aria-hidden /> 12°C · dry — {weather}
        </p>
        <ul className="relative mt-4 grid grid-cols-3 gap-2" aria-label="Today at a glance">
          {tiles.map((t) => {
            const Icon = t.icon;
            return (
              <li key={t.label} className="rounded-xl bg-white/10 px-2.5 py-2.5">
                <Icon className="size-4 opacity-80" aria-hidden />
                <p className="tabular mt-1 font-display text-[21px] font-extrabold leading-none">{t.value}</p>
                <p className="mt-1 text-[11px] font-semibold leading-tight opacity-80">{t.label}</p>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="today-jobs" className="mt-6">
        <h2 id="today-jobs" className="mb-2.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted">
          <span>Your day</span>
          <span className="normal-case tracking-normal">{items.length ? `${items.length} to go` : 'All done'}</span>
        </h2>
        {items.length ? (
          <ul className="space-y-3">
            {items.map((it, i) => (
              <li key={it.kind === 'job' ? it.job.id : it.visit.lead.id} className="animate-rise" style={{ animationDelay: `${Math.min(i, 5) * 60}ms` }}>
                {it.kind === 'job' ? <WorkerJobCard job={it.job} label={it.job.id === nowId ? 'Now' : it.job.id === nextId ? 'Next up' : undefined} /> : <PendingVisitCard visit={it.visit} />}
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center rounded-card border border-dashed border-line-2 bg-surface/70 px-6 py-10 text-center">
            <span className="grid size-12 place-items-center rounded-2xl bg-success-soft text-success-ink">
              <CircleCheckBig className="size-6" aria-hidden />
            </span>
            <p className="mt-3 font-semibold text-ink">{done.length ? 'Every job is done for today' : 'No jobs scheduled today'}</p>
            <p className="mt-1 text-sm text-muted">{done.length ? 'Nice work — the office has everything it needs to invoice.' : 'The office will add work to your day here.'}</p>
          </div>
        )}
      </section>

      {done.length > 0 && (
        <section className="mt-6">
          <button
            type="button"
            aria-expanded={showDone}
            aria-controls="today-done"
            onClick={() => setShowDone((v) => !v)}
            className="flex min-h-11 w-full items-center justify-between rounded-xl px-1 text-xs font-bold uppercase tracking-wider text-muted hover:text-ink"
          >
            <span className="flex items-center gap-2">
              <CircleCheckBig className="size-4 text-success" aria-hidden /> Done today · {done.length}
            </span>
            <ChevronDown className={cx('size-4 transition', showDone && 'rotate-180')} aria-hidden />
          </button>
          {showDone && (
            <ul id="today-done" className="mt-1 space-y-2">
              {done.map((job) => (
                <li key={job.id} className="animate-fade-in">
                  <WorkerJobRow job={job} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <p className="mt-8 text-center text-xs text-muted">Updates sync to the office and customer portal instantly (demo).</p>
    </div>
  );
}
