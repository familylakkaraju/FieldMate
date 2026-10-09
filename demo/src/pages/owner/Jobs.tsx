import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { BriefcaseBusiness, Car, Columns3, List, Navigation, Plus, Route as RouteIcon, TriangleAlert, Wand2 } from 'lucide-react';
import type { Job, JobStatus } from '../../types/domain';
import { useDemo } from '../../app/DemoProvider';
import { ACTIVE_STATUSES, atRiskJobs, jobCustomerLabel, jobProgress, jobsForWorker, jobValue } from '../../app/selectors';
import { addDays, DEMO_DATE } from '../../data/demoClock';
import { MORRISON_JOB_ID, MORRISON_NEW, routeSuggestion } from '../../utils/insights';
import { EmptyState, PageHeader, ProgressBar } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { FilterChips, Segmented } from '../../components/common/Form';
import { ServiceBadge, StatusBadge } from '../../components/common/Badge';
import { AvatarStack, WorkerAvatar } from '../../components/common/Avatar';
import { JobRow } from '../../components/owner/OwnerBits';
import { useQuickActions } from '../../components/owner/QuickActions';
import { useToast } from '../../components/common/Toast';
import { serviceTone } from '../../theme/branding';
import { money, relativeDayTime } from '../../utils/format';
import { cx } from '../../utils/cx';

type Filter = 'active' | 'today' | 'week' | 'plumbing' | 'gutter' | 'window' | 'unassigned' | 'risk' | 'completed' | 'all';
const KANBAN: JobStatus[] = ['new', 'quoted', 'scheduled', 'in-progress', 'blocked', 'completed', 'invoiced', 'closed'];

export default function Jobs() {
  const { state, actions } = useDemo();
  const d = state.data;
  const navigate = useNavigate();
  const quick = useQuickActions();
  const toast = useToast();
  const [params] = useSearchParams();
  const [view, setView] = useState<'list' | 'kanban' | 'route'>('list');
  const [filter, setFilter] = useState<Filter>((params.get('filter') as Filter) ?? 'active');
  const risky = new Set(atRiskJobs(d).map((r) => r.job.id));
  const weekEnd = addDays(DEMO_DATE, 7);

  const test = (j: Job, f: Filter) => {
    switch (f) {
      case 'active': return ACTIVE_STATUSES.includes(j.status);
      case 'today': return !!j.scheduledStart?.startsWith(DEMO_DATE);
      case 'week': return !!j.scheduledStart && j.scheduledStart.slice(0, 10) >= DEMO_DATE && j.scheduledStart.slice(0, 10) < weekEnd;
      case 'plumbing': case 'gutter': case 'window': return j.service === f && ACTIVE_STATUSES.includes(j.status);
      case 'unassigned': return !j.assignedWorkerIds.length && ACTIVE_STATUSES.includes(j.status);
      case 'risk': return risky.has(j.id);
      case 'completed': return ['completed', 'invoiced', 'closed'].includes(j.status);
      default: return true;
    }
  };
  const list = useMemo(
    () => d.jobs.filter((j) => test(j, filter)).sort((a, b) => ((a.scheduledStart ?? '9999') < (b.scheduledStart ?? '9999') ? (filter === 'completed' || filter === 'all' ? 1 : -1) : filter === 'completed' || filter === 'all' ? -1 : 1)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [d.jobs, filter],
  );
  const chip = (value: Filter, label: string) => ({ value, label, count: d.jobs.filter((j) => test(j, value)).length });
  const suggestion = routeSuggestion(d);

  return (
    <div>
      <PageHeader
        title="Jobs"
        subtitle="Every job from request to payment."
        actions={
          <>
            <Segmented
              label="View"
              value={view}
              onChange={setView}
              options={[
                { value: 'list', label: <><List className="size-4" aria-hidden /> List</> },
                { value: 'kanban', label: <><Columns3 className="size-4" aria-hidden /> Kanban</> },
                { value: 'route', label: <><RouteIcon className="size-4" aria-hidden /> Route</> },
              ]}
            />
            <Button icon={<Plus className="size-4" />} onClick={() => quick.open('job')}>
              New Job
            </Button>
          </>
        }
      />
      {view !== 'route' && (
        <div className="mb-4">
          <FilterChips
            label="Job filter"
            value={filter}
            onChange={setFilter}
            options={[chip('active', 'Active'), chip('today', 'Today'), chip('week', 'This Week'), chip('plumbing', 'Plumbing'), chip('gutter', 'Gutters'), chip('window', 'Windows'), chip('unassigned', 'Unassigned'), chip('risk', 'At Risk'), chip('completed', 'Completed'), chip('all', 'All')]}
          />
        </div>
      )}

      {view === 'list' &&
        (list.length ? (
          <>
            <div className="space-y-2 md:hidden">
              {list.map((j) => (
                <JobRow key={j.id} job={j} showDate />
              ))}
            </div>
            <div className="card hidden overflow-hidden md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line bg-canvas text-xs font-semibold uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-3">Job</th>
                    <th className="px-4 py-3">Service</th>
                    <th className="px-4 py-3">When</th>
                    <th className="px-4 py-3">Team</th>
                    <th className="px-4 py-3">Progress</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {list.map((j) => {
                    const p = jobProgress(d, j);
                    return (
                      <tr key={j.id} onClick={() => navigate(`/app/jobs/${j.id}`)} className="cursor-pointer hover:bg-canvas">
                        <td className="px-4 py-3">
                          <Link to={`/app/jobs/${j.id}`} onClick={(e) => e.stopPropagation()} className="font-semibold text-ink hover:text-secondary-ink">
                            {j.title}
                          </Link>
                          <p className="text-xs text-muted">
                            {j.ref} · {jobCustomerLabel(d, j)}
                          </p>
                          {risky.has(j.id) && (
                            <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-danger-ink">
                              <TriangleAlert className="size-3" aria-hidden /> {j.atRisk ?? j.blockedReason}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <ServiceBadge service={j.service} short />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-ink-2">{relativeDayTime(j.scheduledStart)}</td>
                        <td className="px-4 py-3">
                          <AvatarStack ids={j.assignedWorkerIds} size="xs" />
                        </td>
                        <td className="w-36 px-4 py-3">
                          <div className="flex items-center gap-2">
                            <ProgressBar value={p.pct} className="h-1.5" tone={j.status === 'blocked' ? 'red' : p.pct === 100 ? 'green' : 'brand'} label={`${p.pct}%`} />
                            <span className="tabular w-8 text-xs text-muted">{p.pct}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge kind="job" status={j.status} />
                        </td>
                        <td className="tabular px-4 py-3 text-right font-semibold">{money(jobValue(d, j))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <EmptyState icon={BriefcaseBusiness} title="No jobs match this filter" />
        ))}

      {view === 'kanban' && (
        <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          {KANBAN.map((status) => {
            const items = list.filter((j) => j.status === status);
            return (
              <section key={status} aria-label={status} className="w-72 shrink-0">
                <div className="mb-2 flex items-center justify-between px-1">
                  <StatusBadge kind="job" status={status} />
                  <span className="text-xs font-semibold text-muted">{items.length}</span>
                </div>
                <div className="min-h-32 space-y-2 rounded-card bg-subtle/70 p-2">
                  {items.map((j) => {
                    const tone = serviceTone(state.config.services.find((s) => s.id === j.service)!.color);
                    return (
                      <Link key={j.id} to={`/app/jobs/${j.id}`} className="block rounded-xl border border-line bg-surface p-3 shadow-card transition hover:shadow-raised">
                        <span className="mb-2 block h-1 w-10 rounded-full" style={{ background: tone.color }} aria-hidden />
                        <p className="text-sm font-semibold text-ink">{j.title}</p>
                        <p className="mt-0.5 text-xs text-muted">
                          {j.ref} · {relativeDayTime(j.scheduledStart)}
                        </p>
                        <div className="mt-2.5 flex items-center justify-between">
                          <AvatarStack ids={j.assignedWorkerIds} size="xs" />
                          <span className="tabular text-xs font-bold text-ink">{money(jobValue(d, j))}</span>
                        </div>
                      </Link>
                    );
                  })}
                  {!items.length && <p className="p-3 text-center text-xs text-muted">No jobs</p>}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {view === 'route' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-card border border-secondary-tint bg-secondary-soft p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2 text-sm text-ink">
              <Navigation className="mt-0.5 size-4 shrink-0 text-secondary-ink" aria-hidden /> {suggestion.text}
            </p>
            {suggestion.applicable && (
              <Button
                size="sm"
                icon={<Wand2 className="size-4" />}
                onClick={() => {
                  actions.scheduleJob(MORRISON_JOB_ID, MORRISON_NEW.start, MORRISON_NEW.end, ['w-maya'], 'Route optimised — Morrison moved to 12:15 after the Shah job');
                  toast({ title: 'Route optimised', description: 'Morrison window clean moved to 12:15.' });
                }}
              >
                Optimise route
              </Button>
            )}
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {d.team
              .filter((m) => !m.isOffice && m.active)
              .map((m) => {
                const jobs = jobsForWorker(d, m.id);
                const travel = jobs.reduce((a, j) => a + (j.travelMinutes ?? 12), 0);
                return (
                  <div key={m.id} className="card p-4">
                    <div className="mb-3 flex items-center gap-3">
                      <WorkerAvatar id={m.id} size="md" />
                      <div>
                        <p className="font-bold text-ink">{m.name}</p>
                        <p className="flex items-center gap-1 text-xs text-muted">
                          <Car className="size-3.5" aria-hidden /> {jobs.length} stops · ~{travel} min driving
                        </p>
                      </div>
                    </div>
                    <ol className="relative space-y-3 border-l-2 border-dashed border-line pl-5">
                      {jobs.map((j, i) => (
                        <li key={j.id} className="relative">
                          <span className={cx('absolute -left-[31px] top-0.5 grid size-5 place-items-center rounded-full text-[10px] font-bold text-white', ['completed', 'invoiced', 'closed'].includes(j.status) ? 'bg-success' : j.status === 'in-progress' ? 'bg-accent-solid' : j.status === 'blocked' ? 'bg-danger' : 'bg-muted')}>
                            {i + 1}
                          </span>
                          <Link to={`/app/jobs/${j.id}`} className="block rounded-lg hover:bg-canvas">
                            <p className="text-sm font-semibold text-ink">
                              {j.scheduledStart?.slice(11, 16)} · {j.title}
                            </p>
                            <p className="text-xs text-muted">{j.area}</p>
                          </Link>
                          {i < jobs.length - 1 && (
                            <p className="mt-1.5 flex items-center gap-1 text-[11px] text-muted">
                              <Car className="size-3" aria-hidden /> {jobs[i + 1].travelMinutes ?? 12} min
                            </p>
                          )}
                        </li>
                      ))}
                      {!jobs.length && <li className="text-sm text-muted">No jobs today</li>}
                    </ol>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
