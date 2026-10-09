import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  BellRing,
  CalendarCheck,
  CalendarDays,
  Camera,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  HelpCircle,
  Leaf,
  MapPin,
  MessageSquareText,
  Phone,
  Repeat,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Users,
  Wrench,
} from 'lucide-react';
import { useConfig } from '../../app/DemoProvider';
import { enabledServices } from '../../app/selectors';
import { AVAILABILITY, REVIEWS } from '../../data/content';
import { useCallModal } from '../../layouts/PublicLayout';
import { AreaMap, BeforeAfterPair, BeforeAfterSlider, PostcodeChecker, ReviewCard, ServiceCard, Stars } from '../../components/public/PublicBits';
import { Button, LinkButton } from '../../components/common/Button';
import { SectionHeader } from '../../components/common/Card';
import { DemoBadge } from '../../components/common/Badge';
import { ServiceIcon } from '../../components/common/ServiceIcon';
import { serviceTone } from '../../theme/branding';
import { asset, cx } from '../../utils/cx';
import type { ServiceConfig } from '../../types/domain';

export default function Home() {
  const cfg = useConfig();
  const services = enabledServices(cfg);
  const has = (id: string) => services.some((s) => s.id === id);

  return (
    <>
      <Hero services={services} />
      <JourneyStarter services={services} />
      <Availability services={services} />
      <Trust />
      {(has('gutter') || has('window')) && <BeforeAfter hasGutter={has('gutter')} hasWindow={has('window')} />}
      <HowItWorks />
      <Pricing services={services} />
      <Reviews />
      {(has('window') || has('gutter')) && <RecurringCare hasWindow={has('window')} hasGutter={has('gutter')} />}
      <Areas />
      <FinalCta />
    </>
  );
}

// ------------------------------------------------------------------ Hero
function Hero({ services }: { services: ServiceConfig[] }) {
  const cfg = useConfig();
  const { company, branding } = cfg;
  const call = useCallModal();
  const style = branding.heroStyle;
  const headline = services.map((s) => s.heroWord).join(' ');
  const dark = style !== 'split';

  const content = (
    <div className={cx('relative z-10', style === 'split' ? 'max-w-2xl py-10 lg:py-16' : 'max-w-[820px] pb-4 pt-9 sm:py-14 lg:pb-16 lg:pt-14')}>
      <p className={cx('mb-4 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-semibold', dark ? 'bg-white/12 text-white ring-1 ring-white/20 backdrop-blur' : 'bg-accent-soft text-accent-ink')}>
        <MapPin className="size-4" aria-hidden />
        Trusted home services across {company.region}
      </p>
      <h1 className={cx('font-display text-[34px] font-extrabold leading-[1.06] tracking-tight sm:text-5xl lg:text-[58px]', dark ? 'text-white' : 'text-primary-ink')}>
        <span className="block">{headline}</span>
        <span className={cx('block', dark ? 'text-accent-tint' : 'text-accent-ink')}>One trusted local team.</span>
      </h1>
      <p className={cx('mt-4 max-w-xl text-base leading-relaxed sm:text-lg', dark ? 'text-white/85' : 'text-muted')}>
        Fast, professional home services across {company.region} with simple quotes, easy booking and clear updates from start to finish.
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <LinkButton to="/quote" size="xl" iconRight={<ArrowRight className="size-5" />} className="shadow-lg max-sm:h-13">
          Get an Instant Quote
        </LinkButton>
        <LinkButton to="/booking" size="xl" variant={dark ? 'white' : 'dark'} icon={<CalendarCheck className="size-5" />} className="max-sm:h-13">
          Book a Service
        </LinkButton>
      </div>

      <div className="mt-5">
        <p className="sr-only">Or start with a service</p>
        <div className="flex flex-wrap gap-2">
          {services.map((s) => (
            <Link
              key={s.id}
              to={`/quote?service=${s.id}`}
              className={cx(
                'inline-flex h-11 items-center gap-2 rounded-full px-4 text-[15px] font-semibold transition',
                dark ? 'bg-white/12 text-white ring-1 ring-white/25 backdrop-blur hover:bg-white/20' : 'border border-line-2 bg-surface text-ink hover:border-primary hover:bg-primary-soft',
              )}
            >
              <ServiceIcon name={s.icon} className="size-4.5" />
              {s.name}
            </Link>
          ))}
          <button
            type="button"
            onClick={call}
            className={cx('inline-flex h-11 items-center gap-2 rounded-full px-4 text-[15px] font-semibold transition', dark ? 'text-white underline-offset-4 hover:underline' : 'text-primary-ink hover:underline')}
          >
            <Phone className="size-4.5" aria-hidden />
            Call {company.phone}
          </button>
        </div>
      </div>

      <ul className={cx('mt-5 flex flex-wrap gap-x-6 gap-y-2 text-[15px] font-medium', dark ? 'text-white/90' : 'text-ink-2')}>
        <li className="flex items-center gap-1.5">
          <Star className="size-4.5 fill-warning text-warning" aria-hidden /> 4.9 rating
        </li>
        <li className="flex items-center gap-1.5">
          <ShieldCheck className={cx('size-4.5', dark ? 'text-accent-tint' : 'text-accent-ink')} aria-hidden /> Fully insured
        </li>
        <li className="flex items-center gap-1.5">
          <Users className={cx('size-4.5', dark ? 'text-accent-tint' : 'text-accent-ink')} aria-hidden /> Local team
        </li>
      </ul>
    </div>
  );

  const floatingCards = (
    <div className="pointer-events-none absolute bottom-24 right-6 z-10 hidden w-[300px] space-y-3 xl:right-10 xl:block" aria-hidden>
      <div className="animate-rise rounded-2xl bg-white/95 p-4 shadow-float backdrop-blur [animation-delay:200ms]">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-accent-soft text-accent-ink">
            <BellRing className="size-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-ink">Maya is on her way</p>
            <p className="text-xs text-muted">Gutter clean · arriving 10:25</p>
          </div>
        </div>
      </div>
      <div className="animate-rise rounded-2xl bg-white/95 p-4 shadow-float backdrop-blur [animation-delay:450ms]">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Job complete · photos ready</p>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <img src={asset('assets/gallery/gutter-spout-before.webp')} alt="" className="aspect-[4/3] w-full rounded-lg object-cover" />
          <img src={asset('assets/gallery/downpipe-after.webp')} alt="" className="aspect-[4/3] w-full rounded-lg object-cover" />
        </div>
      </div>
    </div>
  );

  if (style === 'split') {
    return (
      <section className="relative overflow-hidden bg-gradient-to-b from-primary-soft to-surface">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
          {content}
          <div className="relative pb-12 lg:py-16">
            <img
              src={asset('assets/hero/hero-window-cleaner.webp')}
              srcSet={`${asset('assets/hero/hero-window-cleaner-sm.webp')} 900w, ${asset('assets/hero/hero-window-cleaner.webp')} 1920w`}
              sizes="(min-width: 1024px) 50vw, 100vw"
              alt={`${company.companyName} technician cleaning windows with a water-fed pole`}
              fetchPriority="high"
              className="aspect-[4/3] w-full rounded-[calc(var(--brand-radius-card)*1.5)] object-cover shadow-float lg:aspect-[5/6]"
            />
            <div className="absolute -bottom-2 left-4 rounded-2xl bg-surface p-4 shadow-float lg:bottom-8 lg:-left-8">
              <div className="flex items-center gap-3">
                <Stars />
                <span className="text-sm font-bold text-ink">4.9 / 5</span>
              </div>
              <p className="mt-1 text-xs text-muted">Demo customer feedback</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (style === 'solid') {
    return (
      <section className="relative overflow-hidden bg-primary-solid">
        <div className="absolute inset-0 opacity-[0.08] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:22px_22px]" aria-hidden />
        <div className="absolute -right-32 -top-32 size-[520px] rounded-full bg-secondary opacity-25 blur-3xl" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1.15fr_1fr]">
          {content}
          <div className="relative hidden grid-cols-2 gap-3 pb-16 lg:grid lg:py-20">
            {services.slice(0, 3).map((s, i) => (
              <img key={s.id} src={asset(s.image)} alt="" className={cx('w-full rounded-card object-cover shadow-float', i === 0 ? 'col-span-2 aspect-[16/9]' : 'aspect-square')} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative isolate overflow-hidden bg-primary-deep">
      <img
        src={asset('assets/hero/hero-window-cleaner.webp')}
        srcSet={`${asset('assets/hero/hero-window-cleaner-sm.webp')} 900w, ${asset('assets/hero/hero-window-cleaner.webp')} 1920w`}
        sizes="100vw"
        alt={`${company.companyName} technician cleaning windows with a water-fed pole`}
        fetchPriority="high"
        className="absolute inset-0 -z-10 size-full -scale-x-100 object-cover object-[0%_30%]"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-primary-deep via-primary-deep/80 to-primary-deep/0 max-lg:bg-primary-deep/80 lg:via-45% lg:to-75%" aria-hidden />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-primary-deep/50 to-transparent" aria-hidden />
      <div className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:pb-24">{content}</div>
      {floatingCards}
    </section>
  );
}

// ------------------------------------------------------------------ Journey starter
function JourneyStarter({ services }: { services: ServiceConfig[] }) {
  return (
    <section id="start" aria-labelledby="start-title" className="relative z-20 bg-canvas pb-16 pt-12 lg:pt-0">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="rounded-[calc(var(--brand-radius-card)*1.4)] border border-line bg-surface p-5 shadow-float sm:p-8 lg:-mt-20">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-accent-ink">Start here</p>
              <h2 id="start-title" className="mt-1 text-3xl font-extrabold tracking-tight text-primary-ink sm:text-4xl">
                What do you need help with?
              </h2>
            </div>
            <p className="text-[15px] text-muted">Choose a service to get an instant estimate in under a minute.</p>
          </div>
          <div className={cx('mt-7 grid gap-5', services.length === 1 ? 'md:grid-cols-1 lg:max-w-md' : services.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3')}>
            {services.map((s, i) => (
              <ServiceCard key={s.id} service={s} priority={i === 0} />
            ))}
          </div>
          <div className="mt-7 grid gap-5 border-t border-line pt-7 lg:grid-cols-[1fr_1.3fr] lg:items-center">
            <div className="flex items-start gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-secondary-soft text-secondary-ink">
                <HelpCircle className="size-6" aria-hidden />
              </span>
              <div>
                <p className="text-lg font-bold text-ink">Not sure?</p>
                <p className="text-[15px] text-muted">Describe the problem and we’ll point you to the right person.</p>
                <LinkButton to="/quote" variant="soft" className="mt-3" iconRight={<ArrowRight className="size-4" />}>
                  Tell us what you need
                </LinkButton>
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-ink-2">Check we cover your area</p>
              <PostcodeChecker />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ Availability
function Availability({ services }: { services: ServiceConfig[] }) {
  return (
    <section aria-labelledby="avail-title" className="bg-canvas pb-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col gap-5 rounded-card bg-primary-solid p-6 text-primary-on sm:p-8 lg:flex-row lg:items-center">
          <div className="lg:w-64">
            <p className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.14em] text-white/70">
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full bg-success" />
              </span>
              Live availability
            </p>
            <h2 id="avail-title" className="mt-1.5 text-2xl font-extrabold text-white">
              Book your slot this week
            </h2>
          </div>
          <div className="grid flex-1 gap-3 sm:grid-cols-3">
            {services.map((s) => {
              const a = AVAILABILITY[s.id];
              return (
                <div key={s.id} className="rounded-xl bg-white/8 p-4 ring-1 ring-white/12">
                  <p className="flex items-center gap-2 text-[13px] font-semibold text-white/75">
                    <ServiceIcon name={s.icon} className="size-4" /> {a.label}
                  </p>
                  <p className="mt-1 font-display text-2xl font-extrabold text-white">{a.when}</p>
                  <p className="text-xs text-white/60">{a.detail}</p>
                </div>
              );
            })}
          </div>
          <LinkButton to="/booking" variant="white" size="lg" icon={<Clock className="size-4.5" />}>
            Check times
          </LinkButton>
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ Trust
function Trust() {
  const items = [
    { icon: ShieldCheck, title: 'Fully insured', text: '£5m public liability cover on every job.' },
    { icon: Users, title: 'Local technicians', text: 'Our own employed team — never random subcontractors.' },
    { icon: FileText, title: 'Transparent quotes', text: 'Clear prices before we start. No surprises on the invoice.' },
    { icon: Camera, title: 'Before/after evidence', text: 'Photos of the work sent to you when we finish.' },
    { icon: Smartphone, title: 'Customer portal', text: 'Track your job, approve quotes and pay online.' },
    { icon: Star, title: '4.9 / 5 rating', text: 'Demo customer feedback from local homeowners.' },
  ];
  return (
    <section aria-labelledby="trust-title" className="bg-surface py-20 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeader eyebrow="Why homeowners choose us" title={<span id="trust-title">Straightforward, professional and properly local</span>} center />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <div key={it.title} className="flex gap-4 rounded-card border border-line bg-canvas/60 p-6 transition hover:bg-surface hover:shadow-raised">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent-ink">
                <it.icon className="size-6" aria-hidden />
              </span>
              <div>
                <h3 className="text-lg font-bold text-ink">{it.title}</h3>
                <p className="mt-1 text-[15px] text-muted">{it.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ Before / after
function BeforeAfter({ hasGutter, hasWindow }: { hasGutter: boolean; hasWindow: boolean }) {
  return (
    <section aria-labelledby="ba-title" className="bg-primary-deep py-20 text-white md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeader light eyebrow="Before & after" title={<span id="ba-title">See the difference — and get the photos</span>} text="Every gutter and window job includes before-and-after photos in your customer portal, so you know exactly what was done." />
          <LinkButton to="/our-work" variant="white" iconRight={<ArrowRight className="size-4" />}>
            See more of our work
          </LinkButton>
        </div>
        <div className={cx('mt-12 grid gap-6', hasGutter && hasWindow && 'lg:grid-cols-2')}>
          {hasWindow && (
            <figure>
              <BeforeAfterSlider before="assets/gallery/window-sash-before.webp" after="assets/gallery/window-sash-after.webp" alt="Sash window clean" className="aspect-[4/3] w-full" start={55} />
              <figcaption className="mt-3 flex items-center justify-between text-sm text-white/75">
                <span className="font-semibold text-white">Window clean · Chelmsford</span>
                <span>Drag to compare</span>
              </figcaption>
            </figure>
          )}
          {hasGutter && (
            <figure>
              <BeforeAfterPair before="assets/gallery/gutter-spout-before.webp" after="assets/gallery/downpipe-after.webp" title="Gutter and downpipe clean" className="aspect-[4/3] w-full [&>figure]:aspect-auto" />
              <figcaption className="mt-3 flex items-center justify-between text-sm text-white/75">
                <span className="font-semibold text-white">Blocked downpipe cleared · Maldon</span>
                <span>Gutter vacuum + rods</span>
              </figcaption>
            </figure>
          )}
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ How it works
function HowItWorks() {
  const steps = [
    { icon: MessageSquareText, title: 'Tell us what you need', text: 'Pick a service and answer a few quick questions.' },
    { icon: FileText, title: 'Get a clear quote', text: 'An instant estimate, then a fixed written quote.' },
    { icon: CalendarDays, title: 'Choose a time', text: 'Book a slot that suits you online.' },
    { icon: Wrench, title: 'We complete the work', text: 'Our own technicians, on time, tidy and insured.' },
    { icon: Smartphone, title: 'Track everything online', text: 'Updates, photos, invoices and payment in one place.' },
  ];
  return (
    <section aria-labelledby="hiw-title" className="bg-canvas py-20 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeader eyebrow="How it works" title={<span id="hiw-title">From first click to finished job in five simple steps</span>} center />
        <ol className="relative mt-14 grid gap-6 md:grid-cols-5">
          <span className="absolute left-[10%] right-[10%] top-7 hidden h-0.5 bg-gradient-to-r from-accent-tint via-secondary-tint to-accent-tint md:block" aria-hidden />
          {steps.map((s, i) => (
            <li key={s.title} className="relative flex gap-4 md:flex-col md:items-center md:text-center">
              <span className="relative grid size-14 shrink-0 place-items-center rounded-2xl bg-surface text-secondary-ink shadow-raised ring-1 ring-line">
                <s.icon className="size-6" aria-hidden />
                <span className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full bg-primary-solid text-xs font-bold text-primary-on">{i + 1}</span>
              </span>
              <div>
                <h3 className="font-bold text-ink md:mt-4">{s.title}</h3>
                <p className="mt-1 text-[15px] text-muted">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-12 text-center">
          <LinkButton to="/how-it-works" variant="outline" iconRight={<ArrowRight className="size-4" />}>
            See the customer portal
          </LinkButton>
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ Pricing
function Pricing({ services }: { services: ServiceConfig[] }) {
  const cards: { service: string; title: string; price: string; unit: string; points: string[] }[] = [
    { service: 'gutter', title: 'Gutter Clean — Semi Detached', price: '£90', unit: 'from', points: ['Front & rear gutters', 'Downpipe check', 'Before/after photos'] },
    { service: 'plumbing', title: 'Minor Plumbing Visit', price: '£85', unit: 'from', points: ['Call-out & first 30 min', 'Leaks, taps & toilets', 'Price agreed before work'] },
    { service: 'window', title: 'Regular Window Clean', price: '£22', unit: 'from', points: ['Frames & sills included', '4, 6 or 8-weekly', 'Pay online after each clean'] },
  ].filter((c) => services.some((s) => s.id === c.service));
  return (
    <section aria-labelledby="pricing-title" className="bg-surface py-20 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <SectionHeader eyebrow="Popular services" title={<span id="pricing-title">Honest prices, shown up front</span>} />
          <DemoBadge>Demo pricing only</DemoBadge>
        </div>
        <div className={cx('mt-10 grid gap-5', cards.length === 3 ? 'md:grid-cols-3' : cards.length === 2 ? 'md:grid-cols-2' : '')}>
          {cards.map((c) => {
            const svc = services.find((s) => s.id === c.service)!;
            const tone = serviceTone(svc.color);
            return (
              <div key={c.title} className="flex flex-col rounded-card border border-line p-6 transition hover:border-transparent hover:shadow-float">
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold" style={{ background: tone.soft, color: tone.ink }}>
                  <ServiceIcon name={svc.icon} className="size-3.5" /> {svc.name}
                </span>
                <h3 className="mt-4 text-lg font-bold text-ink">{c.title}</h3>
                <p className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-sm text-muted">{c.unit}</span>
                  <span className="font-display text-4xl font-extrabold tracking-tight text-primary-ink">{c.price}</span>
                </p>
                <ul className="mt-4 flex-1 space-y-2 text-[15px] text-ink-2">
                  {c.points.map((p) => (
                    <li key={p} className="flex items-center gap-2">
                      <CheckCircle2 className="size-4.5 text-success" aria-hidden /> {p}
                    </li>
                  ))}
                </ul>
                <LinkButton to={`/quote?service=${c.service}`} variant="outline" className="mt-6" full>
                  Get an exact quote
                </LinkButton>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ Reviews
function Reviews() {
  const cfg = useConfig();
  const visible = REVIEWS.filter((r) => cfg.services.find((s) => s.id === r.service)?.enabled);
  const three = [visible.find((r) => r.service === 'gutter'), visible.find((r) => r.service === 'plumbing'), visible.find((r) => r.service === 'window')].filter(Boolean).slice(0, 3);
  const list = (three.length >= 2 ? three : visible.slice(0, 3)) as typeof REVIEWS;
  return (
    <section aria-labelledby="reviews-title" className="bg-canvas py-20 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[320px_1fr]">
          <div>
            <SectionHeader eyebrow="Reviews" title={<span id="reviews-title">Rated 4.9 out of 5</span>} text="By homeowners across Essex." />
            <div className="mt-6 flex items-center gap-4 rounded-card bg-surface p-5 shadow-card">
              <span className="font-display text-5xl font-extrabold text-primary-ink">4.9</span>
              <div>
                <Stars size="size-5" />
                <p className="mt-1 text-sm text-muted">Demo customer feedback</p>
              </div>
            </div>
            <Link to="/reviews" className="mt-4 inline-flex items-center gap-1 font-semibold text-secondary-ink hover:underline">
              Read more reviews <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {list.map((r) => (
              <ReviewCard key={r.id} review={r} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ Recurring care
function RecurringCare({ hasWindow, hasGutter }: { hasWindow: boolean; hasGutter: boolean }) {
  const plans = [
    { weeks: 4, label: 'Every 4 weeks', note: 'Most popular · sparkling all year', price: '£22' },
    { weeks: 6, label: 'Every 6 weeks', note: 'Great balance of value and shine', price: '£24' },
    { weeks: 8, label: 'Every 8 weeks', note: 'Ideal for low-traffic homes', price: '£26' },
  ];
  return (
    <section aria-labelledby="care-title" className="bg-surface py-20 md:py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
        <div className="relative">
          <img src={asset('assets/homes/street-autumn.webp')} alt="Tree-lined residential street in autumn" loading="lazy" className="aspect-[4/3] w-full rounded-[calc(var(--brand-radius-card)*1.5)] object-cover shadow-float" />
          {hasGutter && (
            <div className="absolute -bottom-6 left-4 right-4 flex items-center gap-4 rounded-2xl bg-surface p-4 shadow-float sm:left-8 sm:right-auto sm:max-w-sm">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-warning-soft text-warning-ink">
                <Leaf className="size-6" aria-hidden />
              </span>
              <div>
                <p className="font-bold text-ink">Autumn gutter care</p>
                <p className="text-sm text-muted">We remind you every October — before the winter rain.</p>
              </div>
            </div>
          )}
        </div>
        <div>
          <SectionHeader eyebrow="Recurring care" title={<span id="care-title">Set it once. We’ll look after the rest.</span>} text="Join a regular window round or our annual gutter plan. We text you before every visit and you pay online afterwards." />
          {hasWindow && (
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {plans.map((p, i) => (
                <Link
                  key={p.weeks}
                  to={`/quote?service=window&frequency=${p.weeks}`}
                  className={cx('rounded-card border p-4 transition hover:shadow-raised', i === 0 ? 'border-secondary-solid bg-secondary-soft' : 'border-line')}
                >
                  <Repeat className="size-5 text-secondary-ink" aria-hidden />
                  <p className="mt-2 font-bold text-ink">{p.label}</p>
                  <p className="text-xs text-muted">{p.note}</p>
                  <p className="mt-2 text-sm text-ink-2">
                    from <span className="font-bold text-primary-ink">{p.price}</span>
                  </p>
                </Link>
              ))}
            </div>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            {hasWindow && (
              <LinkButton to="/quote?service=window" size="lg" icon={<Sparkles className="size-4.5" />}>
                Join the round
              </LinkButton>
            )}
            {hasGutter && (
              <LinkButton to="/quote?service=gutter" size="lg" variant="outline" icon={<ClipboardList className="size-4.5" />}>
                Book autumn gutter care
              </LinkButton>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ Areas
function Areas() {
  const { company } = useConfig();
  return (
    <section aria-labelledby="areas-title" className="bg-canvas py-20 md:py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <SectionHeader eyebrow="Areas we cover" title={<span id="areas-title">Local to {company.serviceAreas[0]} and across {company.region}</span>} text="Our vans are based in Chelmsford, so we’re never far away. If you’re just outside the area, ask — we can often help." />
          <ul className="mt-6 flex flex-wrap gap-2">
            {company.serviceAreas.map((a) => (
              <li key={a} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm font-semibold text-ink-2">
                <MapPin className="size-3.5 text-accent-ink" aria-hidden /> {a}
              </li>
            ))}
          </ul>
          <div className="mt-8 max-w-lg">
            <PostcodeChecker compact />
          </div>
        </div>
        <div className="overflow-hidden rounded-[calc(var(--brand-radius-card)*1.5)] shadow-float">
          <AreaMap />
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ Final CTA
function FinalCta() {
  const call = useCallModal();
  return (
    <section aria-labelledby="cta-title" className="bg-surface px-4 pb-20 pt-4 sm:px-6 md:pb-24">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[calc(var(--brand-radius-card)*1.6)] bg-primary-solid px-6 py-14 text-center sm:px-12 md:py-20">
        <div className="absolute -left-24 -top-24 size-80 rounded-full bg-secondary opacity-30 blur-3xl" aria-hidden />
        <div className="absolute -bottom-24 -right-24 size-80 rounded-full bg-accent opacity-30 blur-3xl" aria-hidden />
        <div className="relative">
          <BadgeCheck className="mx-auto size-12 text-accent-tint" aria-hidden />
          <h2 id="cta-title" className="mt-4 font-display text-4xl font-extrabold tracking-tight text-white md:text-5xl">
            Need help at home?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">Get a clear price in under a minute, pick a time that suits you and follow every step online.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <LinkButton to="/quote" size="xl" iconRight={<ArrowRight className="size-5" />}>
              Get a Quote
            </LinkButton>
            <LinkButton to="/booking" size="xl" variant="white" icon={<CalendarCheck className="size-5" />}>
              Book a Service
            </LinkButton>
            <Button size="xl" variant="ghost" className="text-white ring-1 ring-white/30 hover:bg-white/10" icon={<Phone className="size-5" />} onClick={call}>
              Call Us
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
