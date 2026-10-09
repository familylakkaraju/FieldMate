import { ArrowRight, BadgeCheck, Handshake, HeartHandshake, IdCard, Leaf, ShieldCheck, Sparkles, Truck } from 'lucide-react';
import { useDemo } from '../../app/DemoProvider';
import { LinkButton } from '../../components/common/Button';
import { SectionHeader } from '../../components/common/Card';
import { Avatar } from '../../components/common/Avatar';
import { AreaMap } from '../../components/public/PublicBits';
import { asset } from '../../utils/cx';

export default function About() {
  const { state } = useDemo();
  const { company } = state.config;
  const team = state.data.team.filter((m) => m.active && !m.invited);
  const values = [
    { icon: BadgeCheck, title: 'Reliable', text: 'We turn up when we say we will — and text you when we’re on the way.' },
    { icon: HeartHandshake, title: 'Family-home friendly', text: 'Uniformed, ID-carrying, tidy technicians you’re happy to have at home.' },
    { icon: Handshake, title: 'Straightforward', text: 'Plain-English quotes with no surprises on the invoice.' },
    { icon: Sparkles, title: 'Clean & professional', text: 'Dust sheets down, mess cleared up, photos taken.' },
  ];
  return (
    <div className="bg-surface">
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-2">
        <div>
          <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-accent-ink">About us</p>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-primary-ink md:text-5xl">A local team that does things properly</h1>
          <p className="mt-5 text-lg text-muted">
            {company.companyName} started with one plumber and a van in Chelmsford. Today our small team looks after hundreds of homes across {company.region} — fixing leaks, clearing gutters and keeping windows sparkling on regular rounds.
          </p>
          <p className="mt-4 text-muted">We’ve kept the same promise from day one: be on time, be clear about the price, and leave every home better than we found it.</p>
          <p className="mt-4 text-xs text-muted">This is a fictional business created to demonstrate FieldMate.</p>
        </div>
        <img src={asset('assets/hero/hero-window-cleaner-sm.webp')} alt="Technician cleaning first-floor windows with a water-fed pole" className="aspect-[4/3] w-full rounded-[calc(var(--brand-radius-card)*1.5)] object-cover shadow-float" />
      </section>

      <section className="bg-canvas py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeader eyebrow="Meet the team" title="The people who’ll look after your home" center />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {team.map((m) => (
              <div key={m.id} className="card flex flex-col items-center p-6 text-center">
                <Avatar name={m.name} color={m.color} size="xl" />
                <p className="mt-4 text-lg font-bold text-ink">{m.name}</p>
                <p className="text-sm font-semibold text-accent-ink">{m.role}</p>
                <p className="mt-2 text-sm text-muted">{m.skills.join(' · ')}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20">
        <SectionHeader eyebrow="Our values" title="What you can expect, every visit" />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v) => (
            <div key={v.title} className="rounded-card border border-line p-6">
              <v.icon className="size-7 text-accent-ink" aria-hidden />
              <h3 className="mt-3 text-lg font-bold text-ink">{v.title}</h3>
              <p className="mt-1 text-sm text-muted">{v.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 grid gap-4 rounded-card bg-primary-solid p-6 text-primary-on sm:grid-cols-4 sm:p-8">
          {[
            [ShieldCheck, '£5m public liability'],
            [IdCard, 'Uniformed & ID-carrying'],
            [Truck, 'Fully equipped vans'],
            [Leaf, 'Eco purified-water cleaning'],
          ].map(([Icon, label]) => {
            const I = Icon as typeof ShieldCheck;
            return (
              <p key={label as string} className="flex items-center gap-3 font-semibold text-white">
                <I className="size-6 text-accent-tint" aria-hidden /> {label as string}
              </p>
            );
          })}
        </div>
      </section>

      <section className="bg-canvas py-16 md:py-20">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <SectionHeader eyebrow="Our customer promise" title="If it’s not right, we come back" text="If you’re not happy with any part of the work, tell us within 7 days and we’ll return to put it right — free of charge." />
            <LinkButton to="/quote" size="lg" className="mt-6" iconRight={<ArrowRight className="size-4.5" />}>
              Get a quote
            </LinkButton>
          </div>
          <div className="overflow-hidden rounded-card shadow-float">
            <AreaMap />
          </div>
        </div>
      </section>
    </div>
  );
}
