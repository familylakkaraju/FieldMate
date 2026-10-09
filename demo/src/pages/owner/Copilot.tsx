import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  ClipboardList,
  FilePen,
  Inbox,
  PoundSterling,
  Repeat,
  RotateCcw,
  Send,
  Sparkles,
  Timer,
  TrendingUp,
  TriangleAlert,
  UserCheck,
  Wand2,
  type LucideIcon,
} from 'lucide-react';
import { useDemo } from '../../app/DemoProvider';
import { atRiskJobs, jobsToday, openLeads, outstandingTotals } from '../../app/selectors';
import { Button } from '../../components/common/Button';
import { PageHeader } from '../../components/common/Card';
import { CopilotChat, type CopilotChatHandle } from '../../components/copilot/CopilotChat';
import { PRESET_PROMPTS } from '../../utils/demoResponses';
import { money } from '../../utils/format';
import { cx } from '../../utils/cx';

const ICONS: Record<string, LucideIcon> = {
  plan: CalendarClock,
  risk: TriangleAlert,
  sarah: FilePen,
  shah: ClipboardList,
  recurring: Repeat,
  time: Timer,
  profitable: TrendingUp,
};

export default function Copilot() {
  const { state } = useDemo();
  const d = state.data;
  const [params, setParams] = useSearchParams();
  const ask = params.get('ask') ?? undefined;
  const chat = useRef<CopilotChatHandle>(null);
  const [count, setCount] = useState(0);

  // The chat consumes ?ask= on mount; drop it from the URL so Back / refresh don't ask twice.
  useEffect(() => {
    if (!ask) return;
    const next = new URLSearchParams(params);
    next.delete('ask');
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ask]);

  const today = jobsToday(d);
  const done = today.filter((j) => ['completed', 'invoiced', 'closed'].includes(j.status)).length;
  const live = today.filter((j) => j.status === 'in-progress' || j.status === 'blocked').length;
  const risks = atRiskJobs(d);
  const blocked = risks.filter((r) => r.severity === 'high').length;
  const leads = openLeads(d);
  const urgent = leads.filter((l) => l.urgency === 'urgent').length;
  const out = outstandingTotals(d);

  const glance: { label: string; value: string | number; sub: string; to: string; icon: LucideIcon; tone: string }[] = [
    { label: 'Jobs today', value: today.length, sub: `${done} done · ${live} live`, to: '/app/schedule', icon: BriefcaseBusiness, tone: 'bg-secondary-soft text-secondary-ink' },
    { label: 'At risk', value: risks.length, sub: risks.length ? `${blocked} blocked` : 'All on track', to: '/app/jobs?filter=risk', icon: TriangleAlert, tone: risks.length ? 'bg-warning-soft text-warning-ink' : 'bg-success-soft text-success-ink' },
    { label: 'Open leads', value: leads.length, sub: urgent ? `${urgent} urgent` : 'None urgent', to: '/app/leads', icon: Inbox, tone: 'bg-accent-soft text-accent-ink' },
    { label: 'Outstanding', value: money(out.total), sub: `${out.overdueCount} overdue`, to: '/app/invoices', icon: PoundSterling, tone: 'bg-warning-soft text-warning-ink' },
  ];

  const abilities: { icon: LucideIcon; text: string }[] = [
    { icon: Wand2, text: 'Apply schedule suggestions' },
    { icon: FilePen, text: 'Draft and create quotes' },
    { icon: UserCheck, text: 'Convert leads into jobs' },
    { icon: Send, text: 'Send customer reminders' },
  ];

  return (
    <div>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary-soft px-2.5 py-0.5 text-[12px] font-bold text-secondary-ink">
            <Sparkles className="size-3.5" aria-hidden /> Simulated AI · uses demo data only
          </span>
        }
        title="AI Copilot"
        subtitle="Ask about today’s jobs, your team, customers and money — answers come straight from your business data."
        actions={
          <Button variant="outline" icon={<RotateCcw className="size-4" aria-hidden />} disabled={!count} onClick={() => chat.current?.clear()}>
            Clear conversation
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="order-last space-y-4 lg:order-none" aria-label="Copilot context">
          <section className="card hidden overflow-hidden lg:block">
            <h2 className="border-b border-line px-4 py-3 text-[12px] font-bold uppercase tracking-wider text-muted">Suggested questions</h2>
            <ul className="p-1.5">
              {PRESET_PROMPTS.map((p) => {
                const Icon = ICONS[p.key] ?? Sparkles;
                return (
                  <li key={p.key}>
                    <button type="button" onClick={() => chat.current?.ask(p.prompt)} className="group flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition hover:bg-subtle">
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary-soft text-secondary-ink transition group-hover:bg-secondary-solid group-hover:text-secondary-on">
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink">{p.prompt}</span>
                        <span className="block truncate text-xs text-muted">{p.hint}</span>
                      </span>
                      <ArrowRight className="size-4 shrink-0 text-muted opacity-0 transition group-hover:opacity-100" aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="card p-4">
            <h2 className="text-[12px] font-bold uppercase tracking-wider text-muted">Today at a glance</h2>
            <ul className="mt-3 grid grid-cols-2 gap-2.5">
              {glance.map((g) => (
                <li key={g.label}>
                  <Link to={g.to} className="block h-full rounded-xl border border-line p-3 transition hover:border-secondary/40 hover:bg-secondary-soft/40">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-semibold text-muted">{g.label}</span>
                      <span className={cx('grid size-7 place-items-center rounded-lg', g.tone)}>
                        <g.icon className="size-3.5" aria-hidden />
                      </span>
                    </span>
                    <span className="tabular mt-1 block font-display text-xl font-extrabold tracking-tight text-ink">{g.value}</span>
                    <span className="block truncate text-[12px] text-muted">{g.sub}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-card border border-line bg-gradient-to-br from-secondary-soft via-surface to-accent-soft p-4 shadow-card">
            <h2 className="flex items-center gap-2 text-[13px] font-bold text-ink">
              <Sparkles className="size-4 text-secondary-ink" aria-hidden /> Copilot can act, not just answer
            </h2>
            <ul className="mt-2.5 space-y-2">
              {abilities.map((a) => (
                <li key={a.text} className="flex items-center gap-2.5 text-[13px] text-ink-2">
                  <a.icon className="size-4 shrink-0 text-secondary-ink" aria-hidden />
                  {a.text}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[12px] leading-relaxed text-muted">Every action asks first and shows up straight away on the schedule, quotes and customer records.</p>
          </section>
        </aside>

        <CopilotChat variant="full" initialAsk={ask} handleRef={chat} onCountChange={setCount} />
      </div>
    </div>
  );
}
