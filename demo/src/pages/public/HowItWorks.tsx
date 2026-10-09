import { ArrowRight, BellRing, Camera, CheckCircle2, ClipboardList, CreditCard, FileText, HardHat, MessageSquareText, Smartphone, Wrench, CalendarCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { useConfig } from '../../app/DemoProvider';
import { LinkButton } from '../../components/common/Button';
import { SectionHeader } from '../../components/common/Card';
import { asset } from '../../utils/cx';

const LIFECYCLE = [
  { icon: MessageSquareText, title: 'Request', text: 'Tell us what you need online, by phone or by text.' },
  { icon: FileText, title: 'Quote', text: 'Instant estimate, then a fixed written quote.' },
  { icon: CalendarCheck, title: 'Booking', text: 'Choose a slot that suits you.' },
  { icon: HardHat, title: 'Technician', text: 'Get a text when they’re on the way.' },
  { icon: Wrench, title: 'Work', text: 'Tidy, insured, done properly.' },
  { icon: Camera, title: 'Evidence', text: 'Before & after photos of the job.' },
  { icon: CreditCard, title: 'Invoice', text: 'Matches the quote. Pay online.' },
  { icon: Smartphone, title: 'Customer Portal', text: 'Everything saved in one place.' },
];

export default function HowItWorks() {
  const { company } = useConfig();
  return (
    <div className="bg-surface">
      <section className="bg-gradient-to-b from-primary-soft to-surface px-4 py-14 text-center sm:px-6 md:py-20">
        <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-accent-ink">How it works</p>
        <h1 className="mx-auto mt-2 max-w-3xl font-display text-4xl font-extrabold tracking-tight text-primary-ink md:text-5xl">Clear from first click to final invoice</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted">{company.companyName} runs every job through one system — so you always know what’s happening, when, and what it costs.</p>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {LIFECYCLE.map((s, i) => (
            <li key={s.title} className="relative rounded-card border border-line bg-surface p-5 shadow-card">
              <span className="absolute right-4 top-4 font-display text-3xl font-extrabold text-line">{String(i + 1).padStart(2, '0')}</span>
              <span className="grid size-11 place-items-center rounded-xl bg-secondary-soft text-secondary-ink">
                <s.icon className="size-5.5" aria-hidden />
              </span>
              <h2 className="mt-4 text-lg font-bold text-ink">{s.title}</h2>
              <p className="mt-1 text-sm text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-primary-deep py-16 text-white md:py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <SectionHeader light eyebrow="Your customer portal" title="Track every step from your phone" text="Approve quotes, see who’s coming and when, view before-and-after photos and pay invoices — without a single phone call." />
            <ul className="mt-6 space-y-2.5 text-white/85">
              {['Live job status & technician updates', 'Quote approval in one tap', 'Before/after photo evidence', 'Secure online payment', 'Manage recurring cleans'].map((x) => (
                <li key={x} className="flex items-center gap-2.5">
                  <CheckCircle2 className="size-5 text-accent-tint" aria-hidden /> {x}
                </li>
              ))}
            </ul>
            <LinkButton to="/portal" variant="white" size="lg" className="mt-8" iconRight={<ArrowRight className="size-4.5" />}>
              Open the demo portal
            </LinkButton>
          </div>
          <div className="grid gap-4 sm:grid-cols-2" aria-hidden>
            <MockCard title="Job status" icon={ClipboardList}>
              {['Request received', 'Quote accepted', 'Scheduled', 'Technician on the way', 'Work completed'].map((s, i) => (
                <p key={s} className="flex items-center gap-2 text-[13px] text-ink-2">
                  <span className={i < 4 ? 'size-2.5 rounded-full bg-success' : 'size-2.5 rounded-full border-2 border-line-2'} /> {s}
                </p>
              ))}
            </MockCard>
            <MockCard title="Maya is on her way" icon={BellRing}>
              <p className="text-[13px] text-muted">Arriving 10:25 · Gutter clean</p>
              <div className="mt-2 h-2 rounded-full bg-subtle">
                <div className="h-2 w-2/3 rounded-full bg-accent" />
              </div>
            </MockCard>
            <MockCard title="Before & after" icon={Camera}>
              <div className="grid grid-cols-2 gap-1.5">
                <img src={asset('assets/services/gutter.webp')} alt="" className="aspect-square rounded-lg object-cover" />
                <img src={asset('assets/gallery/gutter-after.webp')} alt="" className="aspect-square rounded-lg object-cover" />
              </div>
            </MockCard>
            <MockCard title="Invoice INV-3027" icon={CreditCard}>
              <p className="font-display text-2xl font-extrabold text-ink">£125.00</p>
              <span className="mt-2 inline-flex rounded-full bg-success-soft px-2.5 py-1 text-xs font-bold text-success-ink">Paid online</span>
            </MockCard>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 text-center sm:px-6">
        <h2 className="font-display text-3xl font-extrabold text-primary-ink">Try it for yourself</h2>
        <p className="mt-2 text-muted">Get an instant estimate — it takes about a minute.</p>
        <LinkButton to="/quote" size="xl" className="mt-6" iconRight={<ArrowRight className="size-5" />}>
          Get an Instant Quote
        </LinkButton>
      </section>
    </div>
  );
}

function MockCard({ title, icon: Icon, children }: { title: string; icon: typeof Camera; children: ReactNode }) {
  return (
    <div className="rounded-card bg-surface p-4 text-ink shadow-float">
      <p className="mb-2.5 flex items-center gap-2 text-sm font-bold">
        <Icon className="size-4 text-secondary-ink" /> {title}
      </p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}
