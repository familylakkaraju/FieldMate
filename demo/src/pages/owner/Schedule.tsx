import { useMemo, useState, type DragEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarDays, Car, ChevronLeft, ChevronRight, Clock, Inbox, MousePointerClick, TriangleAlert, Users, Wand2 } from 'lucide-react';
import type { Job, Lead } from '../../types/domain';
import { useDemo } from '../../app/DemoProvider';
import { ACTIVE_STATUSES, jobCustomerLabel, jobProgress, jobsOn } from '../../app/selectors';
import { addDays, DEMO_DATE, demoClock, parseLocal } from '../../data/demoClock';
import { MORRISON_JOB_ID, MORRISON_NEW, routeSuggestion } from '../../utils/insights';
import { Card, CardHeader, PageHeader, ProgressBar } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Segmented } from '../../components/common/Form';
import { ServiceBadge, StatusBadge } from '../../components/common/Badge';
import { WorkerAvatar } from '../../components/common/Avatar';
import { ServiceIcon } from '../../components/common/ServiceIcon';
import { JobRow } from '../../components/owner/OwnerBits';
import { ScheduleJobDialog } from '../../components/shared/JobActionDialogs';
import { useToast } from '../../components/common/Toast';
import { serviceTone } from '../../theme/branding';
import { cx } from '../../utils/cx';
import { longDate, money, relativeDay, shortDate } from '../../utils/format';

const DAY_START = 7 * 60 + 30;
const DAY_END = 17 * 60 + 30;
const SPAN = DAY_END - DAY_START;
const mins = (iso: string) => Number(iso.slice(11, 13)) * 60 + Number(iso.slice(14, 16));
const pct = (m: number) => `${((Math.min(Math.max(m, DAY_START), DAY_END) - DAY_START) / SPAN) * 100}%`;
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

type View = 'day' | 'week' | 'team';

export default function Schedule() {
  const { state, actions } = useDemo();
  const d = state.data;
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [view, setView] = useState<View>((params.get('view') as View) ?? 'day');
  const [date, setDate] = useState(DEMO_DATE);
  const [scheduling, setScheduling] = useState<Job | null>(null);
  const workers = d.team.filter((m) => !m.isOffice && m.active);
  const jobs = jobsOn(d, date);
  const holds = d.leads.filter((l) => l.status !== 'converted' && l.status !== 'lost' && l.preferredSlot?.date === date);
  const unscheduled = d.jobs.filter((j) => !j.scheduledStart && ACTIVE_STATUSES.includes(j.status));
  const waitingLeads = d.leads.filter((l) => (l.status === 'new' || l.status === 'contacted') && !l.preferredSlot);
  const suggestion = routeSuggestion(d);

  const step = (dir: 1 | -1) => {
    let n = addDays(date, dir);
    if (parseLocal(n).getDay() === 0) n = addDays(n, dir);
    setDate(n);
  };

  const dropOnLane = (e: DragEvent<HTMLDivElement>, workerId: string) => {
    e.preventDefault();
    const jobId = e.dataTransfer.getData('text/plain');
    const job = d.jobs.find((j) => j.id === jobId);
    if (!job) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    let start = Math.round((DAY_START + ratio * SPAN) / 15) * 15;
    const dur = job.estimatedMinutes ?? 90;
    start = Math.min(start, DAY_END - dur);
    actions.scheduleJob(job.id, `${date}T${hhmm(start)}`, `${date}T${hhmm(start + dur)}`, [workerId]);
    toast({ title: 'Job scheduled', description: `${job.title} · ${relativeDay(date)} ${hhmm(start)} with ${d.team.find((m) => m.id === workerId)?.firstName}` });
  };

  return (
    <div>
      <PageHeader
        title="Schedule"
        subtitle="Plan the team’s day. Drag unscheduled jobs onto a lane, or click any job to open it."
        actions={
          <Segmented
            label="Schedule view"
            value={view}
            onChange={setView}
            options={[
              { value: 'day', label: 'Day' },
              { value: 'week', label: 'Week' },
              { value: 'team', label: 'Team' },
            ]}
          />
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => step(-1)} aria-label="Previous day" className="grid size-9 place-items-center rounded-lg border border-line-2 bg-surface hover:bg-subtle">
            <ChevronLeft className="size-4" />
          </button>
          <p className="min-w-56 text-center font-bold text-ink">
            <CalendarDays className="mr-1.5 inline size-4 text-muted" aria-hidden />
            {view === 'week' ? `Week of ${shortDate(weekStart(date))}` : `${relativeDay(date) === 'Today' ? 'Today · ' : ''}${longDate(date)}`}
          </p>
          <button type="button" onClick={() => step(1)} aria-label="Next day" className="grid size-9 place-items-center rounded-lg border border-line-2 bg-surface hover:bg-subtle">
            <ChevronRight className="size-4" />
          </button>
          {date !== DEMO_DATE && (
            <Button size="sm" variant="ghost" onClick={() => setDate(DEMO_DATE)}>
              Today
            </Button>
          )}
        </div>
        <Legend />
      </div>

      {view === 'day' && date === DEMO_DATE && (suggestion.applicable || suggestion.applied) && (
        <div className={cx('mb-4 flex flex-col gap-3 rounded-card border p-4 sm:flex-row sm:items-center sm:justify-between', suggestion.applied ? 'border-success/30 bg-success-soft' : 'border-secondary-tint bg-secondary-soft')}>
          <p className="flex items-start gap-2 text-sm text-ink">
            <Wand2 className="mt-0.5 size-4 shrink-0 text-secondary-ink" aria-hidden /> {suggestion.text}
          </p>
          {suggestion.applicable && (
            <Button
              size="sm"
              onClick={() => {
                actions.scheduleJob(MORRISON_JOB_ID, MORRISON_NEW.start, MORRISON_NEW.end, ['w-maya'], 'Moved to 12:15 after the Shah gutter job (Copilot suggestion)');
                toast({ title: 'Schedule optimised', description: 'Morrison window clean moved to 12:15–13:15.' });
              }}
            >
              Apply suggestion
            </Button>
          )}
        </div>
      )}

      {view === 'day' && (
        <div className="grid grid-cols-1 gap-62xl:grid-cols-[1fr_300px]">
          <div>
            {/* Desktop timeline */}
            <div className="card hidden overflow-hidden lg:block">
              <div className="grid grid-cols-[180px_1fr] border-b border-line bg-canvas">
                <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted">Team</div>
                <div className="relative h-8">
                  {HOURS.map((h) => (
                    <span key={h} className="absolute top-2 -translate-x-1/2 text-[11px] font-semibold text-muted" style={{ left: pct(h * 60) }}>
                      {h}:00
                    </span>
                  ))}
                </div>
              </div>
              {workers.map((w) => (
                <Lane key={w.id} workerId={w.id} date={date} jobs={jobs.filter((j) => j.assignedWorkerIds.includes(w.id))} holds={holds.filter((l) => l.preferredSlot?.workerIds?.includes(w.id))} onDrop={dropOnLane} />
              ))}
            </div>
            {/* Mobile / tablet agenda */}
            <div className="space-y-5 lg:hidden">
              {workers.map((w) => {
                const list = jobs.filter((j) => j.assignedWorkerIds.includes(w.id));
                return (
                  <section key={w.id}>
                    <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-ink">
                      <WorkerAvatar id={w.id} size="sm" /> {w.name} <span className="font-normal text-muted">· {list.length} jobs</span>
                    </h2>
                    <div className="space-y-2">
                      {list.map((j) => (
                        <JobRow key={j.id} job={j} />
                      ))}
                      {holds
                        .filter((l) => l.preferredSlot?.workerIds?.includes(w.id))
                        .map((l) => (
                          <HoldCard key={l.id} lead={l} />
                        ))}
                      {!list.length && <p className="rounded-xl border border-dashed border-line-2 p-3 text-sm text-muted">Nothing booked</p>}
                    </div>
                  </section>
                );
              })}
            </div>
            <p className="mt-3 hidden items-center gap-1.5 text-xs text-muted lg:flex">
              <MousePointerClick className="size-3.5" aria-hidden /> Drag a card from “Unscheduled” onto a lane to book it at that time.
            </p>
          </div>

          <aside className="space-y-4">
            <Card padded={false}>
              <div className="border-b border-line p-4">
                <CardHeader className="mb-0" title="Unscheduled" subtitle={`${unscheduled.length} jobs · ${waitingLeads.length} leads`} icon={Inbox} />
              </div>
              <ul className="max-h-[480px] space-y-2 overflow-y-auto p-3">
                {unscheduled.map((j) => {
                  const svc = state.config.services.find((s) => s.id === j.service)!;
                  const tone = serviceTone(svc.color);
                  return (
                    <li
                      key={j.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('text/plain', j.id)}
                      className="cursor-grab rounded-xl border border-line bg-surface p-3 shadow-card active:cursor-grabbing"
                      style={{ borderLeft: `4px solid ${tone.color}` }}
                    >
                      <Link to={`/app/jobs/${j.id}`} className="text-sm font-semibold text-ink hover:text-secondary-ink">
                        {j.title}
                      </Link>
                      <p className="text-xs text-muted">
                        {j.ref} · {j.area} · ~{j.estimatedMinutes ?? 90} min
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <StatusBadge kind="job" status={j.status} className="h-5 px-2 text-[11px]" />
                        <Button size="sm" variant="soft" onClick={() => setScheduling(j)}>
                          Schedule
                        </Button>
                      </div>
                    </li>
                  );
                })}
                {waitingLeads.map((l) => (
                  <li key={l.id} className="rounded-xl border border-dashed border-line-2 p-3">
                    <p className="text-sm font-semibold text-ink">{l.customerName}</p>
                    <p className="text-xs text-muted">
                      Lead {l.ref} · {l.summary}
                    </p>
                    <button type="button" onClick={() => navigate(`/app/leads/${l.id}`)} className="mt-1.5 text-xs font-bold text-secondary-ink hover:underline">
                      Convert & schedule →
                    </button>
                  </li>
                ))}
                {!unscheduled.length && !waitingLeads.length && <li className="p-3 text-center text-sm text-muted">Everything is scheduled 🎉</li>}
              </ul>
            </Card>
          </aside>
        </div>
      )}

      {view === 'week' && <WeekView date={date} />}
      {view === 'team' && <TeamView date={date} />}

      {scheduling && <ScheduleJobDialog open onClose={() => setScheduling(null)} job={scheduling} />}
    </div>
  );
}

function weekStart(date: string) {
  const dow = parseLocal(date).getDay();
  return addDays(date, dow === 0 ? -6 : 1 - dow);
}

function Legend() {
  const { state } = useDemo();
  return (
    <ul className="flex flex-wrap items-center gap-3 text-xs text-ink-2">
      {state.config.services.map((s) => (
        <li key={s.id} className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm" style={{ background: serviceTone(s.color).tint, border: `2px solid ${s.color}` }} aria-hidden /> {s.name}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <span className="size-3 rounded-sm border-2 border-dashed border-warning bg-warning-soft" aria-hidden /> Provisional
      </li>
    </ul>
  );
}

function Lane({ workerId, date, jobs, holds, onDrop }: { workerId: string; date: string; jobs: Job[]; holds: Lead[]; onDrop: (e: DragEvent<HTMLDivElement>, workerId: string) => void }) {
  const { state } = useDemo();
  const navigate = useNavigate();
  const [over, setOver] = useState(false);
  const member = state.data.team.find((m) => m.id === workerId)!;
  const booked = jobs.reduce((a, j) => a + (mins(j.scheduledEnd!) - mins(j.scheduledStart!)), 0);
  const util = Math.round((booked / (8 * 60)) * 100);
  const nowM = date === DEMO_DATE ? mins(demoClock()) : null;
  const sorted = [...jobs].sort((a, b) => (a.scheduledStart! < b.scheduledStart! ? -1 : 1));

  const conflicts = useMemo(() => {
    const ids = new Set<string>();
    for (let i = 0; i < sorted.length; i++)
      for (let k = i + 1; k < sorted.length; k++) if (mins(sorted[k].scheduledStart!) < mins(sorted[i].scheduledEnd!)) {
        ids.add(sorted[i].id);
        ids.add(sorted[k].id);
      }
    return ids;
  }, [sorted]);

  return (
    <div className="grid grid-cols-[180px_1fr] border-b border-line last:border-b-0">
      <div className="flex items-center gap-2.5 border-r border-line px-4 py-3">
        <WorkerAvatar id={workerId} size="md" />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-ink">{member.name}</p>
          <p className="text-[11px] text-muted">{util}% booked</p>
          <ProgressBar value={util} className="mt-1 h-1" tone={util > 95 ? 'amber' : 'brand'} label={`${member.name} utilisation`} />
        </div>
      </div>
      <div
        className={cx('relative h-[104px] transition', over && 'bg-secondary-soft')}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          setOver(false);
          onDrop(e, workerId);
        }}
      >
        {HOURS.map((h) => (
          <span key={h} className="absolute inset-y-0 w-px bg-line/70" style={{ left: pct(h * 60) }} aria-hidden />
        ))}
        {nowM !== null && nowM > DAY_START && nowM < DAY_END && (
          <span className="absolute inset-y-0 z-20 w-0.5 bg-danger" style={{ left: pct(nowM) }} aria-hidden>
            <span className="absolute -left-[3px] -top-0.5 size-2 rounded-full bg-danger" />
          </span>
        )}
        {sorted.map((j, i) => {
          const s = mins(j.scheduledStart!);
          const e = mins(j.scheduledEnd!);
          const svc = state.config.services.find((x) => x.id === j.service)!;
          const tone = serviceTone(svc.color);
          const prog = jobProgress(state.data, j);
          const overrun = nowM !== null && j.status === 'in-progress' && nowM > e ? nowM - e : 0;
          const next = sorted[i + 1];
          const gap = next ? mins(next.scheduledStart!) - Math.max(e, e + overrun) : 0;
          const travel = next?.travelMinutes ?? 12;
          const done = ['completed', 'invoiced', 'closed'].includes(j.status);
          return (
            <div key={j.id}>
              {overrun > 0 && (
                <div
                  className="absolute top-2 z-0 h-[78px] rounded-r-lg border border-l-0 border-dashed border-danger/60 bg-[repeating-linear-gradient(135deg,rgb(214_69_69/0.12)_0_6px,transparent_6px_12px)]"
                  style={{ left: pct(e), width: `calc(${pct(e + overrun)} - ${pct(e)})` }}
                  title={`Running ${overrun} min over`}
                />
              )}
              <button
                type="button"
                onClick={() => navigate(`/app/jobs/${j.id}`)}
                className={cx(
                  'absolute top-2 z-10 flex h-[78px] flex-col overflow-hidden rounded-lg border-l-4 px-1.5 py-1 text-left shadow-sm transition hover:z-30 hover:shadow-float focus-visible:z-30',
                  conflicts.has(j.id) && 'ring-2 ring-danger',
                  done && 'opacity-60',
                )}
                style={{ left: pct(s), width: `calc(${pct(e)} - ${pct(s)} - 3px)`, background: tone.soft, borderColor: tone.color }}
                aria-label={`${j.title}, ${j.scheduledStart!.slice(11, 16)} to ${j.scheduledEnd!.slice(11, 16)}, ${j.status}`}
              >
                <span className="flex items-center gap-1 text-[11px] font-bold" style={{ color: tone.ink }}>
                  <ServiceIcon name={svc.icon} className="size-3 shrink-0" /> {j.scheduledStart!.slice(11, 16)}–{j.scheduledEnd!.slice(11, 16)}
                </span>
                <span className="line-clamp-2 text-[12px] font-semibold leading-tight text-ink">{j.title}</span>
                {e - s >= 120 && <span className="truncate text-[11px] text-muted">{jobCustomerLabel(state.data, j)}</span>}
                <span className="mt-auto flex items-center gap-1">
                  {j.status === 'blocked' && <TriangleAlert className="size-3 text-danger-ink" aria-hidden />}
                  <span className="text-[10px] font-semibold uppercase text-ink-2">{j.status === 'in-progress' ? `${prog.pct}%` : j.status.replace('-', ' ')}</span>
                </span>
              </button>
              {next && gap > 0 && (
                <span
                  className={cx('absolute bottom-1 z-10 inline-flex -translate-x-1/2 items-center gap-0.5 rounded-full px-1.5 py-px text-[10px] font-semibold', gap < travel ? 'bg-danger-soft text-danger-ink' : 'bg-subtle text-muted')}
                  style={{ left: `calc((${pct(Math.max(e, e + overrun))} + ${pct(mins(next.scheduledStart!))}) / 2)` }}
                  title={gap < travel ? `Only ${gap} min to travel ${travel} min` : `${travel} min travel`}
                >
                  <Car className="size-3" aria-hidden /> {travel}m{gap < travel ? ' !' : ''}
                </span>
              )}
            </div>
          );
        })}
        {holds.map((l) => {
          const s = mins(`${l.preferredSlot!.date}T${l.preferredSlot!.start}`);
          const e = mins(`${l.preferredSlot!.date}T${l.preferredSlot!.end}`);
          return (
            <Link
              key={l.id}
              to={`/app/leads/${l.id}`}
              className="absolute top-2 z-10 flex h-[78px] flex-col overflow-hidden rounded-lg border-2 border-dashed border-warning bg-warning-soft/90 px-2 py-1.5 text-left hover:z-30 hover:shadow-float"
              style={{ left: pct(s), width: `calc(${pct(e)} - ${pct(s)} - 3px)` }}
            >
              <span className="text-[11px] font-bold text-warning-ink">
                {l.preferredSlot!.start}–{l.preferredSlot!.end}
              </span>
              <span className="line-clamp-2 text-[12px] font-semibold leading-tight text-ink">{l.customerName}</span>
              <span className="mt-auto text-[10px] font-bold uppercase text-warning-ink">Provisional · convert</span>
            </Link>
          );
        })}
        {conflicts.size > 0 && (
          <span className="absolute right-2 top-1 z-30 inline-flex items-center gap-1 rounded-full bg-danger px-2 py-0.5 text-[10px] font-bold text-white">
            <TriangleAlert className="size-3" aria-hidden /> Overlap
          </span>
        )}
      </div>
    </div>
  );
}

function HoldCard({ lead }: { lead: Lead }) {
  return (
    <Link to={`/app/leads/${lead.id}`} className="block rounded-xl border-2 border-dashed border-warning bg-warning-soft/70 p-3">
      <p className="text-sm font-semibold text-ink">
        {lead.preferredSlot!.start} · {lead.customerName} <span className="text-warning-ink">(provisional)</span>
      </p>
      <p className="text-xs text-muted">Lead {lead.ref} — convert to confirm</p>
    </Link>
  );
}

function WeekView({ date }: { date: string }) {
  const { state } = useDemo();
  const d = state.data;
  const start = weekStart(date);
  const days = Array.from({ length: 6 }, (_, i) => addDays(start, i));
  const workers = d.team.filter((m) => !m.isOffice && m.active);
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[860px] table-fixed text-sm">
        <thead>
          <tr className="border-b border-line bg-canvas">
            <th className="w-40 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">Team</th>
            {days.map((day) => (
              <th key={day} className={cx('px-2 py-2.5 text-left text-xs font-semibold', day === DEMO_DATE ? 'text-secondary-ink' : 'text-muted')}>
                {parseLocal(day).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}
                {day === DEMO_DATE && ' · Today'}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {workers.map((w) => (
            <tr key={w.id} className="align-top">
              <td className="px-3 py-3">
                <span className="flex items-center gap-2 font-semibold text-ink">
                  <WorkerAvatar id={w.id} size="sm" /> {w.firstName}
                </span>
              </td>
              {days.map((day) => {
                const list = jobsOn(d, day).filter((j) => j.assignedWorkerIds.includes(w.id));
                return (
                  <td key={day} className={cx('px-1.5 py-2', day === DEMO_DATE && 'bg-secondary-soft/40')}>
                    <div className="space-y-1">
                      {list.map((j) => {
                        const tone = serviceTone(state.config.services.find((s) => s.id === j.service)!.color);
                        return (
                          <Link key={j.id} to={`/app/jobs/${j.id}`} className="block rounded-md border-l-[3px] px-1.5 py-1 text-[11px] leading-tight hover:shadow-raised" style={{ background: tone.soft, borderColor: tone.color }}>
                            <span className="font-bold" style={{ color: tone.ink }}>
                              {j.scheduledStart!.slice(11, 16)}
                            </span>{' '}
                            <span className="text-ink">{j.title.replace(/ (Window|Gutter|Kitchen|Radiator|Outside|Basin|Autumn) .*/, '')}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TeamView({ date }: { date: string }) {
  const { state } = useDemo();
  const d = state.data;
  const workers = d.team.filter((m) => !m.isOffice && m.active);
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {workers.map((w) => {
        const list = jobsOn(d, date).filter((j) => j.assignedWorkerIds.includes(w.id));
        const booked = list.reduce((a, j) => a + (mins(j.scheduledEnd!) - mins(j.scheduledStart!)), 0);
        const util = Math.round((booked / 480) * 100);
        const value = list.reduce((a, j) => a + (j.quotedAmount ?? 0), 0);
        return (
          <Card key={w.id}>
            <div className="flex items-center gap-3">
              <WorkerAvatar id={w.id} size="lg" />
              <div>
                <p className="text-lg font-bold text-ink">{w.name}</p>
                <p className="text-sm text-muted">{w.role}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-canvas p-2">
                <p className="font-display text-xl font-extrabold text-ink">{list.length}</p>
                <p className="text-[11px] text-muted">Jobs</p>
              </div>
              <div className="rounded-xl bg-canvas p-2">
                <p className="font-display text-xl font-extrabold text-ink">{util}%</p>
                <p className="text-[11px] text-muted">Booked</p>
              </div>
              <div className="rounded-xl bg-canvas p-2">
                <p className="font-display text-xl font-extrabold text-ink">{money(value)}</p>
                <p className="text-[11px] text-muted">Work value</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {w.services.map((s) => (
                <ServiceBadge key={s} service={s} short />
              ))}
            </div>
            <ul className="mt-4 space-y-2">
              {list.map((j) => (
                <li key={j.id}>
                  <Link to={`/app/jobs/${j.id}`} className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-sm hover:bg-canvas">
                    <span className="flex items-center gap-2">
                      <Clock className="size-3.5 text-muted" aria-hidden />
                      <span className="tabular font-semibold">{j.scheduledStart!.slice(11, 16)}</span> {j.title}
                    </span>
                    <StatusBadge kind="job" status={j.status} className="h-5 px-2 text-[10px]" />
                  </Link>
                </li>
              ))}
              {!list.length && (
                <li className="flex items-center gap-2 text-sm text-muted">
                  <Users className="size-4" aria-hidden /> Free all day
                </li>
              )}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}
