import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  Inbox,
  Leaf,
  PoundSterling,
  Repeat,
  Sparkles,
  Star,
  TriangleAlert,
  UserPlus,
  Wand2,
} from 'lucide-react';
import { useDemo } from '../../app/DemoProvider';
import { atRiskJobs, dashboardKpis, getCustomer, invoiceTotal, jobsToday, openLeads, recentPayments, recurringDue, autumnGutterReminders, workerStatus } from '../../app/selectors';
import { MORRISON_JOB_ID, MORRISON_NEW, routeSuggestion, secondaryInsights } from '../../utils/insights';
import { Card, CardHeader, CardLink, StatCard } from '../../components/common/Card';
import { Button, LinkButton } from '../../components/common/Button';
import { WorkerAvatar } from '../../components/common/Avatar';
import { ServiceBadge } from '../../components/common/Badge';
import { JobRow, LeadCard } from '../../components/owner/OwnerBits';
import { useQuickActions } from '../../components/owner/QuickActions';
import { useToast } from '../../components/common/Toast';
import { compactMoney, longDate, money, pluralise, relativeDay, timeAgo } from '../../utils/format';
import { DEMO_DATE } from '../../data/demoClock';
import { cx } from '../../utils/cx';

export default function Dashboard() {
  const { state, actions } = useDemo();
  const d = state.data;
  const navigate = useNavigate();
  const quick = useQuickActions();
  const toast = useToast();
  const k = dashboardKpis(d);
  const today = jobsToday(d);
  const holds = d.leads.filter((l) => l.status !== 'converted' && l.status !== 'lost' && l.preferredSlot?.date === DEMO_DATE);
  const leads = [...openLeads(d)].sort((a, b) => (a.urgency === b.urgency ? (a.createdAt < b.createdAt ? 1 : -1) : a.urgency === 'urgent' ? -1 : 1)).slice(0, 3);
  const risks = atRiskJobs(d).slice(0, 4);
  const due = recurringDue(d, 10).slice(0, 4);
  const autumn = autumnGutterReminders(d);
  const payments = recentPayments(d, 3);
  const suggestion = routeSuggestion(d);
  const extra = secondaryInsights(d);
  const team = d.team.filter((m) => m.active && !m.invited);

  const apply = () => {
    actions.scheduleJob(MORRISON_JOB_ID, MORRISON_NEW.start, MORRISON_NEW.end, ['w-maya'], 'Moved to 12:15 after the Shah gutter job (Copilot suggestion) — saves ~25 min travel');
    toast({ title: 'Schedule updated', description: 'Morrison window clean moved to 12:15–13:15 with Maya.', action: { label: 'View schedule', to: '/app/schedule' } });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[13px] font-semibold text-muted">{longDate(DEMO_DATE)}</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink md:text-[28px]">Good morning, Daniel</h1>
          <p className="mt-0.5 text-[15px] text-muted">
            {pluralise(k.jobsToday, 'job')} today · {pluralise(k.openLeads, 'open lead')} · {risks.length ? `${pluralise(risks.length, 'job')} need attention` : 'nothing at risk'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <LinkButton to="/app/schedule" variant="outline" icon={<CalendarDays className="size-4" />}>
            Open Schedule
          </LinkButton>
          <LinkButton to="/app/copilot" icon={<Sparkles className="size-4" />}>
            Ask Copilot
          </LinkButton>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Jobs Today" value={k.jobsToday} icon={BriefcaseBusiness} to="/app/schedule" sub={`${today.filter((j) => ['completed', 'invoiced', 'closed'].includes(j.status)).length} done · ${today.filter((j) => j.status === 'in-progress').length} live`} />
        <StatCard label="New Leads" value={k.openLeads} icon={Inbox} tone="accent" to="/app/leads" sub={`${k.newLeadsToday} arrived today`} />
        <StatCard label="Revenue · Oct to date" value={compactMoney(k.revenue.total)} icon={PoundSterling} tone="green" to="/app/reports" trend={{ text: '▲ 8%', good: true }} sub="vs Sep pace" />
        <StatCard label="Outstanding" value={money(k.outstanding.total)} icon={FileText} tone="amber" to="/app/invoices" sub={`${k.outstanding.count} invoices · ${k.outstanding.overdueCount} overdue`} />
        <StatCard label="On-Time Completion" value={`${k.onTime}%`} icon={Clock} tone="violet" to="/app/reports" sub="This month" />
        <StatCard label="Customer Rating" value={k.rating.toFixed(1)} icon={Star} tone="amber" to="/reviews" sub="Demo reviews" />
      </div>

      <div className="grid grid-cols-1 gap-6xl:grid-cols-[1.6fr_1fr]">
        {/* Today's schedule */}
        <Card>
          <CardHeader title="Today’s schedule" subtitle={`${today.length} jobs across ${new Set(today.flatMap((j) => j.assignedWorkerIds)).size} people`} icon={CalendarDays} action={<CardLink to="/app/schedule">Full schedule</CardLink>} />
          <div className="space-y-2">
            {[...today, ...holds.map((l) => ({ hold: l }))]
              .sort((a, b) => {
                const sa = 'hold' in a ? `${a.hold.preferredSlot!.date}T${a.hold.preferredSlot!.start}` : a.scheduledStart!;
                const sb = 'hold' in b ? `${b.hold.preferredSlot!.date}T${b.hold.preferredSlot!.start}` : b.scheduledStart!;
                return sa < sb ? -1 : 1;
              })
              .map((item) =>
                'hold' in item ? (
                  <Link key={item.hold.id} to={`/app/leads/${item.hold.id}`} className="flex items-center gap-3 rounded-xl border border-dashed border-warning bg-warning-soft/50 p-3 hover:bg-warning-soft">
                    <span className="w-1 self-stretch rounded-full bg-warning" aria-hidden />
                    <div className="w-[76px] shrink-0">
                      <p className="tabular text-sm font-bold text-ink">{item.hold.preferredSlot!.start}</p>
                      <p className="tabular text-xs text-muted">to {item.hold.preferredSlot!.end}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{item.hold.customerName} — awaiting conversion</p>
                      <p className="truncate text-xs text-warning-ink">Provisional slot held · lead {item.hold.ref}</p>
                    </div>
                    <span className="text-xs font-bold text-warning-ink">Convert →</span>
                  </Link>
                ) : (
                  <JobRow key={item.id} job={item} />
                ),
              )}
          </div>
        </Card>

        <div className="space-y-6">
          {/* AI insight */}
          <div className="relative overflow-hidden rounded-card bg-gradient-to-br from-primary-solid to-primary-deep p-5 text-white shadow-raised">
            <div className="absolute -right-10 -top-10 size-40 rounded-full bg-secondary opacity-30 blur-2xl" aria-hidden />
            <div className="relative">
              <p className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wider text-white/75">
                <Bot className="size-4" aria-hidden /> AI insight
              </p>
              <p className="mt-2.5 text-[15px] leading-relaxed text-white">{suggestion.text}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <LinkButton to="/app/schedule" variant="white" size="sm" icon={<CalendarDays className="size-4" />}>
                  Open Schedule
                </LinkButton>
                <LinkButton to="/app/copilot?ask=plan" size="sm" variant="ghost" className="text-white ring-1 ring-white/30 hover:bg-white/10" icon={<Sparkles className="size-4" />}>
                  Ask Copilot
                </LinkButton>
                {suggestion.applicable && (
                  <Button size="sm" variant="accent" icon={<Wand2 className="size-4" />} onClick={apply}>
                    Apply suggestion
                  </Button>
                )}
                {suggestion.applied && (
                  <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white/12 px-3 text-xs font-bold">
                    <CheckCircle2 className="size-4 text-accent-tint" aria-hidden /> Applied
                  </span>
                )}
              </div>
              {extra.length > 0 && (
                <ul className="mt-4 space-y-2 border-t border-white/15 pt-3">
                  {extra.slice(0, 2).map((x) => (
                    <li key={x.id} className="flex items-start gap-2 text-[13px] text-white/80">
                      <Sparkles className="mt-0.5 size-3.5 shrink-0 text-accent-tint" aria-hidden />
                      <span>
                        {x.text}{' '}
                        {x.link && (
                          <button type="button" onClick={() => navigate(x.link!.to)} className="font-semibold text-white underline-offset-2 hover:underline">
                            {x.link.label}
                          </button>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <Card>
            <CardHeader title="Quick actions" />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-2">
              {[
                { label: 'New Customer', icon: UserPlus, run: () => quick.open('customer') },
                { label: 'New Job', icon: BriefcaseBusiness, run: () => quick.open('job') },
                { label: 'New Quote', icon: FileText, run: () => quick.open('quote') },
                { label: 'Record Payment', icon: PoundSterling, run: () => quick.open('payment') },
                { label: 'Ask Copilot', icon: Bot, run: () => navigate('/app/copilot') },
              ].map((a) => (
                <button key={a.label} type="button" onClick={a.run} className="flex items-center gap-2.5 rounded-xl border border-line px-3 py-3 text-left text-sm font-semibold text-ink transition hover:border-secondary hover:bg-secondary-soft">
                  <a.icon className="size-4.5 text-secondary-ink" aria-hidden /> {a.label}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6lg:grid-cols-3">
        <Card>
          <CardHeader title="Leads needing attention" icon={Inbox} action={<CardLink to="/app/leads">All leads</CardLink>} />
          <div className="space-y-2.5">
            {leads.length ? leads.map((l) => <LeadCard key={l.id} lead={l} />) : <p className="text-sm text-muted">Inbox zero — no open leads.</p>}
          </div>
        </Card>

        <Card>
          <CardHeader title="Jobs at risk" icon={TriangleAlert} action={<CardLink to="/app/jobs?filter=risk">View all</CardLink>} />
          {risks.length ? (
            <ul className="space-y-2.5">
              {risks.map((r) => (
                <li key={r.job.id}>
                  <Link to={`/app/jobs/${r.job.id}`} className={cx('block rounded-xl border p-3.5 transition hover:shadow-raised', r.severity === 'high' ? 'border-danger/30 bg-danger-soft/60' : 'border-warning/40 bg-warning-soft/60')}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-ink">{r.job.title}</p>
                      <span className={cx('rounded-full px-2 py-0.5 text-[11px] font-bold uppercase', r.severity === 'high' ? 'bg-danger text-white' : 'bg-warning text-ink')}>{r.severity === 'high' ? 'Blocked' : 'Watch'}</span>
                    </div>
                    <p className="mt-1 flex items-start gap-1.5 text-sm text-ink-2">
                      <TriangleAlert className={cx('mt-0.5 size-4 shrink-0', r.severity === 'high' ? 'text-danger-ink' : 'text-warning-ink')} aria-hidden /> {r.reason}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {r.job.ref} · {relativeDay(r.job.scheduledStart)} {r.job.scheduledStart?.slice(11, 16)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="flex items-center gap-2 text-sm text-success-ink">
              <CheckCircle2 className="size-4" aria-hidden /> All jobs on track.
            </p>
          )}
        </Card>

        <Card>
          <CardHeader title="Team status" subtitle="Live from the worker app" action={<CardLink to="/app/schedule?view=team">Team view</CardLink>} />
          <ul className="space-y-3">
            {team.map((m) => {
              const s = workerStatus(d, m.id);
              return (
                <li key={m.id} className="flex items-center gap-3">
                  <span className="relative">
                    <WorkerAvatar id={m.id} size="md" />
                    <span className={cx('absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full ring-2 ring-white', s.tone === 'warn' ? 'bg-warning' : s.tone === 'busy' ? 'bg-success' : s.tone === 'office' ? 'bg-secondary' : 'bg-line-2')} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">
                      {m.firstName} <span className="font-normal text-muted">— {s.label}</span>
                    </p>
                    <p className="truncate text-xs text-muted">{s.detail}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6lg:grid-cols-2">
        <Card>
          <CardHeader title="Recurring services due" subtitle="Next 10 days" icon={Repeat} action={<CardLink to="/app/copilot?ask=recurring">Ask Copilot</CardLink>} />
          <ul className="divide-y divide-line">
            {due.map((x) => (
              <li key={`${x.customer.id}-${x.service}`} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <Link to={`/app/customers/${x.customer.id}`} className="text-sm font-semibold text-ink hover:text-secondary-ink">
                    {x.customer.name}
                  </Link>
                  <p className="text-xs text-muted">
                    {x.label} · {x.customer.town}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={cx('text-xs font-semibold', x.booked ? 'text-success-ink' : 'text-ink-2')}>{x.booked ? 'Booked' : relativeDay(x.due)}</span>
                  <ServiceBadge service={x.service} short />
                </div>
              </li>
            ))}
          </ul>
          {autumn.length > 0 && (
            <div className="mt-3 flex items-start gap-3 rounded-xl bg-warning-soft p-3">
              <Leaf className="mt-0.5 size-5 shrink-0 text-warning-ink" aria-hidden />
              <div className="text-sm">
                <p className="font-semibold text-ink">Autumn gutter reminders</p>
                <p className="text-ink-2">
                  {autumn.map((a) => a.customer.name.split(' ')[0]).join(', ')} had autumn cleans last year and haven’t booked yet.
                </p>
                <button
                  type="button"
                  onClick={() => toast({ title: 'Reminders queued', description: `${autumn.length} autumn gutter reminders sent by SMS (demo).` })}
                  className="mt-1 font-semibold text-warning-ink hover:underline"
                >
                  Send {autumn.length} reminders →
                </button>
              </div>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Recent payments" icon={PoundSterling} action={<CardLink to="/app/invoices">Invoices</CardLink>} />
          <ul className="divide-y divide-line">
            {payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-success-soft text-success-ink">
                    <CheckCircle2 className="size-4.5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{getCustomer(d, p.customerId)?.name}</p>
                    <p className="text-xs text-muted">
                      {p.ref} · {p.method} · {timeAgo(p.paidAt)}
                    </p>
                  </div>
                </div>
                <span className="tabular font-bold text-ink">{money(invoiceTotal(p))}</span>
              </li>
            ))}
          </ul>
          <Link to="/app/reports" className="mt-3 flex items-center justify-between rounded-xl bg-canvas px-4 py-3 text-sm hover:bg-subtle">
            <span className="text-muted">October to date</span>
            <span className="flex items-center gap-2 font-bold text-ink">
              {money(k.revenue.total)} <ArrowRight className="size-4 text-muted" aria-hidden />
            </span>
          </Link>
        </Card>
      </div>
    </div>
  );
}
