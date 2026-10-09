import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertCircle, ArrowRight, CalendarCheck, Check, CheckCircle2, ChevronDown, Leaf, Phone, Siren, Wind } from 'lucide-react';
import { useConfig } from '../../app/DemoProvider';
import { enabledServices } from '../../app/selectors';
import { GALLERY, REVIEWS, SERVICE_CONTENT } from '../../data/content';
import { serviceFromSlug } from '../../data/services';
import { useCallModal } from '../../layouts/PublicLayout';
import { Button, LinkButton } from '../../components/common/Button';
import { DemoBadge } from '../../components/common/Badge';
import { SectionHeader } from '../../components/common/Card';
import { Segmented } from '../../components/common/Form';
import { ServiceIcon } from '../../components/common/ServiceIcon';
import { BeforeAfterPair, BeforeAfterSlider, ReviewCard } from '../../components/public/PublicBits';
import { serviceTone } from '../../theme/branding';
import { asset, cx } from '../../utils/cx';

export default function ServiceDetail() {
  const { slug } = useParams();
  const cfg = useConfig();
  const call = useCallModal();
  const id = serviceFromSlug(slug);
  const svc = cfg.services.find((s) => s.id === id);

  if (!svc || !id || !svc.enabled) {
    const others = enabledServices(cfg);
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <AlertCircle className="mx-auto size-10 text-muted" aria-hidden />
        <h1 className="mt-4 text-2xl font-bold text-ink">{svc ? `${svc.name} isn’t currently offered` : 'Service not found'}</h1>
        <p className="mt-2 text-muted">Here’s what {cfg.company.companyName} can help with today:</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {others.map((s) => (
            <LinkButton key={s.id} to={`/services/${s.slug}`} variant="outline" icon={<ServiceIcon name={s.icon} className="size-4" />}>
              {s.name}
            </LinkButton>
          ))}
        </div>
      </div>
    );
  }

  const content = SERVICE_CONTENT[id];
  const tone = serviceTone(svc.color);
  const reviews = REVIEWS.filter((r) => r.service === id).slice(0, 2);
  const recent = GALLERY.filter((g) => g.service === id).slice(0, 3);

  return (
    <div className="bg-surface">
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-primary-deep">
        <img src={asset(svc.image)} alt="" className="absolute inset-0 -z-10 size-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-primary-deep via-primary-deep/85 to-primary-deep/15 max-lg:bg-primary-deep/80 lg:via-50%" aria-hidden />
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
          <nav aria-label="Breadcrumb" className="mb-5 text-sm text-white/70">
            <Link to="/" className="hover:text-white">
              Home
            </Link>{' '}
            /{' '}
            <Link to="/services" className="hover:text-white">
              Services
            </Link>{' '}
            / <span className="text-white">{svc.name}</span>
          </nav>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3.5 py-1.5 text-sm font-semibold text-white ring-1 ring-white/20">
            <ServiceIcon name={svc.icon} className="size-4" /> {svc.name}
          </span>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-extrabold tracking-tight text-white md:text-[52px] md:leading-[1.08]">{content.heroTitle}</h1>
          <p className="mt-4 max-w-2xl text-lg text-white/80">{content.heroText}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <LinkButton to={`/quote?service=${id}`} size="xl" iconRight={<ArrowRight className="size-5" />}>
              {id === 'gutter' ? 'Get Gutter Quote' : id === 'window' ? 'Join the Round' : 'Start Plumbing Request'}
            </LinkButton>
            <LinkButton to={`/booking?service=${id}`} size="xl" variant="white" icon={<CalendarCheck className="size-5" />}>
              Book a time
            </LinkButton>
          </div>
        </div>
      </section>

      {id === 'plumbing' && (
        <div className="bg-danger-ink text-white">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="flex items-center gap-2.5 font-semibold">
              <Siren className="size-5" aria-hidden /> Water leaking now? Turn off your stopcock and call — we keep same-day slots for emergencies.
            </p>
            <Button variant="white" icon={<Phone className="size-4" />} onClick={call} className="text-danger-ink">
              Emergency call {cfg.company.phone}
            </Button>
          </div>
        </div>
      )}

      {/* What we do */}
      <section className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 md:py-20 lg:grid-cols-2">
        <div>
          <SectionHeader eyebrow="What we do" title={id === 'gutter' ? 'How our gutter vacuum works' : id === 'window' ? 'Purified water, spotless results' : 'Repairs done properly, first time'} />
          {id === 'gutter' && (
            <p className="mt-4 text-muted">
              Our high-reach gutter vacuum sucks out leaves, moss and silt from the ground — no ladders on your roof, no mess on your drive. A camera on the pole shows you the gutter before and after, then we flush-test every downpipe.
            </p>
          )}
          {id === 'window' && <p className="mt-4 text-muted">Water-fed poles reach up to three storeys from the ground. Purified water dries spot-free, and we clean frames and sills on every visit as standard.</p>}
          {id === 'plumbing' && <p className="mt-4 text-muted">Our plumbers carry common parts on the van, explain the fix before starting and leave everything tidy. Most repairs are completed in a single visit.</p>}
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {content.bullets.map((b) => (
              <li key={b} className="flex items-center gap-2.5 rounded-xl border border-line px-3.5 py-3 text-[15px] font-medium text-ink">
                <span className="grid size-7 place-items-center rounded-lg" style={{ background: tone.soft, color: tone.ink }}>
                  <Check className="size-4" aria-hidden />
                </span>
                {b}
              </li>
            ))}
          </ul>
        </div>
        <div>
          {id === 'gutter' ? (
            <BeforeAfterPair before="assets/services/gutter.webp" after="assets/gallery/gutter-after.webp" title="Gutter clean" />
          ) : id === 'window' ? (
            <BeforeAfterSlider before="assets/gallery/window-sash-before.webp" after="assets/gallery/window-sash-after.webp" alt="Window clean" className="aspect-[4/3] w-full" />
          ) : (
            <img src={asset(content.extraImage)} alt="Plumber repairing pipework under a sink" loading="lazy" className="aspect-[4/3] w-full rounded-card object-cover shadow-float" />
          )}
        </div>
      </section>

      {/* Common problems */}
      <section className="bg-canvas py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeader eyebrow="Common problems" title="Sound familiar?" center />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {content.problems.map((p) => (
              <div key={p.title} className="rounded-card border border-line bg-surface p-6">
                <ServiceIcon name={svc.icon} className="size-6" style={{ color: tone.ink }} />
                <h3 className="mt-3 font-bold text-ink">{p.title}</h3>
                <p className="mt-1 text-sm text-muted">{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <Pricing serviceId={id} />

      {id === 'gutter' && (
        <section className="bg-canvas py-16">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2">
            <img src={asset('assets/homes/street-autumn.webp')} alt="Autumn leaves on a residential street" loading="lazy" className="aspect-[16/10] w-full rounded-card object-cover" />
            <div>
              <SectionHeader eyebrow="Seasonal care" title="Autumn gutter care plan" text="Leaves drop from October. Join our annual plan and we’ll contact you every autumn to book your clean — before the winter rain arrives." />
              <ul className="mt-5 space-y-2 text-ink-2">
                {['Annual reminder & priority booking', 'Downpipe flush test included', 'Before/after photos every year'].map((x) => (
                  <li key={x} className="flex items-center gap-2">
                    <Leaf className="size-4.5 text-accent-ink" aria-hidden /> {x}
                  </li>
                ))}
              </ul>
              <LinkButton to="/quote?service=gutter" className="mt-6" size="lg">
                Get Gutter Quote
              </LinkButton>
            </div>
          </div>
        </section>
      )}

      {/* Recent jobs */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <SectionHeader eyebrow="Recent jobs" title={`Recent ${svc.name.toLowerCase()} work`} />
          <Link to="/our-work" className="hidden items-center gap-1 font-semibold text-secondary-ink hover:underline sm:inline-flex">
            View gallery <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {recent.map((g) => (
            <figure key={g.id} className="overflow-hidden rounded-card border border-line">
              <img src={asset(g.image)} alt={g.title} loading="lazy" className="aspect-[4/3] w-full object-cover" />
              <figcaption className="p-4">
                <p className="font-bold text-ink">{g.title}</p>
                <p className="text-sm text-muted">
                  {g.location} · {g.outcome}
                </p>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* FAQ + reviews */}
      <section className="bg-canvas py-16 md:py-20">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <SectionHeader eyebrow="FAQ" title="Questions we’re often asked" />
            <div className="mt-6 divide-y divide-line rounded-card border border-line bg-surface">
              {content.faqs.map((f) => (
                <Faq key={f.q} q={f.q} a={f.a} />
              ))}
            </div>
          </div>
          <div className="space-y-5">
            <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-accent-ink">What customers say</p>
            {reviews.map((r) => (
              <ReviewCard key={r.id} review={r} />
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-5 rounded-card bg-primary-solid px-6 py-12 text-center text-primary-on">
          <Wind className="size-9 text-accent-tint" aria-hidden />
          <h2 className="font-display text-3xl font-extrabold text-white">Ready when you are</h2>
          <LinkButton to={`/quote?service=${id}`} size="xl" iconRight={<ArrowRight className="size-5" />}>
            {id === 'gutter' ? 'Get Gutter Quote' : id === 'window' ? 'Join the Round' : 'Start Plumbing Request'}
          </LinkButton>
        </div>
      </section>
    </div>
  );
}

function Pricing({ serviceId }: { serviceId: 'plumbing' | 'gutter' | 'window' }) {
  const content = SERVICE_CONTENT[serviceId];
  const [mode, setMode] = useState<'recurring' | 'oneoff'>('recurring');
  const [freq, setFreq] = useState<'4' | '6' | '8'>('4');
  const adj = freq === '8' ? 4 : freq === '6' ? 2 : 0;
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <SectionHeader eyebrow="Pricing" title={serviceId === 'gutter' ? 'Priced by property size' : serviceId === 'window' ? 'Simple per-visit pricing' : 'Clear, upfront prices'} />
        <div className="flex flex-wrap items-center gap-3">
          {serviceId === 'window' && (
            <>
              <Segmented label="Clean type" value={mode} onChange={setMode} options={[{ value: 'recurring', label: 'Recurring' }, { value: 'oneoff', label: 'One-off' }]} />
              {mode === 'recurring' && <Segmented label="Frequency" value={freq} onChange={setFreq} options={[{ value: '4', label: '4 weeks' }, { value: '6', label: '6 weeks' }, { value: '8', label: '8 weeks' }]} />}
            </>
          )}
          <DemoBadge>Demo pricing only</DemoBadge>
        </div>
      </div>
      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {content.pricing.map((p, i) => {
          const base = Number(p.price.replace(/\D/g, ''));
          const price = serviceId === 'window' ? (mode === 'oneoff' ? Math.round(base * 1.8) : base + adj) : base;
          return (
            <div key={p.label} className={cx('rounded-card border p-6', i === 1 ? 'border-secondary-solid bg-secondary-soft/50' : 'border-line')}>
              <p className="font-bold text-ink">{p.label}</p>
              <p className="mt-2 flex items-baseline gap-1.5">
                <span className="text-sm text-muted">from</span>
                <span className="font-display text-4xl font-extrabold text-primary-ink">£{price}</span>
              </p>
              <p className="mt-1 text-sm text-muted">{serviceId === 'window' ? (mode === 'oneoff' ? 'One-off clean, inside-out frames' : `Every ${freq} weeks, per visit`) : p.note}</p>
            </div>
          );
        })}
      </div>
      <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-2">
        {serviceId === 'gutter' && (
          <>
            <li className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-success" aria-hidden /> Downpipe clearance +£25 if needed</li>
            <li className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-success" aria-hidden /> Extension / porch gutters +£20</li>
          </>
        )}
        {serviceId === 'window' && (
          <>
            <li className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-success" aria-hidden /> Frames & sills always included</li>
            <li className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-success" aria-hidden /> Conservatory add-on from £12</li>
          </>
        )}
        {serviceId === 'plumbing' && <li className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-success" aria-hidden /> Parts at trade price, agreed before fitting</li>}
      </ul>
    </section>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-ink">
        {q}
        <ChevronDown className={cx('size-5 shrink-0 text-muted transition', open && 'rotate-180')} aria-hidden />
      </button>
      {open && <p className="animate-fade-in px-5 pb-5 text-muted">{a}</p>}
    </div>
  );
}
