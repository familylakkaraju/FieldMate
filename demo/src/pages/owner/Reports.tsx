import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Bot, Clock, PoundSterling, Repeat, TrendingUp, Users } from 'lucide-react';
import type { ServiceType } from '../../types/domain';
import { useDemo } from '../../app/DemoProvider';
import { invoiceTotal, isOutstanding, jobActualMinutes, jobEstimatedMinutes, jobValue, monthToDateRevenue } from '../../app/selectors';
import { CUSTOMER_MIX, LEAD_FUNNEL_90D, MONTHLY_HISTORY, UTILISATION_4W } from '../../data/history';
import { DEMO_DATE, parseLocal } from '../../data/demoClock';
import { CHART, SERVICE_CHART } from '../../theme/chartPalette';
import { PageHeader, StatCard } from '../../components/common/Card';
import { LinkButton } from '../../components/common/Button';
import { Segmented } from '../../components/common/Form';
import { ChartCard, ChartTooltip, axisProps } from '../../components/charts/ChartCard';
import { compactMoney, money } from '../../utils/format';

const SERVICES: ServiceType[] = ['plumbing', 'gutter', 'window'];

export default function Reports() {
  const { state } = useDemo();
  const d = state.data;
  const name = (s: ServiceType) => state.config.services.find((x) => x.id === s)!.name;
  const [period, setPeriod] = useState<'12' | '6' | '3'>('12');

  const months = useMemo(() => {
    const live = monthToDateRevenue(d);
    const recurringLive = d.jobs.filter((j) => j.kind === 'round' && ['completed', 'invoiced', 'closed'].includes(j.status) && (j.completedAt ?? '').startsWith(DEMO_DATE.slice(0, 7))).reduce((a, j) => a + jobValue(d, j), 0);
    const current = {
      month: DEMO_DATE.slice(0, 7),
      label: 'Oct*',
      plumbing: live.byService.plumbing,
      gutter: live.byService.gutter,
      window: live.byService.window,
      jobs: {
        plumbing: d.jobs.filter((j) => j.service === 'plumbing' && ['completed', 'invoiced', 'closed'].includes(j.status) && (j.completedAt ?? '').startsWith(DEMO_DATE.slice(0, 7))).length,
        gutter: d.jobs.filter((j) => j.service === 'gutter' && ['completed', 'invoiced', 'closed'].includes(j.status) && (j.completedAt ?? '').startsWith(DEMO_DATE.slice(0, 7))).length,
        window: d.jobs.filter((j) => j.service === 'window' && ['completed', 'invoiced', 'closed'].includes(j.status) && (j.completedAt ?? '').startsWith(DEMO_DATE.slice(0, 7))).length,
      },
      recurring: recurringLive,
      labourHours: { plumbing: 0, gutter: 0, window: 0 },
    };
    return [...MONTHLY_HISTORY, current].slice(-Number(period));
  }, [d, period]);

  const totals = SERVICES.map((s) => ({ service: s, revenue: months.reduce((a, m) => a + m[s], 0), jobs: months.reduce((a, m) => a + m.jobs[s], 0) }));
  const totalRevenue = totals.reduce((a, t) => a + t.revenue, 0);
  const totalJobs = totals.reduce((a, t) => a + t.jobs, 0);
  const hist = MONTHLY_HISTORY.slice(-Math.min(Number(period), 11));
  const perHour = SERVICES.map((s) => {
    const rev = hist.reduce((a, m) => a + m[s], 0);
    const hrs = hist.reduce((a, m) => a + m.labourHours[s], 0);
    return { service: s, name: name(s), value: Math.round(rev / Math.max(hrs, 1)) };
  });
  const best = [...perHour].sort((a, b) => b.value - a.value)[0];
  const recurringShare = Math.round((months.reduce((a, m) => a + m.recurring, 0) / Math.max(totalRevenue, 1)) * 100);

  // Actual vs quoted time — completed jobs this month, by service
  const doneThisMonth = d.jobs.filter((j) => ['completed', 'invoiced', 'closed'].includes(j.status) && (j.completedAt ?? '').startsWith(DEMO_DATE.slice(0, 7)));
  const timeBySvc = SERVICES.map((s) => {
    const js = doneThisMonth.filter((j) => j.service === s);
    const est = js.reduce((a, j) => a + jobEstimatedMinutes(d, j), 0) / Math.max(js.length, 1);
    const act = js.reduce((a, j) => a + jobActualMinutes(d, j), 0) / Math.max(js.length, 1);
    return { name: name(s), quoted: Math.round(est), actual: Math.round(act), over: est ? Math.round(((act - est) / est) * 100) : 0 };
  });
  const worstOver = [...timeBySvc].sort((a, b) => b.over - a.over)[0];

  const funnel = [
    { stage: 'Leads', value: LEAD_FUNNEL_90D.leads + d.leads.filter((l) => l.createdAt >= '2026-10-01').length },
    { stage: 'Contacted', value: LEAD_FUNNEL_90D.contacted + d.leads.filter((l) => l.createdAt >= '2026-10-01' && l.status !== 'new').length },
    { stage: 'Quoted', value: LEAD_FUNNEL_90D.quoted + d.leads.filter((l) => l.createdAt >= '2026-10-01' && ['quoted', 'converted'].includes(l.status)).length },
    { stage: 'Converted', value: LEAD_FUNNEL_90D.converted + d.leads.filter((l) => l.createdAt >= '2026-10-01' && l.status === 'converted').length },
  ];
  const conversion = Math.round((funnel[3].value / funnel[0].value) * 100);

  const util = UTILISATION_4W.map((u) => ({ name: d.team.find((m) => m.id === u.workerId)?.firstName ?? u.workerId, value: Math.round((u.booked / u.available) * 100) }));

  const open = d.invoices.filter(isOutstanding);
  const age = (i: (typeof open)[number]) => Math.round((parseLocal(DEMO_DATE).getTime() - parseLocal(i.issuedAt.slice(0, 10)).getTime()) / 86400000);
  const buckets = [
    { name: '0–7 days', value: open.filter((i) => age(i) <= 7).reduce((a, i) => a + invoiceTotal(i), 0) },
    { name: '8–14 days', value: open.filter((i) => age(i) > 7 && age(i) <= 14).reduce((a, i) => a + invoiceTotal(i), 0) },
    { name: '15–30 days', value: open.filter((i) => age(i) > 14 && age(i) <= 30).reduce((a, i) => a + invoiceTotal(i), 0) },
    { name: '30+ days', value: open.filter((i) => age(i) > 30).reduce((a, i) => a + invoiceTotal(i), 0) },
  ];

  const avgValue = SERVICES.map((s) => {
    const t = totals.find((x) => x.service === s)!;
    return { service: s, value: t.jobs ? Math.round(t.revenue / t.jobs) : 0 };
  });

  const serviceLegend = SERVICES.map((s) => ({ label: name(s), color: SERVICE_CHART[s] }));
  const gridProps = { stroke: CHART.grid, vertical: false } as const;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle="How the business is performing — revenue, conversion, time and team."
        actions={
          <>
            <Segmented label="Period" value={period} onChange={setPeriod} options={[{ value: '12', label: '12 months' }, { value: '6', label: '6 months' }, { value: '3', label: '3 months' }]} />
            <LinkButton to="/app/copilot?ask=profitable" variant="soft" icon={<Bot className="size-4" />}>
              Ask Copilot
            </LinkButton>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={`Revenue · ${period} months`} value={compactMoney(totalRevenue)} icon={PoundSterling} tone="green" sub="Includes October to date" />
        <StatCard label="Jobs & visits" value={totalJobs.toLocaleString('en-GB')} icon={TrendingUp} sub={`Avg ${money(Math.round(totalRevenue / Math.max(totalJobs, 1)))} each`} />
        <StatCard label="Recurring share" value={`${recurringShare}%`} icon={Repeat} tone="accent" sub="Window rounds" />
        <StatCard label="Lead conversion" value={`${conversion}%`} icon={Users} tone="violet" sub="Rolling 90 days" />
      </div>

      <div className="grid grid-cols-1 gap-6xl:grid-cols-[1.6fr_1fr]">
        <ChartCard
          title="Monthly revenue by service"
          subtitle="* October is month-to-date (live from the demo data)"
          legend={serviceLegend}
          table={{ columns: ['Month', ...SERVICES.map(name), 'Total'], rows: months.map((m) => [m.label, money(m.plumbing), money(m.gutter), money(m.window), money(m.plumbing + m.gutter + m.window)]) }}
          insight={<>Gutter revenue peaks in October–November (autumn care), while window rounds give a steady base all year. September was the strongest month at {money(MONTHLY_HISTORY[MONTHLY_HISTORY.length - 1].plumbing + MONTHLY_HISTORY[MONTHLY_HISTORY.length - 1].gutter + MONTHLY_HISTORY[MONTHLY_HISTORY.length - 1].window)}.</>}
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={months} margin={{ top: 8, right: 4, left: -8, bottom: 0 }} barCategoryGap="28%">
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis {...axisProps} axisLine={false} tickFormatter={(v) => `£${v / 1000}k`} width={48} />
                <Tooltip cursor={{ fill: CHART.grid, opacity: 0.4 }} content={<ChartTooltip />} />
                {SERVICES.map((s, i) => (
                  <Bar isAnimationActive={false}key={s} dataKey={s} name={name(s)} stackId="rev" fill={SERVICE_CHART[s]} stroke="#ffffff" strokeWidth={2} radius={i === SERVICES.length - 1 ? [4, 4, 0, 0] : 0} maxBarSize={36} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Revenue by service"
          subtitle={`Last ${period} months`}
          table={{ columns: ['Service', 'Revenue', 'Share'], rows: totals.map((t) => [name(t.service), money(t.revenue), `${Math.round((t.revenue / totalRevenue) * 100)}%`]) }}
          insight={<>{name([...totals].sort((a, b) => b.revenue - a.revenue)[0].service)} brings in the most revenue; {best.name.toLowerCase()} earns the most per labour hour ({money(best.value)}/hr).</>}
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={totals.map((t) => ({ ...t, label: name(t.service) }))} layout="vertical" margin={{ top: 4, right: 64, left: 0, bottom: 4 }} barCategoryGap="30%">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="label" {...axisProps} axisLine={false} width={110} />
                <Tooltip cursor={{ fill: CHART.grid, opacity: 0.4 }} content={<ChartTooltip />} />
                <Bar isAnimationActive={false}dataKey="revenue" name="Revenue" radius={[0, 4, 4, 0]} maxBarSize={34}>
                  {totals.map((t) => (
                    <Cell key={t.service} fill={SERVICE_CHART[t.service]} />
                  ))}
                  <LabelList dataKey="revenue" position="right" formatter={(v: number) => compactMoney(v)} style={{ fill: CHART.ink, fontSize: 12, fontWeight: 700 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-6lg:grid-cols-3">
        <ChartCard
          title="Jobs by service"
          subtitle={`Last ${period} months · window visits count per home`}
          table={{ columns: ['Service', 'Jobs'], rows: totals.map((t) => [name(t.service), t.jobs]) }}
          insight="Window cleaning is high-volume, low-ticket work — ideal for filling gaps between larger jobs."
        >
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={totals.map((t) => ({ ...t, label: name(t.service).split(' ')[0] }))} margin={{ top: 18, right: 4, left: -16, bottom: 0 }} barCategoryGap="35%">
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis {...axisProps} axisLine={false} width={40} />
                <Tooltip cursor={{ fill: CHART.grid, opacity: 0.4 }} content={<ChartTooltip money={false} suffix=" jobs" />} />
                <Bar isAnimationActive={false}dataKey="jobs" name="Jobs" radius={[4, 4, 0, 0]} maxBarSize={44}>
                  {totals.map((t) => (
                    <Cell key={t.service} fill={SERVICE_CHART[t.service]} />
                  ))}
                  <LabelList dataKey="jobs" position="top" style={{ fill: CHART.ink, fontSize: 12, fontWeight: 700 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Lead conversion"
          subtitle="Rolling 90 days"
          table={{ columns: ['Stage', 'Leads'], rows: funnel.map((f) => [f.stage, f.value]) }}
          insight={<>{conversion}% of leads become paying jobs. Website quotes convert best — instant estimates set expectations early.</>}
        >
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnel} layout="vertical" margin={{ top: 4, right: 44, left: 0, bottom: 4 }} barCategoryGap="22%">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="stage" {...axisProps} axisLine={false} width={80} />
                <Tooltip cursor={{ fill: CHART.grid, opacity: 0.4 }} content={<ChartTooltip money={false} suffix=" leads" />} />
                <Bar isAnimationActive={false}dataKey="value" name="Leads" radius={[0, 4, 4, 0]} maxBarSize={30}>
                  {funnel.map((f, i) => (
                    <Cell key={f.stage} fill={['#86b6ef', '#5598e7', '#2a78d6', '#1c5cab'][i]} />
                  ))}
                  <LabelList dataKey="value" position="right" style={{ fill: CHART.ink, fontSize: 12, fontWeight: 700 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Actual vs quoted time"
          subtitle="Average minutes per job · October"
          legend={[{ label: 'Quoted', color: CHART.quoted }, { label: 'Actual', color: CHART.actual }]}
          table={{ columns: ['Service', 'Quoted (min)', 'Actual (min)', 'Variance'], rows: timeBySvc.map((t) => [t.name, t.quoted, t.actual, `${t.over > 0 ? '+' : ''}${t.over}%`]) }}
          insight={<>{worstOver.name} jobs run {worstOver.over}% over the quoted time — mostly blocked downpipes and moss. Consider adding £25 downpipe clearance to every gutter quote.</>}
        >
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeBySvc.map((t) => ({ ...t, label: t.name.split(' ')[0] }))} margin={{ top: 18, right: 4, left: -16, bottom: 0 }} barGap={2} barCategoryGap="28%">
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis {...axisProps} axisLine={false} width={40} />
                <Tooltip cursor={{ fill: CHART.grid, opacity: 0.4 }} content={<ChartTooltip money={false} suffix=" min" />} />
                <Bar isAnimationActive={false}dataKey="quoted" name="Quoted" fill={CHART.quoted} radius={[4, 4, 0, 0]} maxBarSize={22} />
                <Bar isAnimationActive={false}dataKey="actual" name="Actual" fill={CHART.actual} radius={[4, 4, 0, 0]} maxBarSize={22}>
                  <LabelList dataKey="over" position="top" formatter={(v: number) => (v > 0 ? `+${v}%` : `${v}%`)} style={{ fill: CHART.secondary, fontSize: 11, fontWeight: 700 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {avgValue.map((a) => (
          <div key={a.service} className="card flex items-center gap-4 p-4">
            <span className="h-10 w-1.5 rounded-full" style={{ background: SERVICE_CHART[a.service] }} aria-hidden />
            <div>
              <p className="text-[13px] font-semibold text-muted">Average job value · {name(a.service)}</p>
              <p className="font-display text-2xl font-extrabold text-ink">{money(a.value)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6lg:grid-cols-2 xl:grid-cols-4">
        <ChartCard
          className="xl:col-span-2"
          title="Recurring revenue"
          subtitle="Window rounds per month"
          table={{ columns: ['Month', 'Recurring'], rows: months.map((m) => [m.label, money(m.recurring)]) }}
          insight="Recurring rounds grew steadily through spring and summer — a predictable base that covers most fixed costs."
        >
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={months} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis {...axisProps} axisLine={false} tickFormatter={(v) => `£${(v / 1000).toFixed(1)}k`} width={52} />
                <Tooltip cursor={{ stroke: CHART.axis }} content={<ChartTooltip />} />
                <Line isAnimationActive={false}type="monotone" dataKey="recurring" name="Recurring revenue" stroke={SERVICE_CHART.window} strokeWidth={2} dot={{ r: 4, fill: SERVICE_CHART.window, stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Customer mix" subtitle="Active customers by plan" table={{ columns: ['Segment', 'Customers'], rows: CUSTOMER_MIX.map((c) => [c.name, c.value]) }} insight="43% of customers are on a recurring window plan.">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={CUSTOMER_MIX} layout="vertical" margin={{ top: 4, right: 36, left: 0, bottom: 4 }} barCategoryGap="25%">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" {...axisProps} axisLine={false} width={118} tick={{ fill: CHART.muted, fontSize: 11 }} />
                <Tooltip cursor={{ fill: CHART.grid, opacity: 0.4 }} content={<ChartTooltip money={false} suffix=" customers" />} />
                <Bar isAnimationActive={false}dataKey="value" name="Customers" fill={CHART.single} radius={[0, 4, 4, 0]} maxBarSize={26}>
                  <LabelList dataKey="value" position="right" style={{ fill: CHART.ink, fontSize: 12, fontWeight: 700 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Worker utilisation" subtitle="Booked vs available · last 4 weeks" table={{ columns: ['Worker', 'Utilisation'], rows: util.map((u) => [u.name, `${u.value}%`]) }} insight="Maya is close to capacity in gutter season — Owen has room for 2–3 more window rounds a week.">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={util} layout="vertical" margin={{ top: 4, right: 40, left: 0, bottom: 4 }} barCategoryGap="30%">
                <XAxis type="number" hide domain={[0, 100]} />
                <YAxis type="category" dataKey="name" {...axisProps} axisLine={false} width={60} />
                <Tooltip cursor={{ fill: CHART.grid, opacity: 0.4 }} content={<ChartTooltip money={false} suffix="%" />} />
                <Bar isAnimationActive={false}dataKey="value" name="Utilisation" fill={CHART.single} radius={[0, 4, 4, 0]} maxBarSize={26} background={{ fill: '#eef2f6', radius: 4 }}>
                  <LabelList dataKey="value" position="right" formatter={(v: number) => `${v}%`} style={{ fill: CHART.ink, fontSize: 12, fontWeight: 700 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-6lg:grid-cols-[1fr_1.4fr]">
        <ChartCard
          title="Outstanding invoices"
          subtitle="By age since issue"
          table={{ columns: ['Age', 'Amount'], rows: buckets.map((b) => [b.name, money(b.value)]) }}
          insight={<>{money(open.reduce((a, i) => a + invoiceTotal(i), 0))} is outstanding across {open.length} invoices. One invoice is over 3 weeks old — a reminder is due.</>}
        >
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={buckets} margin={{ top: 18, right: 4, left: -8, bottom: 0 }} barCategoryGap="30%">
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="name" {...axisProps} />
                <YAxis {...axisProps} axisLine={false} tickFormatter={(v) => `£${v}`} width={52} />
                <Tooltip cursor={{ fill: CHART.grid, opacity: 0.4 }} content={<ChartTooltip />} />
                <Bar isAnimationActive={false}dataKey="value" name="Outstanding" fill={CHART.single} radius={[4, 4, 0, 0]} maxBarSize={44}>
                  <LabelList dataKey="value" position="top" formatter={(v: number) => (v ? `£${v}` : '')} style={{ fill: CHART.ink, fontSize: 12, fontWeight: 700 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
        <section className="card p-5" aria-label="Profitability per labour hour">
          <h2 className="text-[15px] font-bold text-ink">Revenue per labour hour</h2>
          <p className="text-[13px] text-muted">The clearest view of which work is most profitable</p>
          <ul className="mt-5 space-y-4">
            {[...perHour].sort((a, b) => b.value - a.value).map((p) => (
              <li key={p.service}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-semibold text-ink">
                    <span className="size-2.5 rounded-[3px]" style={{ background: SERVICE_CHART[p.service] }} aria-hidden /> {p.name}
                  </span>
                  <span className="tabular font-bold text-ink">{money(p.value)}/hr</span>
                </div>
                <div className="h-2.5 rounded-full bg-subtle">
                  <div className="h-2.5 rounded-full" style={{ width: `${(p.value / perHour.reduce((m, x) => Math.max(m, x.value), 1)) * 100}%`, background: SERVICE_CHART[p.service] }} />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-5 flex items-start gap-2 rounded-xl bg-canvas p-3 text-[13px] text-ink-2">
            <Clock className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden /> {best.name} earns {money(best.value)} per labour hour. Gutter work earns more per hour but is seasonal; plumbing keeps revenue steady through winter.
          </p>
        </section>
      </div>
    </div>
  );
}
