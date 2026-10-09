import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  CheckCircle2,
  Circle,
  CloudRain,
  Globe,
  HardHat,
  LayoutDashboard,
  MonitorSmartphone,
  Presentation,
  RotateCcw,
  Sparkles,
  User,
  Wrench,
  Zap,
} from 'lucide-react';
import type { Persona, ScenarioId } from '../../types/domain';
import { useDemo } from '../../app/DemoProvider';
import { PRIYA_LEAD_ID, SARAH_LEAD_ID } from '../../data/leads';
import { longDate } from '../../utils/format';
import { DEMO_DATE } from '../../data/demoClock';
import { cx } from '../../utils/cx';
import { Drawer, ConfirmDialog } from '../common/Modal';
import { Button } from '../common/Button';
import { useToast } from '../common/Toast';

const Ctx = createContext<{ open: () => void }>({ open: () => undefined });
export const useDemoDrawer = () => useContext(Ctx);

export function DemoControlsProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const open = useCallback(() => setOpen(true), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return;
      if (e.shiftKey && (e.key === 'D' || e.key === 'd')) setOpen((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const value = useMemo(() => ({ open }), [open]);
  return (
    <Ctx.Provider value={value}>
      {children}
      <DemoDrawer open={isOpen} onClose={() => setOpen(false)} />
    </Ctx.Provider>
  );
}

/** Small "Demo" pill shown in every experience's header. */
export function DemoButton({ className, light }: { className?: string; light?: boolean }) {
  const { open } = useDemoDrawer();
  return (
    <button
      type="button"
      onClick={open}
      aria-label="Open presenter demo controls (Shift+D)"
      title="Presenter controls (Shift+D)"
      className={cx(
        'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-bold uppercase tracking-wide transition',
        light ? 'border-white/30 text-white hover:bg-white/10' : 'border-dashed border-warning bg-warning-soft text-warning-ink hover:brightness-95',
        className,
      )}
    >
      <Presentation className="size-3.5" aria-hidden />
      Demo
    </button>
  );
}

interface Step {
  label: string;
  hint: string;
  to: string;
  done: boolean;
  persona: Persona;
  before?: () => void;
}

function DemoDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, actions } = useDemo();
  const navigate = useNavigate();
  const toast = useToast();
  const [confirmReset, setConfirmReset] = useState(false);
  const { data, persona } = state;
  const scenario = persona.scenario ?? 'gutter';

  const go = (to: string, p: Persona, patch: Partial<typeof persona> = {}) => {
    actions.setPersona({ persona: p, ...patch });
    navigate(to);
    onClose();
  };

  const priya = data.leads.find((l) => l.id === PRIYA_LEAD_ID);
  const shahJob = data.jobs.find((j) => j.id === priya?.jobId);
  const sarah = data.leads.find((l) => l.id === SARAH_LEAD_ID);
  const sarahJob = data.jobs.find((j) => j.id === sarah?.jobId);
  const shahInvoice = data.invoices.find((i) => i.id === shahJob?.invoiceId);
  const websiteLeads = data.leads.filter((l) => !['LD-1018', 'LD-1019', 'LD-1020', 'LD-1021', 'LD-1022', 'LD-1023', 'LD-1024'].includes(l.ref));

  const ensurePriya = () => {
    if (priya && priya.status !== 'converted') {
      actions.convertLeadToJob(PRIYA_LEAD_ID);
      toast({ title: 'Fast-forwarded', description: 'Priya’s lead was converted to JOB-1042 so this step is ready.', tone: 'info' });
    }
  };

  const scenarios: Record<ScenarioId, { title: string; icon: typeof CloudRain; blurb: string; steps: Step[] }> = {
    gutter: {
      title: 'Gutter Job — Priya Shah',
      icon: CloudRain,
      blurb: 'Website quote → lead → job → voice update → customer portal → invoice.',
      steps: [
        { label: 'Homeowner gets a gutter quote', hint: 'Public site → Gutter Cleaning → quote & book', to: '/quote?service=gutter', persona: 'public', done: websiteLeads.length > 0 },
        { label: 'Office converts Priya’s lead', hint: 'Leads → Priya Shah → Convert to Customer + Job', to: `/app/leads/${PRIYA_LEAD_ID}`, persona: 'owner', done: priya?.status === 'converted' },
        { label: 'Job JOB-1042 on the schedule', hint: 'Maya & Owen, today 10:30–11:50', to: '/app/schedule', persona: 'owner', done: !!shahJob, before: ensurePriya },
        { label: 'Maya runs the job by voice', hint: 'Worker → Start → Voice update → Complete', to: shahJob ? `/worker/jobs/${shahJob.id}` : '/worker/jobs/job-1042', persona: 'worker', done: !!shahJob && ['completed', 'invoiced', 'closed'].includes(shahJob.status), before: ensurePriya },
        { label: 'Office sends the invoice', hint: 'Job → Quote / Invoice → Create Invoice → Send', to: shahJob ? `/app/jobs/${shahJob.id}?tab=invoice` : '/app/invoices', persona: 'owner', done: !!shahInvoice && shahInvoice.status !== 'draft', before: ensurePriya },
        { label: 'Priya sees photos & pays', hint: 'Customer portal → job status, before/after, invoice', to: shahJob ? `/portal/jobs/${shahJob.id}` : '/portal', persona: 'customer', done: shahInvoice?.status === 'paid', before: ensurePriya },
      ],
    },
    plumbing: {
      title: 'Plumbing Emergency — Sarah Williams',
      icon: Wrench,
      blurb: 'Urgent phone lead → AI-drafted quote → same-day slot with Daniel.',
      steps: [
        { label: 'Urgent lead from Sarah', hint: 'Leaking kitchen tap, phoned in at 08:12', to: `/app/leads/${SARAH_LEAD_ID}`, persona: 'owner', done: sarah?.status !== 'new' },
        { label: 'Copilot drafts the quote', hint: '“Draft a quote for Sarah” → Create Quote', to: '/app/copilot?ask=sarah', persona: 'owner', done: !!sarah?.quoteId },
        { label: 'Convert & book 14:30 with Daniel', hint: 'Lead → Convert to Customer + Job', to: `/app/leads/${SARAH_LEAD_ID}`, persona: 'owner', done: sarah?.status === 'converted' },
        { label: 'Daniel’s day on mobile', hint: 'Worker app as Daniel', to: sarahJob ? `/worker/jobs/${sarahJob.id}` : '/worker/today', persona: 'worker', done: !!sarahJob && sarahJob.status === 'completed' },
      ],
    },
    window: {
      title: 'Window Round — Great Baddow',
      icon: Sparkles,
      blurb: 'A live 9-home round, recurring customers and a new round sign-up.',
      steps: [
        { label: 'Round in progress (6 of 9 homes)', hint: 'Owner view of JOB-1037', to: '/app/jobs/job-1037', persona: 'owner', done: false },
        { label: 'Owen’s round on mobile', hint: 'Tick off homes as he goes', to: '/worker/jobs/job-1037', persona: 'worker', done: data.jobs.find((j) => j.id === 'job-1037')?.status === 'completed' },
        { label: 'New recurring customer', hint: 'Mark Hughes wants 4-weekly cleans', to: '/app/leads/lead-mark', persona: 'owner', done: data.leads.find((l) => l.id === 'lead-mark')?.status === 'converted' },
        { label: 'Who is due next?', hint: 'Copilot → recurring customers due', to: '/app/copilot?ask=recurring', persona: 'owner', done: false },
      ],
    },
  };

  const active = scenarios[scenario];

  const runStep = (s: Step) => {
    s.before?.();
    const workerPatch = scenario === 'plumbing' && s.persona === 'worker' ? { workerId: 'w-daniel' } : scenario === 'window' && s.persona === 'worker' ? { workerId: 'w-owen' } : scenario === 'gutter' && s.persona === 'worker' ? { workerId: 'w-maya' } : {};
    go(s.to, s.persona, workerPatch);
  };

  const workers = data.team.filter((m) => !m.isOffice && m.active);
  const portalPeople = [
    ...data.customers.filter((c) => c.email === 'priya.shah@example.com' || data.leads.some((l) => l.customerId === c.id && l.createdAt >= DEMO_DATE)),
    ...data.leads.filter((l) => l.status !== 'converted' && l.email && l.createdAt >= DEMO_DATE).map((l) => ({ id: l.id, name: l.customerName, email: l.email! })),
  ];
  const portalOptions = [{ name: 'Priya Shah', email: 'priya.shah@example.com' }, ...portalPeople.filter((p) => p.email !== 'priya.shah@example.com').map((p) => ({ name: p.name, email: p.email }))];

  return (
    <>
      <Drawer open={open} onClose={onClose} title="Presenter controls" width="max-w-[440px]">
        <div className="space-y-6 px-5 py-5">
          <div className="flex items-center justify-between rounded-xl bg-subtle px-3.5 py-2.5 text-[13px]">
            <span className="text-muted">Demo clock</span>
            <span className="font-semibold text-ink">{longDate(DEMO_DATE)}</span>
          </div>

          <section aria-labelledby="dp-persona">
            <h3 id="dp-persona" className="mb-2.5 text-xs font-bold uppercase tracking-wider text-muted">
              Persona
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <PersonaTile icon={LayoutDashboard} label="Owner / Office" sub="Daniel & Sophie" active={persona.persona === 'owner'} onClick={() => go('/app/dashboard', 'owner')} />
              <PersonaTile icon={HardHat} label="Field Worker" sub={data.team.find((m) => m.id === persona.workerId)?.name ?? 'Maya Khan'} active={persona.persona === 'worker'} onClick={() => go('/worker/today', 'worker')} />
              <PersonaTile icon={User} label="Customer" sub={portalOptions.find((p) => p.email === persona.portalCustomerKey)?.name ?? 'Priya Shah'} active={persona.persona === 'customer'} onClick={() => go('/portal', 'customer')} />
              <PersonaTile icon={Globe} label="Public Website" sub="Homeowner view" active={persona.persona === 'public'} onClick={() => go('/', 'public')} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="text-xs font-semibold text-muted">
                Worker
                <select
                  className="mt-1 h-9 w-full rounded-control border border-line-2 bg-surface px-2 text-sm text-ink"
                  value={persona.workerId}
                  onChange={(e) => actions.setPersona({ workerId: e.target.value })}
                >
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-muted">
                Customer portal as
                <select
                  className="mt-1 h-9 w-full rounded-control border border-line-2 bg-surface px-2 text-sm text-ink"
                  value={persona.portalCustomerKey}
                  onChange={(e) => actions.setPersona({ portalCustomerKey: e.target.value })}
                >
                  {portalOptions.map((p) => (
                    <option key={p.email} value={p.email}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section aria-labelledby="dp-scenario">
            <h3 id="dp-scenario" className="mb-2.5 text-xs font-bold uppercase tracking-wider text-muted">
              Scenario
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(scenarios) as ScenarioId[]).map((id) => {
                const s = scenarios[id];
                const Icon = s.icon;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={scenario === id}
                    onClick={() => actions.setPersona({ scenario: id })}
                    className={cx(
                      'flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center text-xs font-semibold transition',
                      scenario === id ? 'border-secondary-solid bg-secondary-soft text-secondary-ink' : 'border-line text-ink-2 hover:bg-subtle',
                    )}
                  >
                    <Icon className="size-5" aria-hidden />
                    {id === 'gutter' ? 'Gutter Job' : id === 'plumbing' ? 'Plumbing Emergency' : 'Window Round'}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 rounded-xl border border-line p-3.5">
              <p className="text-sm font-bold text-ink">{active.title}</p>
              <p className="mt-0.5 text-[13px] text-muted">{active.blurb}</p>
              <ol className="mt-3 space-y-1">
                {active.steps.map((s, i) => (
                  <li key={s.label}>
                    <button type="button" onClick={() => runStep(s)} className="group flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-subtle">
                      {s.done ? <CheckCircle2 className="mt-0.5 size-4.5 shrink-0 text-success" aria-label="Done" /> : <Circle className="mt-0.5 size-4.5 shrink-0 text-line-2" aria-label="Not done yet" />}
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-ink">
                          {i + 1}. {s.label}
                        </span>
                        <span className="block text-xs text-muted">{s.hint}</span>
                      </span>
                      <span className="mt-0.5 text-xs font-semibold text-secondary-ink opacity-0 transition group-hover:opacity-100">Go →</span>
                    </button>
                  </li>
                ))}
              </ol>
              {scenario === 'gutter' && priya?.status !== 'converted' && (
                <Button variant="soft" size="sm" className="mt-2" icon={<Zap className="size-3.5" />} onClick={ensurePriya}>
                  Fast-forward: convert Priya’s lead
                </Button>
              )}
            </div>
          </section>

          <section aria-labelledby="dp-nav">
            <h3 id="dp-nav" className="mb-2.5 text-xs font-bold uppercase tracking-wider text-muted">
              Navigation
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" icon={<Globe className="size-4" />} onClick={() => go('/', 'public')}>
                Public Website
              </Button>
              <Button variant="outline" size="sm" icon={<LayoutDashboard className="size-4" />} onClick={() => go('/app/dashboard', 'owner')}>
                Dashboard
              </Button>
              <Button variant="outline" size="sm" icon={<Briefcase className="size-4" />} onClick={() => go('/worker/today', 'worker')}>
                Worker Today
              </Button>
              <Button variant="outline" size="sm" icon={<User className="size-4" />} onClick={() => go('/portal', 'customer')}>
                Customer Portal
              </Button>
            </div>
            <p className="mt-3 flex items-start gap-2 text-xs text-muted">
              <MonitorSmartphone className="mt-px size-4 shrink-0" aria-hidden />
              Tip: open the worker or customer view in a second tab — changes sync live between tabs.
            </p>
          </section>

          <section aria-labelledby="dp-actions" className="border-t border-line pt-5">
            <h3 id="dp-actions" className="mb-2.5 text-xs font-bold uppercase tracking-wider text-muted">
              Actions
            </h3>
            <Button variant="danger" full icon={<RotateCcw className="size-4" />} onClick={() => setConfirmReset(true)}>
              Reset Demo Data
            </Button>
            <p className="mt-2 text-xs text-muted">Restores all fixtures and the default ClearFlow branding. All data is fictional and stored only in this browser.</p>
          </section>
        </div>
      </Drawer>
      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        danger
        title="Reset the demo?"
        text="This clears every change made in this browser — new leads, job updates, branding and settings — and restores the ClearFlow Home Services demo."
        confirmLabel="Reset demo"
        onConfirm={() => {
          actions.resetDemo();
          onClose();
          navigate('/');
          toast({ title: 'Demo reset', description: 'Fixtures and ClearFlow branding restored.' });
        }}
      />
    </>
  );
}

function PersonaTile({ icon: Icon, label, sub, active, onClick }: { icon: typeof Globe; label: string; sub: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx('flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition', active ? 'border-secondary-solid bg-secondary-soft' : 'border-line hover:bg-subtle')}
    >
      <span className={cx('grid size-9 shrink-0 place-items-center rounded-lg', active ? 'bg-secondary-solid text-secondary-on' : 'bg-subtle text-ink-2')}>
        <Icon className="size-4.5" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-bold text-ink">{label}</span>
        <span className="block truncate text-xs text-muted">{sub}</span>
      </span>
    </button>
  );
}
