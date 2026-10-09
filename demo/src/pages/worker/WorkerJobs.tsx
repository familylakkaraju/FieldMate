import { CalendarDays } from 'lucide-react';
import { useDemo } from '../../app/DemoProvider';
import { jobsForWorker } from '../../app/selectors';
import { addDays, DEMO_DATE } from '../../data/demoClock';
import { EmptyState } from '../../components/common/Card';
import { pendingVisitsForWorker, PendingVisitCard, useCurrentWorker, WorkerJobRow } from '../../components/worker/WorkerUi';
import { money, relativeDay, shortDate } from '../../utils/format';

/** All of the worker's jobs today and over the next 7 days, grouped by day. */
export default function WorkerJobs() {
  const { state } = useDemo();
  const d = state.data;
  const { workerId, worker } = useCurrentWorker();

  const days = Array.from({ length: 8 }, (_, i) => addDays(DEMO_DATE, i))
    .map((date, i) => ({
      date,
      label: i < 2 ? `${relativeDay(date)} · ${shortDate(date)}` : shortDate(date),
      jobs: jobsForWorker(d, workerId, date),
      pending: i === 0 ? pendingVisitsForWorker(d, workerId, date) : [],
    }))
    .filter((g) => g.jobs.length || g.pending.length);

  const total = days.reduce((a, g) => a + g.jobs.length, 0);
  const value = days.reduce((a, g) => a + g.jobs.reduce((s, j) => s + (j.quotedAmount ?? 0), 0), 0);

  return (
    <div className="px-4 pb-8 pt-4">
      <header>
        <p className="text-[13px] font-semibold text-muted">{worker?.name ?? 'My'} · next 7 days</p>
        <h1 className="mt-0.5 font-display text-[26px] font-extrabold tracking-tight text-ink">My jobs</h1>
        <p className="mt-1 text-sm text-muted">
          {total} {total === 1 ? 'job' : 'jobs'} · {money(value)} of work booked
        </p>
      </header>

      {days.length ? (
        days.map((g) => (
          <section key={g.date} aria-labelledby={`day-${g.date}`} className="mt-6">
            <h2 id={`day-${g.date}`} className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted">
              <span>{g.label}</span>
              <span className="tabular normal-case tracking-normal">
                {g.jobs.length} {g.jobs.length === 1 ? 'job' : 'jobs'}
              </span>
            </h2>
            <ul className="space-y-2">
              {[...g.jobs.map((j) => ({ at: j.scheduledStart ?? '', key: j.id, node: <WorkerJobRow job={j} /> })), ...g.pending.map((p) => ({ at: p.start, key: p.lead.id, node: <PendingVisitCard visit={p} compact /> }))]
                .sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0))
                .map((x) => (
                  <li key={x.key}>{x.node}</li>
                ))}
            </ul>
          </section>
        ))
      ) : (
        <div className="mt-6">
          <EmptyState icon={CalendarDays} title="Nothing booked this week" text="New jobs from the office appear here as soon as they’re scheduled." />
        </div>
      )}
    </div>
  );
}
