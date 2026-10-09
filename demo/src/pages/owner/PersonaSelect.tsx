import { useNavigate } from 'react-router-dom';
import { ArrowRight, Globe, HardHat, LayoutDashboard, RotateCcw, UserRound } from 'lucide-react';
import type { Persona } from '../../types/domain';
import { useDemo } from '../../app/DemoProvider';
import { Logo, FieldMateMark } from '../../components/common/Logo';
import { DemoBadge } from '../../components/common/Badge';
import { useToast } from '../../components/common/Toast';
import { longDate } from '../../utils/format';
import { DEMO_DATE } from '../../data/demoClock';

export default function PersonaSelect() {
  const { state, actions } = useDemo();
  const navigate = useNavigate();
  const toast = useToast();
  const options: { persona: Persona; to: string; title: string; who: string; text: string; icon: typeof Globe }[] = [
    { persona: 'owner', to: '/app/dashboard', title: 'Owner / Office', who: 'Daniel Reed & Sophie Clarke', text: 'Leads, customers, jobs, schedule, quotes, invoices, reports and AI Copilot.', icon: LayoutDashboard },
    { persona: 'worker', to: '/worker/today', title: 'Field Worker', who: 'Maya Khan — Exterior Cleaning Lead', text: 'Mobile app: today’s jobs, tasks, voice updates, photos and job completion.', icon: HardHat },
    { persona: 'customer', to: '/portal', title: 'Customer', who: 'Priya Shah — 18 Willow Close', text: 'Customer portal: job status, quote approval, photos, invoices and payment.', icon: UserRound },
    { persona: 'public', to: '/', title: 'Public Website', who: 'Any homeowner', text: 'The business’s own branded website with instant quotes and online booking.', icon: Globe },
  ];
  return (
    <div className="min-h-dvh bg-primary-deep px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Logo light size={44} />
          <span className="inline-flex items-center gap-2 text-sm text-white/70">
            Interactive demo · <FieldMateMark light />
          </span>
        </div>
        <div className="mt-14 max-w-2xl">
          <DemoBadge>No sign-in required</DemoBadge>
          <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight text-white md:text-5xl">Choose a view to explore</h1>
          <p className="mt-3 text-lg text-white/75">
            One business, four connected experiences. Everything you do in one view shows up in the others. Demo day: {longDate(DEMO_DATE)}.
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {options.map((o) => (
            <button
              key={o.persona}
              type="button"
              onClick={() => {
                actions.setPersona({ persona: o.persona });
                navigate(o.to);
              }}
              className="group flex items-start gap-4 rounded-card bg-white/[0.06] p-6 text-left ring-1 ring-white/12 transition hover:bg-white/[0.1] hover:ring-white/25"
            >
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-secondary-solid text-secondary-on">
                <o.icon className="size-7" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2 text-xl font-bold text-white">
                  {o.title}
                  <ArrowRight className="size-5 text-white/50 transition group-hover:translate-x-1 group-hover:text-white" aria-hidden />
                </span>
                <span className="mt-0.5 block text-sm font-semibold text-accent-tint">{o.who}</span>
                <span className="mt-2 block text-[15px] text-white/70">{o.text}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 text-sm text-white/60">
          <p>All businesses, customers and transactions are fictional demonstration data stored only in this browser.</p>
          <button
            type="button"
            onClick={() => {
              actions.resetDemo();
              toast({ title: 'Demo reset', description: `${state.config.company.companyName} fixtures restored.` });
            }}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 font-semibold text-white/80 ring-1 ring-white/20 hover:bg-white/10"
          >
            <RotateCcw className="size-4" aria-hidden /> Reset demo data
          </button>
        </div>
      </div>
    </div>
  );
}
