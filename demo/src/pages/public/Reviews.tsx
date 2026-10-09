import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useConfig } from '../../app/DemoProvider';
import { REVIEWS } from '../../data/content';
import { LinkButton } from '../../components/common/Button';
import { DemoBadge } from '../../components/common/Badge';
import { FilterChips } from '../../components/common/Form';
import { ReviewCard, Stars } from '../../components/public/PublicBits';

const DIST = [
  [5, 92],
  [4, 6],
  [3, 1],
  [2, 1],
  [1, 0],
];

export default function Reviews() {
  const cfg = useConfig();
  const enabled = cfg.services.filter((s) => s.enabled);
  const [filter, setFilter] = useState('all');
  const list = REVIEWS.filter((r) => enabled.some((s) => s.id === r.service)).filter((r) => filter === 'all' || r.service === filter);
  return (
    <div className="bg-canvas">
      <section className="mx-auto max-w-7xl px-4 pb-10 pt-14 sm:px-6 md:pt-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_380px] lg:items-end">
          <div>
            <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-accent-ink">Reviews</p>
            <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-primary-ink md:text-5xl">What local homeowners say</h1>
            <p className="mt-3 text-lg text-muted">Real names have been replaced — these are fictional reviews for demonstration.</p>
            <DemoBadge className="mt-4">Demo customer feedback</DemoBadge>
          </div>
          <div className="card p-6">
            <div className="flex items-center gap-4">
              <span className="font-display text-6xl font-extrabold text-primary-ink">4.9</span>
              <div>
                <Stars size="size-5" />
                <p className="mt-1 text-sm text-muted">Average demo rating</p>
              </div>
            </div>
            <div className="mt-4 space-y-1.5">
              {DIST.map(([stars, pct]) => (
                <div key={stars} className="flex items-center gap-3 text-sm">
                  <span className="w-10 text-muted">{stars} ★</span>
                  <div className="h-2 flex-1 rounded-full bg-subtle">
                    <div className="h-2 rounded-full bg-warning" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="tabular w-10 text-right text-muted">{pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-10">
          <FilterChips label="Filter reviews by service" value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All services' }, ...enabled.map((s) => ({ value: s.id, label: s.name }))]} />
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-5 px-4 pb-16 sm:px-6 md:grid-cols-2 lg:grid-cols-3">
        {list.map((r) => (
          <ReviewCard key={r.id} review={r} />
        ))}
      </section>
      <section className="px-4 pb-20 text-center sm:px-6">
        <h2 className="font-display text-3xl font-extrabold text-primary-ink">Join them</h2>
        <LinkButton to="/quote" size="xl" className="mt-5" iconRight={<ArrowRight className="size-5" />}>
          Get an Instant Quote
        </LinkButton>
      </section>
    </div>
  );
}
