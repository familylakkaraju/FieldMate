import { useState } from 'react';
import { ArrowLeftRight, Bot, Calculator, CalendarDays, Check, CreditCard, Info, Mail, MapPinned, MessageSquare, Plug, Smartphone, Store, type LucideIcon } from 'lucide-react';
import { SettingsShell } from '../../components/settings/SettingsShell';
import { Button } from '../../components/common/Button';
import { DemoBadge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';

interface Integration {
  id: string;
  name: string;
  category: string;
  icon: LucideIcon;
  description: string;
  syncs: string[];
  tint: string;
}

const INTEGRATIONS: Integration[] = [
  {
    id: 'calendar',
    name: 'Google Calendar',
    category: 'Scheduling',
    icon: CalendarDays,
    description: 'Two-way sync of jobs and team availability with your calendars.',
    syncs: ['Scheduled jobs appear in each worker’s calendar', 'Time off and personal events block booking slots', 'Rescheduling in either place updates both'],
    tint: '#2563EB',
  },
  {
    id: 'gbp',
    name: 'Google Business Profile',
    category: 'Marketing',
    icon: Store,
    description: 'Show your reviews and keep opening hours and services in sync.',
    syncs: ['New reviews flow into your website and reports', 'Opening hours and services stay consistent', 'Review requests sent after completed jobs'],
    tint: '#0F9D8A',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    category: 'Payments',
    icon: CreditCard,
    description: 'Card payments and pay-by-link on quotes, invoices and deposits.',
    syncs: ['“Pay now” links on invoices and quotes', 'Payments marked as paid automatically', 'Deposits taken when a quote is accepted'],
    tint: '#6D28D9',
  },
  {
    id: 'play',
    name: 'Google Play',
    category: 'Mobile app',
    icon: Smartphone,
    description: 'Publish your branded worker and customer apps under your own name.',
    syncs: ['Your logo, colours and name on the app listing', 'Automatic updates when you change branding', 'Install links shared with your team and customers'],
    tint: '#16A34A',
  },
  {
    id: 'accounting',
    name: 'Accounting',
    category: 'Finance',
    icon: Calculator,
    description: 'Send invoices, payments and expenses to your accounting package.',
    syncs: ['Invoices and credit notes created automatically', 'Payments reconciled against invoices', 'Materials costs pushed as expenses'],
    tint: '#0E7490',
  },
  {
    id: 'email',
    name: 'Email',
    category: 'Messaging',
    icon: Mail,
    description: 'Send quotes, invoices and reminders from your own domain.',
    syncs: ['Branded emails from your company address', 'Delivery and open tracking on quotes', 'Replies routed to the customer timeline'],
    tint: '#B45309',
  },
  {
    id: 'sms',
    name: 'SMS',
    category: 'Messaging',
    icon: MessageSquare,
    description: 'On-the-way texts, reminders and two-way customer messages.',
    syncs: ['“On the way” texts with arrival times', 'Appointment and recurring service reminders', 'Customer replies land in the job’s messages'],
    tint: '#DB2777',
  },
  {
    id: 'maps',
    name: 'Maps',
    category: 'Location',
    icon: MapPinned,
    description: 'Address lookup, travel times and smarter route planning.',
    syncs: ['Postcode and address lookup in forms', 'Travel time between jobs on the schedule', 'Route suggestions for the day’s jobs'],
    tint: '#DC2626',
  },
  {
    id: 'ai',
    name: 'AI Provider',
    category: 'AI',
    icon: Bot,
    description: 'Powers Copilot answers, voice updates and smart suggestions.',
    syncs: ['Copilot answers grounded in your own data', 'Voice notes turned into job updates', 'Choose the provider and region that suits you'],
    tint: '#4F46E5',
  },
];

export default function Integrations() {
  const [open, setOpen] = useState<Integration | null>(null);

  return (
    <SettingsShell
      title="Integrations"
      subtitle="Connect the tools you already use. In this demo nothing is connected and no data leaves your browser."
      actions={
        <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-muted">
          <Plug className="size-4" aria-hidden /> {INTEGRATIONS.length} available · 0 connected
        </span>
      }
    >
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {INTEGRATIONS.map((x) => (
          <li key={x.id} className="card flex flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl" style={{ background: `${x.tint}14`, color: x.tint }}>
                <x.icon className="size-6" aria-hidden />
              </span>
              <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-subtle px-2.5 text-xs font-semibold text-ink-2 ring-1 ring-inset ring-line">
                <span className="size-1.5 rounded-full bg-muted" aria-hidden />
                Demo · Not connected
              </span>
            </div>
            <h3 className="mt-4 text-base font-bold text-ink">{x.name}</h3>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">{x.category}</p>
            <p className="mt-2 flex-1 text-sm text-ink-2">{x.description}</p>
            <Button variant="outline" className="mt-4" full icon={<Plug className="size-4" />} onClick={() => setOpen(x)} aria-label={`Connect ${x.name}`}>
              Connect
            </Button>
          </li>
        ))}
      </ul>

      <div className="flex items-start gap-3 rounded-card border border-line bg-surface p-4 shadow-card sm:p-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-ink">
          <ArrowLeftRight className="size-5" aria-hidden />
        </span>
        <div>
          <p className="font-semibold text-ink">FieldMate keeps providers swappable</p>
          <p className="mt-0.5 text-sm text-muted">
            Every integration sits behind a simple adapter, so you can change your payment, messaging, accounting or AI provider later without changing how your team works — and without being locked in.
          </p>
        </div>
      </div>

      <Modal
        open={!!open}
        onClose={() => setOpen(null)}
        title={open ? `Connect ${open.name}` : ''}
        description="Demo prototype — no real connection is made"
        footer={
          <Button data-autofocus onClick={() => setOpen(null)}>
            Got it
          </Button>
        }
      >
        {open && (
          <div className="space-y-4 text-sm text-ink-2">
            <div className="flex items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl" style={{ background: `${open.tint}14`, color: open.tint }}>
                <open.icon className="size-5.5" aria-hidden />
              </span>
              <div>
                <p className="font-semibold text-ink">{open.name}</p>
                <p className="text-[13px] text-muted">{open.description}</p>
              </div>
            </div>
            <div>
              <p className="font-semibold text-ink">In the live product, connecting would:</p>
              <ul className="mt-2 space-y-2">
                {open.syncs.map((s) => (
                  <li key={s} className="flex items-start gap-2">
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-success-soft text-success-ink">
                      <Check className="size-3.5" aria-hidden />
                    </span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <p className="flex items-start gap-2 rounded-xl bg-warning-soft p-3 text-[13px] text-warning-ink">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                <DemoBadge className="mr-1.5 align-middle">Demo</DemoBadge>
                This prototype doesn’t sign in to {open.name}, store credentials or send any data. You’d authorise access on the provider’s own secure sign-in page.
              </span>
            </p>
          </div>
        )}
      </Modal>
    </SettingsShell>
  );
}
