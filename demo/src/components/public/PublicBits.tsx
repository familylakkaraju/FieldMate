import { useId, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, MapPin, MoveHorizontal, Star, XCircle } from 'lucide-react';
import type { ServiceConfig, ServiceType } from '../../types/domain';
import type { Review } from '../../data/content';
import { useConfig } from '../../app/DemoProvider';
import { serviceTone } from '../../theme/branding';
import { asset, cx } from '../../utils/cx';
import { ServiceIcon } from '../common/ServiceIcon';
import { Button, LinkButton } from '../common/Button';
import { inputClass } from '../common/Form';

export function Stars({ rating = 5, size = 'size-4', className }: { rating?: number; size?: string; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-0.5', className)} role="img" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={cx(size, i < Math.round(rating) ? 'fill-warning text-warning' : 'fill-line text-line')} aria-hidden />
      ))}
    </span>
  );
}

/** Large visual service card that launches the quote journey directly. */
export function ServiceCard({ service, priority }: { service: ServiceConfig; priority?: boolean }) {
  const tone = serviceTone(service.color);
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-float">
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={asset(service.image)}
          alt=""
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          className="size-full object-cover transition duration-700 group-hover:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/0 to-black/0" aria-hidden />
        <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-xs font-bold shadow-sm" style={{ color: tone.ink }}>
          <ServiceIcon name={service.icon} className="size-3.5" />
          {service.recurring ? 'One-off or recurring' : 'Same-day available'}
        </span>
        <span className="absolute bottom-4 right-4 rounded-full bg-black/55 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
          from £{service.startingPrice}
          <span className="font-normal text-white/75"> / {service.priceUnit}</span>
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl" style={{ background: tone.soft, color: tone.ink }}>
            <ServiceIcon name={service.icon} className="size-5.5" />
          </span>
          <h3 className="text-xl font-extrabold uppercase tracking-tight text-primary-ink">{service.name}</h3>
        </div>
        <p className="mt-3 flex-1 text-[15px] text-muted">{service.description}</p>
        <LinkButton
          to={`/quote?service=${service.id}`}
          size="lg"
          full
          className="mt-5"
          iconRight={<ArrowRight className="size-4.5 transition group-hover:translate-x-0.5" />}
        >
          {service.cta}
        </LinkButton>
        <Link to={`/services/${service.slug}`} className="mt-3 text-center text-[13px] font-semibold text-muted hover:text-ink">
          Learn more about {service.name.toLowerCase()}
        </Link>
      </div>
    </article>
  );
}

/** Accessible before/after comparison slider (range input drives the reveal). */
export function BeforeAfterSlider({ before, after, alt, className, start = 50 }: { before: string; after: string; alt: string; className?: string; start?: number }) {
  const [pos, setPos] = useState(start);
  const id = useId();
  return (
    <div className={cx('relative select-none overflow-hidden rounded-card bg-subtle', className)}>
      <img src={asset(after)} alt={`${alt} — after`} loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <img src={asset(before)} alt={`${alt} — before`} loading="lazy" decoding="async" className="size-full object-cover" />
      </div>
      <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-white">Before</span>
      <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-primary-ink">After</span>
      <div className="pointer-events-none absolute inset-y-0" style={{ left: `${pos}%` }} aria-hidden>
        <div className="absolute inset-y-0 -left-px w-0.5 bg-white shadow-[0_0_8px_rgb(0_0_0/0.35)]" />
        <div className="absolute left-0 top-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-primary-ink shadow-float">
          <MoveHorizontal className="size-5" />
        </div>
      </div>
      <label htmlFor={id} className="sr-only">
        Drag to compare before and after
      </label>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        className="absolute inset-0 size-full cursor-ew-resize opacity-0"
      />
    </div>
  );
}

export function BeforeAfterPair({ before, after, title, className }: { before: string; after: string; title: string; className?: string }) {
  return (
    <div className={cx('grid grid-cols-2 gap-2 overflow-hidden rounded-card', className)}>
      {[
        ['Before', before],
        ['After', after],
      ].map(([label, src]) => (
        <figure key={label} className="relative aspect-[4/5] overflow-hidden rounded-[calc(var(--brand-radius-card)*0.6)] bg-subtle">
          <img src={asset(src)} alt={`${title} — ${label.toLowerCase()}`} loading="lazy" decoding="async" className="size-full object-cover" />
          <figcaption className={cx('absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide', label === 'Before' ? 'bg-black/60 text-white' : 'bg-white/90 text-primary-ink')}>{label}</figcaption>
        </figure>
      ))}
    </div>
  );
}

export function ReviewCard({ review }: { review: Review }) {
  const cfg = useConfig();
  const svc = cfg.services.find((s) => s.id === review.service)!;
  const tone = serviceTone(svc.color);
  return (
    <figure className="flex h-full flex-col rounded-card border border-line bg-surface p-6 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <Stars rating={review.rating} />
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: tone.soft, color: tone.ink }}>
          <ServiceIcon name={svc.icon} className="size-3.5" /> {svc.name}
        </span>
      </div>
      <blockquote className="mt-4 flex-1 text-[15px] leading-relaxed text-ink-2">“{review.text}”</blockquote>
      <figcaption className="mt-5 flex items-center justify-between border-t border-line pt-4 text-sm">
        <span>
          <span className="font-bold text-ink">{review.name}</span>
          <span className="text-muted"> · {review.area}</span>
        </span>
        <span className="text-xs text-muted">{review.when}</span>
      </figcaption>
    </figure>
  );
}

const AREAS: [RegExp, string][] = [
  [/^CM[123]\b/, 'Chelmsford'],
  [/^CM9\b/, 'Maldon'],
  [/^CM7\b/, 'Braintree'],
  [/^CM8\b/, 'Witham'],
  [/^CM1[345]\b/, 'Brentwood'],
  [/^CM\d/, 'mid-Essex'],
  [/^CO\d/, 'Colchester'],
  [/^E\d/, 'East London'],
  [/^(IG|RM)\d/, 'East London & Essex border'],
];

export function postcodeArea(raw: string): { ok: boolean; area?: string; clean: string } {
  const clean = raw.toUpperCase().replace(/\s+/g, ' ').trim();
  if (!/^[A-Z]{1,2}\d/.test(clean)) return { ok: false, clean };
  const outward = clean.split(' ')[0];
  const hit = AREAS.find(([re]) => re.test(outward + ' ') || re.test(outward));
  return { ok: !!hit, area: hit?.[1], clean };
}

/** Postcode availability checker (static coverage rules, no maps API). */
export function PostcodeChecker({ service, compact, dark }: { service?: ServiceType; compact?: boolean; dark?: boolean }) {
  const [value, setValue] = useState('');
  const [result, setResult] = useState<ReturnType<typeof postcodeArea> | null>(null);
  const id = useId();
  const check = (e: FormEvent) => {
    e.preventDefault();
    setResult(postcodeArea(value || 'CM2'));
  };
  return (
    <div>
      <form onSubmit={check} className={cx('flex flex-col gap-2', compact ? 'min-[420px]:flex-row' : 'sm:flex-row')}>
        <label htmlFor={id} className="sr-only">
          Your postcode
        </label>
        <div className="relative flex-1">
          <MapPin className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-muted" aria-hidden />
          <input id={id} value={value} onChange={(e) => setValue(e.target.value)} placeholder="Postcode, e.g. CM2 6XX" autoComplete="postal-code" className={cx(inputClass, 'h-12 pl-10 uppercase placeholder:normal-case')} />
        </div>
        <Button type="submit" size="lg" variant="dark" className="h-12">
          Check availability
        </Button>
      </form>
      {result && (
        <div role="status" className={cx('mt-3 flex items-start gap-2.5 rounded-xl p-3.5 text-sm', result.ok ? 'bg-success-soft text-success-ink' : 'bg-warning-soft text-warning-ink', dark && 'ring-1 ring-white/10')}>
          {result.ok ? <CheckCircle2 className="mt-0.5 size-4.5 shrink-0" aria-hidden /> : <XCircle className="mt-0.5 size-4.5 shrink-0" aria-hidden />}
          <div className="flex-1">
            {result.ok ? (
              <>
                <p className="font-semibold">Great news — we cover {result.clean.split(' ')[0]} ({result.area}).</p>
                <p className="mt-0.5 opacity-90">Next slots: plumbing today 16:00 · gutters Friday 10:00 · windows Monday.</p>
                <Link to={`/quote${service ? `?service=${service}` : ''}`} className="mt-1.5 inline-flex items-center gap-1 font-bold underline-offset-2 hover:underline">
                  Get your instant quote <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </>
            ) : (
              <>
                <p className="font-semibold">{/^[A-Z]{1,2}\d/.test(result.clean) ? `We don’t currently cover ${result.clean.split(' ')[0]}.` : 'Please enter a valid UK postcode.'}</p>
                <p className="mt-0.5 opacity-90">Leave your details and we’ll let you know when we expand.</p>
                <Link to="/contact" className="mt-1.5 inline-flex items-center gap-1 font-bold hover:underline">
                  Contact us <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Stylised static service-area graphic — no maps API. */
export function AreaMap({ className }: { className?: string }) {
  const towns: { name: string; x: number; y: number; hub?: boolean; dx?: number; anchor?: 'start' | 'end' | 'middle' }[] = [
    { name: 'Chelmsford', x: 300, y: 215, hub: true },
    { name: 'Braintree', x: 292, y: 92 },
    { name: 'Witham', x: 378, y: 150 },
    { name: 'Colchester', x: 508, y: 92 },
    { name: 'Maldon', x: 450, y: 232 },
    { name: 'Brentwood', x: 178, y: 300 },
    { name: 'East London', x: 70, y: 352, anchor: 'start', dx: -6 },
  ];
  return (
    <svg viewBox="0 0 600 420" className={cx('h-auto w-full', className)} role="img" aria-label="Map of our service area: Chelmsford, Maldon, Colchester, Brentwood, Braintree, Witham and East London">
      <defs>
        <radialGradient id="area-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--brand-accent)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--brand-accent)" stopOpacity="0" />
        </radialGradient>
        <pattern id="area-grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M24 0H0v24" fill="none" stroke="var(--brand-primary)" strokeOpacity="0.06" />
        </pattern>
      </defs>
      <rect width="600" height="420" rx="24" fill="var(--brand-primary-soft)" />
      <rect width="600" height="420" rx="24" fill="url(#area-grid)" />
      {/* coastline & estuaries */}
      <path d="M600 0v420H560c-14-30 6-52-8-78-12-22-38-18-46-40-10-26 22-36 18-62-4-24-34-26-36-50-2-22 26-30 30-52 4-20-10-30-6-50 3-16 16-26 18-42 2-14-6-30-6-46Z" fill="var(--brand-secondary)" fillOpacity="0.12" />
      <path d="M498 250c18 4 34 18 50 16" stroke="var(--brand-secondary)" strokeOpacity="0.35" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M0 392c60-8 120-12 190-6 70 6 130 20 200 18 50-2 90-14 140-10" stroke="var(--brand-secondary)" strokeOpacity="0.3" strokeWidth="6" fill="none" strokeLinecap="round" />
      {/* river Chelmer */}
      <path d="M210 160c30 18 60 40 90 55 40 20 80 22 120 18 18-2 30 2 30 2" stroke="var(--brand-secondary)" strokeOpacity="0.3" strokeWidth="2.5" fill="none" />
      <circle cx="300" cy="215" r="230" fill="url(#area-glow)" />
      <circle cx="300" cy="215" r="170" fill="none" stroke="var(--brand-accent)" strokeOpacity="0.45" strokeDasharray="4 6" strokeWidth="1.5" />
      {towns
        .filter((t) => !t.hub)
        .map((t) => (
          <line key={`l-${t.name}`} x1="300" y1="215" x2={t.x} y2={t.y} stroke="var(--brand-primary)" strokeOpacity="0.25" strokeWidth="1.5" strokeDasharray="2 5" />
        ))}
      {towns.map((t) => (
        <g key={t.name}>
          {t.hub && <circle cx={t.x} cy={t.y} r="22" fill="var(--brand-accent)" fillOpacity="0.18" />}
          <circle cx={t.x} cy={t.y} r={t.hub ? 9 : 6} fill={t.hub ? 'var(--brand-accent)' : 'var(--brand-primary)'} stroke="#fff" strokeWidth="3" />
          <text
            x={t.x + (t.dx ?? 0)}
            y={t.y - (t.hub ? 18 : 13)}
            textAnchor={t.anchor ?? 'middle'}
            fontSize={t.hub ? 17 : 14}
            fontWeight={t.hub ? 800 : 700}
            fill="var(--brand-primary)"
            fontFamily="var(--brand-font-display)"
            paintOrder="stroke"
            stroke="var(--brand-primary-soft)"
            strokeWidth="4"
          >
            {t.name}
          </text>
        </g>
      ))}
      <g transform="translate(24 24)">
        <rect width="168" height="34" rx="17" fill="#fff" />
        <circle cx="20" cy="17" r="6" fill="var(--brand-accent)" />
        <text x="34" y="22" fontSize="13" fontWeight="700" fill="var(--brand-primary)">
          Base: Chelmsford
        </text>
      </g>
    </svg>
  );
}
