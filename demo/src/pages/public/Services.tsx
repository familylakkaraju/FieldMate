import { ArrowRight, CheckCircle2, Repeat, Zap } from 'lucide-react';
import { useConfig } from '../../app/DemoProvider';
import { enabledServices } from '../../app/selectors';
import { SERVICE_CONTENT } from '../../data/content';
import { LinkButton } from '../../components/common/Button';
import { DemoBadge } from '../../components/common/Badge';
import { ServiceIcon } from '../../components/common/ServiceIcon';
import { serviceTone } from '../../theme/branding';
import { asset, cx } from '../../utils/cx';

export default function Services() {
  const cfg = useConfig();
  const services = enabledServices(cfg);
  return (
    <div className="bg-canvas">
      <section className="bg-primary-solid px-4 py-14 text-center text-primary-on sm:px-6 md:py-20">
        <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-white/70">Our services</p>
        <h1 className="mx-auto mt-2 max-w-3xl font-display text-4xl font-extrabold tracking-tight text-white md:text-5xl">Everything your home needs, from one trusted team</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">Pick a service to get an instant estimate. Indicative prices below — your fixed quote comes before any work starts.</p>
        <DemoBadge className="mt-5">Demo pricing only</DemoBadge>
      </section>
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-14 sm:px-6 md:py-20">
        {services.map((s, i) => {
          const content = SERVICE_CONTENT[s.id];
          const tone = serviceTone(s.color);
          return (
            <article key={s.id} className="card grid overflow-hidden md:grid-cols-2">
              <div className={cx('relative min-h-64', i % 2 === 1 && 'md:order-2')}>
                <img src={asset(s.image)} alt="" loading={i ? 'lazy' : 'eager'} className="absolute inset-0 size-full object-cover" />
              </div>
              <div className="p-6 sm:p-10">
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold" style={{ background: tone.soft, color: tone.ink }}>
                    <ServiceIcon name={s.icon} className="size-3.5" /> {s.name}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-subtle px-3 py-1 text-xs font-semibold text-ink-2">
                    {s.recurring ? <Repeat className="size-3.5" aria-hidden /> : <Zap className="size-3.5" aria-hidden />}
                    {s.recurring ? 'One-off or recurring' : 'One-off · same-day available'}
                  </span>
                </div>
                <h2 className="mt-4 text-2xl font-extrabold text-primary-ink sm:text-3xl">{content.heroTitle}</h2>
                <p className="mt-3 text-muted">{s.description}.</p>
                <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                  {content.bullets.slice(0, 6).map((b) => (
                    <li key={b} className="flex items-center gap-2 text-sm text-ink-2">
                      <CheckCircle2 className="size-4 text-success" aria-hidden /> {b}
                    </li>
                  ))}
                </ul>
                <p className="mt-6 text-sm text-muted">
                  From <span className="font-display text-2xl font-extrabold text-primary-ink">£{s.startingPrice}</span> / {s.priceUnit}
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <LinkButton to={`/quote?service=${s.id}`} size="lg" iconRight={<ArrowRight className="size-4.5" />}>
                    {s.cta}
                  </LinkButton>
                  <LinkButton to={`/services/${s.slug}`} size="lg" variant="outline">
                    Details & FAQs
                  </LinkButton>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
