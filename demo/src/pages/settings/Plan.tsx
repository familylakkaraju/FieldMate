import { useState } from 'react';
import { Bot, ChartColumn, Check, Crown, Globe, HardDrive, Info, MessageSquare, Mic, Palette, ReceiptText, Rocket, Smartphone, Sparkles, Users, type LucideIcon } from 'lucide-react';
import { useDemo } from '../../app/DemoProvider';
import { SettingsShell } from '../../components/settings/SettingsShell';
import { Card, CardHeader, ProgressBar } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { cx } from '../../utils/cx';

interface PlanTier {
  id: 'starter' | 'pro' | 'business';
  name: string;
  price: number;
  blurb: string;
  features: string[];
  icon: LucideIcon;
}

const TIERS: PlanTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 39,
    blurb: 'For sole traders getting organised.',
    icon: Rocket,
    features: ['1 field worker', 'Website, quotes & invoices', 'Online booking', 'Customer portal', '“Powered by FieldMate” shown'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 79,
    blurb: 'For small teams running several services.',
    icon: Sparkles,
    features: ['3 field workers', 'AI Copilot', 'Voice updates', 'Customer portal', 'White labelling', 'Reports'],
  },
  {
    id: 'business',
    name: 'Business',
    price: 149,
    blurb: 'For growing firms with multiple crews.',
    icon: Crown,
    features: ['10 field workers', 'Everything in Pro', 'Multi-crew scheduling', 'Advanced reports & exports', 'Priority support'],
  },
];

const PRO_FEATURES: { icon: LucideIcon; label: string; text: string }[] = [
  { icon: Users, label: '3 field workers', text: 'Worker app with jobs, tasks and evidence' },
  { icon: Bot, label: 'AI Copilot', text: 'Ask questions about your business' },
  { icon: Mic, label: 'Voice updates', text: 'Hands-free job updates from site' },
  { icon: Globe, label: 'Customer portal', text: 'Bookings, quotes, invoices and messages' },
  { icon: Palette, label: 'White labelling', text: 'Your brand on every screen' },
  { icon: ChartColumn, label: 'Reports', text: 'Revenue, jobs and team performance' },
];

export default function Plan() {
  const { state } = useDemo();
  const [changeTo, setChangeTo] = useState<PlanTier | null>(null);
  const fieldWorkers = state.data.team.filter((m) => !m.isOffice && m.active && !m.invited).length;

  const usage: { icon: LucideIcon; label: string; used: number; limit: number; unit?: string; note?: string }[] = [
    { icon: Users, label: 'Field workers', used: fieldWorkers, limit: 3, note: 'Active worker app seats' },
    { icon: Mic, label: 'Voice updates', used: 46, limit: 200, note: 'This month' },
    { icon: Bot, label: 'Copilot questions', used: 128, limit: 500, note: 'This month' },
    { icon: MessageSquare, label: 'SMS messages', used: 214, limit: 500, note: 'This month' },
    { icon: HardDrive, label: 'Storage', used: 1.2, limit: 10, unit: 'GB', note: 'Photos, documents and evidence' },
  ];

  return (
    <SettingsShell
      title="Plan & usage"
      subtitle="Your FieldMate subscription, what’s included and how much you’ve used this month."
      actions={
        <Badge tone="amber" icon={<Info className="size-3.5" aria-hidden />}>
          No real billing in this demo
        </Badge>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* current plan */}
        <section aria-labelledby="current-plan" className="relative overflow-hidden rounded-card bg-gradient-to-br from-primary-solid to-primary-deep p-5 text-white shadow-raised sm:p-6">
          <div className="absolute -right-20 -top-20 size-64 rounded-full bg-secondary opacity-30 blur-3xl" aria-hidden />
          <div className="relative">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-white/70">Current plan</p>
                <h3 id="current-plan" className="mt-1 font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                  FieldMate Pro
                </h3>
              </div>
              <div className="text-right">
                <p className="font-display text-3xl font-extrabold tracking-tight text-white">
                  £79<span className="text-base font-semibold text-white/70"> / month</span>
                </p>
                <p className="text-[12px] text-white/65">Illustrative pricing · excl. VAT</p>
              </div>
            </div>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {PRO_FEATURES.map((f) => (
                <li key={f.label} className="flex items-start gap-2.5">
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-white/15 text-accent-tint">
                    <Check className="size-3.5" strokeWidth={3} aria-hidden />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-white">{f.label}</span>
                    <span className="block text-[12px] text-white/70">{f.text}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-white/15 pt-4">
              <button
                type="button"
                onClick={() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="inline-flex h-10 items-center rounded-control bg-white px-4 text-sm font-semibold text-primary-ink shadow-sm transition hover:bg-white/90 active:scale-[0.98]"
              >
                Compare plans
              </button>
              <p className="text-[13px] text-white/70">Renews 1 November 2026 (demo) · Billed monthly</p>
            </div>
          </div>
        </section>

        {/* usage */}
        <Card>
          <CardHeader title="Usage this month" subtitle="October 2026 · resets on the 1st" icon={ChartColumn} />
          <ul className="space-y-4">
            {usage.map((u) => {
              const pct = (u.used / u.limit) * 100;
              const tone = pct > 100 ? 'red' : pct >= 100 ? 'amber' : pct >= 80 ? 'amber' : 'brand';
              return (
                <li key={u.label}>
                  <div className="mb-1.5 flex items-end justify-between gap-3">
                    <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                      <u.icon className="size-4 text-muted" aria-hidden /> {u.label}
                    </p>
                    <p className="tabular text-sm text-ink-2">
                      <span className="font-bold text-ink">
                        {u.used}
                        {u.unit ? ` ${u.unit}` : ''}
                      </span>{' '}
                      of {u.limit}
                      {u.unit ? ` ${u.unit}` : ''}
                    </p>
                  </div>
                  <ProgressBar value={pct} tone={tone} label={`${u.label}: ${u.used} of ${u.limit}${u.unit ? ` ${u.unit}` : ''}`} />
                  <p className={cx('mt-1 text-[12px]', pct >= 100 ? 'font-semibold text-warning-ink' : 'text-muted')}>
                    {pct > 100 ? 'Over your plan limit — upgrade to add more seats' : pct >= 100 ? 'At your plan limit — upgrade to Business for up to 10' : u.note}
                  </p>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      {/* comparison */}
      <section id="plans" aria-labelledby="plans-title" className="scroll-mt-24">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 id="plans-title" className="text-lg font-extrabold tracking-tight text-ink">
              Compare plans
            </h3>
            <p className="text-sm text-muted">Illustrative pricing for this prototype. Change or cancel any time.</p>
          </div>
        </div>
        <ul className="grid gap-4 md:grid-cols-3">
          {TIERS.map((t) => {
            const current = t.id === 'pro';
            return (
              <li key={t.id} className={cx('card relative flex flex-col p-5', current && 'ring-2 ring-secondary-solid')}>
                {current && (
                  <span className="absolute -top-3 left-5 inline-flex h-6 items-center gap-1 rounded-full bg-secondary-solid px-2.5 text-xs font-bold text-secondary-on shadow-sm">
                    <Check className="size-3.5" aria-hidden /> Current plan
                  </span>
                )}
                <div className="flex items-center gap-2.5">
                  <span className={cx('grid size-10 place-items-center rounded-xl', current ? 'bg-secondary-soft text-secondary-ink' : 'bg-subtle text-ink-2')}>
                    <t.icon className="size-5" aria-hidden />
                  </span>
                  <div>
                    <h4 className="font-bold text-ink">{t.name}</h4>
                    <p className="text-[12px] text-muted">{t.blurb}</p>
                  </div>
                </div>
                <p className="mt-4 font-display text-3xl font-extrabold tracking-tight text-ink">
                  £{t.price}
                  <span className="text-sm font-semibold text-muted"> / month</span>
                </p>
                <ul className="mt-4 flex-1 space-y-2">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-ink-2">
                      <Check className={cx('mt-0.5 size-4 shrink-0', current ? 'text-secondary-ink' : 'text-success-ink')} aria-hidden />
                      {f}
                    </li>
                  ))}
                </ul>
                {current ? (
                  <p className="mt-5 inline-flex h-10 items-center justify-center rounded-control bg-subtle text-sm font-semibold text-muted">Your current plan</p>
                ) : (
                  <Button variant={t.id === 'business' ? 'primary' : 'outline'} className="mt-5" full onClick={() => setChangeTo(t)}>
                    Change plan
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <div className="flex items-start gap-3 rounded-card border border-dashed border-warning bg-warning-soft p-4 text-warning-ink">
        <ReceiptText className="mt-0.5 size-5 shrink-0" aria-hidden />
        <p className="text-sm">
          <span className="font-semibold">No real billing.</span> This is a sales prototype: prices are illustrative, no card details are collected and no payments are ever taken.
        </p>
      </div>

      <Modal
        open={!!changeTo}
        onClose={() => setChangeTo(null)}
        title={changeTo ? `Switch to ${changeTo.name}?` : ''}
        description="No real billing in this demo"
        size="sm"
        footer={
          <Button data-autofocus onClick={() => setChangeTo(null)}>
            Got it
          </Button>
        }
      >
        {changeTo && (
          <div className="space-y-3 text-sm text-ink-2">
            <p>
              In the live product you’d move to <span className="font-semibold text-ink">{changeTo.name}</span> (£{changeTo.price} / month) here, with the difference pro-rated on your next invoice.
            </p>
            <p className="flex items-start gap-2 rounded-xl bg-warning-soft p-3 text-[13px] text-warning-ink">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>This demo doesn’t change your plan, collect card details or take any payment.</span>
            </p>
            <p className="flex items-center gap-2 text-[13px] text-muted">
              <Smartphone className="size-4" aria-hidden /> Your team, data and branding stay exactly as they are.
            </p>
          </div>
        )}
      </Modal>
    </SettingsShell>
  );
}
