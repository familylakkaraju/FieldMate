import { useEffect, useState } from 'react';
import { matchPath, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BatteryFull, Briefcase, Camera, CheckCheck, Ellipsis, Globe, House, LayoutDashboard, Mic, Play, Plus, Signal, Sparkles, User, Wifi, type LucideIcon } from 'lucide-react';
import type { Persona } from '../types/domain';
import { useDemo } from '../app/DemoProvider';
import { PRIYA_LEAD_ID } from '../data/leads';
import { Logo, FieldMateMark } from '../components/common/Logo';
import { Button } from '../components/common/Button';
import { Avatar, WorkerAvatar } from '../components/common/Avatar';
import { SelectInput } from '../components/common/Form';
import { PhoneSheet } from '../components/common/Sheet';
import { useToast } from '../components/common/Toast';
import { DemoButton } from '../components/demo/DemoControls';
import { currentJobFor, useCurrentWorker, useDemoNow, useWorkerSheets, WorkerSheetsProvider } from '../components/worker/WorkerUi';
import { cx } from '../utils/cx';

/** Field worker app shell: full-screen on phones, a phone frame beside presenter notes on desktop. */
export function WorkerLayout() {
  const { state, actions } = useDemo();
  const navigate = useNavigate();
  const { workerId, worker } = useCurrentWorker();

  useEffect(() => {
    actions.setPersona({ persona: 'worker' });
  }, [actions]);

  const switchTo = (to: string, persona: Persona) => {
    actions.setPersona({ persona });
    navigate(to);
  };
  const priya = state.data.leads.find((l) => l.id === PRIYA_LEAD_ID);
  const shahConfirmed = priya?.status === 'converted';

  const tips = [
    { icon: Play, title: 'Start the Shah job', text: shahConfirmed ? 'JOB-1042 · 10:30 — tap Start job on Today.' : 'Confirm Priya’s booking on Today, then tap Start job.' },
    { icon: Mic, title: 'Voice update', text: 'Tap the mic — FieldMate turns one sentence into 4 job updates.' },
    { icon: Camera, title: 'Add photos', text: 'Before & after shots land on the customer portal.' },
    { icon: CheckCheck, title: 'Complete', text: 'The office gets an invoice-ready job instantly.' },
  ];

  return (
    <div
      className="min-h-dvh bg-canvas lg:flex lg:items-center lg:justify-center lg:gap-16 lg:px-8 lg:py-6"
      style={{ backgroundImage: 'radial-gradient(circle at 12% 18%, var(--brand-secondary-soft), transparent 42%), radial-gradient(circle at 88% 86%, var(--brand-accent-soft), transparent 40%)' }}
    >
      <aside className="hidden w-[340px] shrink-0 lg:block" aria-label="About this demo">
        <Logo size={44} />
        <p className="mt-9 text-xs font-bold uppercase tracking-[0.16em] text-accent-ink">Field worker app</p>
        <p className="mt-2 font-display text-[32px] font-extrabold leading-[1.1] tracking-tight text-primary-ink">The whole job, from the van.</p>
        <div className="mt-5 flex items-center gap-3 rounded-card border border-line bg-surface p-3.5 shadow-card">
          <WorkerAvatar id={workerId} size="md" />
          <p className="text-sm leading-snug text-ink-2">
            Viewing as <strong className="text-ink">{worker?.name ?? 'Maya Khan'}</strong> — {worker?.role ?? 'Exterior Cleaning Lead'}
          </p>
        </div>
        <ol className="mt-6 space-y-3.5">
          {tips.map((t, i) => {
            const Icon = t.icon;
            return (
              <li key={t.title} className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary-soft text-secondary-ink">
                  <Icon className="size-4.5" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-ink">
                    {i + 1}. {t.title}
                  </span>
                  <span className="block text-[13px] text-muted">{t.text}</span>
                </span>
              </li>
            );
          })}
        </ol>
        <div className="mt-7 flex flex-wrap items-center gap-2">
          <Button variant="outline" icon={<LayoutDashboard className="size-4" />} onClick={() => switchTo('/app/dashboard', 'owner')}>
            Office view
          </Button>
          <Button variant="outline" icon={<User className="size-4" />} onClick={() => switchTo('/portal', 'customer')}>
            Customer view
          </Button>
          <DemoButton className="h-10" />
        </div>
        {state.config.branding.showPoweredByFieldMate && (
          <p className="mt-10 flex items-center gap-1.5 text-xs text-muted">
            Powered by <FieldMateMark />
          </p>
        )}
      </aside>

      <div className="sm:mx-auto sm:max-w-[480px] lg:mx-0 lg:max-w-none lg:rounded-[56px] lg:bg-[#0B1320] lg:p-[11px] lg:shadow-[0_50px_100px_-30px_rgb(11_19_32/0.55),0_0_0_1px_rgb(11_19_32/0.6)]">
        <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-canvas sm:border-x sm:border-line lg:h-[min(820px,calc(100dvh_-_48px))] lg:w-[390px] lg:rounded-[45px] lg:border-0">
          <StatusBar />
          <WorkerSheetsProvider>
            <main id="worker-main" className="min-h-0 flex-1 overflow-y-auto overscroll-contain pt-[env(safe-area-inset-top)] lg:pt-0">
              <Outlet />
            </main>
            <BottomNav />
          </WorkerSheetsProvider>
        </div>
      </div>
    </div>
  );
}

/** Fake device status bar — desktop phone frame only. */
function StatusBar() {
  const now = useDemoNow(10000);
  return (
    <div className="relative hidden h-11 shrink-0 items-center justify-between bg-canvas px-7 pt-1 text-[14px] font-semibold text-ink lg:flex" aria-hidden>
      <span className="tabular">{now.slice(11, 16)}</span>
      <span className="absolute left-1/2 top-2 h-[28px] w-[104px] -translate-x-1/2 rounded-full bg-[#0B1320]" />
      <span className="flex items-center gap-1.5">
        <Signal className="size-4" />
        <Wifi className="size-4" />
        <BatteryFull className="size-5" />
      </span>
    </div>
  );
}

function NavItem({ to, label, icon: Icon }: { to: string; label: string; icon: LucideIcon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cx('flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[11px] font-semibold transition', isActive ? 'text-secondary-ink' : 'text-muted hover:text-ink')
      }
    >
      {({ isActive }) => (
        <>
          <span className={cx('grid h-7 w-12 place-items-center rounded-full transition', isActive && 'bg-secondary-soft')}>
            <Icon className="size-5" aria-hidden />
          </span>
          {label}
        </>
      )}
    </NavLink>
  );
}

function BottomNav() {
  const { state } = useDemo();
  const { workerId } = useCurrentWorker();
  const sheets = useWorkerSheets();
  const location = useLocation();
  const [more, setMore] = useState(false);

  const openUpdate = () => {
    const m = matchPath('/worker/jobs/:id', location.pathname);
    const fromUrl = m?.params.id && state.data.jobs.some((j) => j.id === m.params.id) ? m.params.id : undefined;
    sheets.openQuick(fromUrl ?? currentJobFor(state.data, workerId)?.id);
  };

  return (
    <>
      <nav aria-label="Worker app" className="relative z-30 shrink-0 border-t border-line bg-surface px-2 pb-[max(6px,env(safe-area-inset-bottom))] pt-1 lg:pb-1.5">
        <ul className="grid grid-cols-5 items-end">
          <li>
            <NavItem to="/worker/today" label="Today" icon={House} />
          </li>
          <li>
            <NavItem to="/worker/jobs" label="Jobs" icon={Briefcase} />
          </li>
          <li className="flex justify-center">
            <button type="button" onClick={openUpdate} aria-label="Update — quick job update" className="group -mt-4 flex flex-col items-center gap-0.5 rounded-2xl px-1">
              <span className="grid size-14 place-items-center rounded-full bg-secondary-solid text-secondary-on shadow-float ring-4 ring-surface transition group-hover:brightness-110 group-active:scale-95">
                <Plus className="size-7" strokeWidth={2.5} aria-hidden />
              </span>
              <span className="text-[11px] font-bold text-ink">Update</span>
            </button>
          </li>
          <li>
            <NavItem to="/worker/copilot" label="Copilot" icon={Sparkles} />
          </li>
          <li>
            <button
              type="button"
              onClick={() => setMore(true)}
              aria-haspopup="dialog"
              className="flex min-h-12 w-full flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[11px] font-semibold text-muted transition hover:text-ink"
            >
              <span className="grid h-7 w-12 place-items-center rounded-full">
                <Ellipsis className="size-5" aria-hidden />
              </span>
              More
            </button>
          </li>
        </ul>
        <div className="mx-auto mt-1.5 hidden h-[5px] w-32 rounded-full bg-ink/85 lg:block" aria-hidden />
      </nav>
      <MoreSheet open={more} onClose={() => setMore(false)} />
    </>
  );
}

function MoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, actions } = useDemo();
  const navigate = useNavigate();
  const toast = useToast();
  const { workerId, worker } = useCurrentWorker();
  const workers = state.data.team.filter((m) => m.active && !m.isOffice);

  const go = (to: string, persona: Persona) => {
    actions.setPersona({ persona });
    onClose();
    navigate(to);
  };

  const views: { label: string; sub: string; icon: typeof Globe; to: string; persona: Persona }[] = [
    { label: 'Office dashboard', sub: 'Owner & office view', icon: LayoutDashboard, to: '/app/dashboard', persona: 'owner' },
    { label: 'Customer portal', sub: 'What Priya sees', icon: User, to: '/portal', persona: 'customer' },
    { label: 'Public website', sub: 'Homeowner quote & booking', icon: Globe, to: '/', persona: 'public' },
  ];

  return (
    <PhoneSheet open={open} onClose={onClose} title="More">
      <section aria-labelledby="more-me">
        <h3 id="more-me" className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">
          Signed in as
        </h3>
        <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
          {worker && <Avatar name={worker.name} color={worker.color} size="md" />}
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold text-ink">{worker?.name}</p>
            <p className="truncate text-[13px] text-muted">{worker?.role}</p>
          </div>
        </div>
        <SelectInput
          className="mt-3"
          label="Switch worker (demo)"
          value={workerId}
          onChange={(e) => {
            const next = workers.find((w) => w.id === e.target.value);
            actions.setPersona({ workerId: e.target.value });
            if (next) toast({ title: `Now viewing as ${next.name}`, description: next.role, tone: 'info' });
          }}
        >
          {workers.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name} — {w.role}
            </option>
          ))}
        </SelectInput>
      </section>

      <section aria-labelledby="more-views" className="mt-5">
        <h3 id="more-views" className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">
          Other views
        </h3>
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
          {views.map((v) => {
            const Icon = v.icon;
            return (
              <li key={v.to}>
                <button type="button" onClick={() => go(v.to, v.persona)} className="flex min-h-14 w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-subtle">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary-soft text-secondary-ink">
                    <Icon className="size-4.5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-ink">{v.label}</span>
                    <span className="block text-xs text-muted">{v.sub}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-5 flex items-center justify-between gap-3 rounded-xl bg-subtle p-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink">Presenter controls</p>
          <p className="text-xs text-muted">Scenarios, personas & reset (Shift+D)</p>
        </div>
        <DemoButton className="h-10 shrink-0" />
      </section>
    </PhoneSheet>
  );
}
