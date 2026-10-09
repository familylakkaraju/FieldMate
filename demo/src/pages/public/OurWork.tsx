import { useState } from 'react';
import { ArrowRight, Images, MapPin } from 'lucide-react';
import { useConfig } from '../../app/DemoProvider';
import { GALLERY, type GalleryItem } from '../../data/content';
import { LinkButton } from '../../components/common/Button';
import { FilterChips } from '../../components/common/Form';
import { Modal } from '../../components/common/Modal';
import { ServiceBadge } from '../../components/common/Badge';
import { BeforeAfterSlider } from '../../components/public/PublicBits';
import { asset } from '../../utils/cx';

export default function OurWork() {
  const cfg = useConfig();
  const enabled = cfg.services.filter((s) => s.enabled);
  const [filter, setFilter] = useState<string>('all');
  const [open, setOpen] = useState<GalleryItem | null>(null);
  const items = GALLERY.filter((g) => enabled.some((s) => s.id === g.service)).filter((g) => filter === 'all' || g.service === filter);

  return (
    <div className="bg-canvas">
      <section className="px-4 pb-8 pt-14 sm:px-6 md:pt-20">
        <div className="mx-auto max-w-7xl">
          <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-accent-ink">Our work</p>
          <h1 className="mt-2 max-w-3xl font-display text-4xl font-extrabold tracking-tight text-primary-ink md:text-5xl">Recent jobs across Essex</h1>
          <p className="mt-3 max-w-2xl text-lg text-muted">Every job is photographed before and after. Tap a photo to compare.</p>
          <div className="mt-6">
            <FilterChips
              label="Filter by service"
              value={filter}
              onChange={setFilter}
              options={[{ value: 'all', label: 'All work', count: GALLERY.filter((g) => enabled.some((s) => s.id === g.service)).length }, ...enabled.map((s) => ({ value: s.id, label: s.name, count: GALLERY.filter((g) => g.service === s.id).length }))]}
            />
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-5 px-4 pb-20 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
        {items.map((g) => (
          <button key={g.id} type="button" onClick={() => setOpen(g)} className="group overflow-hidden rounded-card border border-line bg-surface text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-float">
            <div className="relative aspect-[4/3] overflow-hidden">
              <img src={asset(g.image)} alt={g.title} loading="lazy" className="size-full object-cover transition duration-500 group-hover:scale-[1.04]" />
              {g.before && <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-bold text-white"><Images className="size-3.5" aria-hidden /> Before / after</span>}
            </div>
            <div className="p-5">
              <ServiceBadge service={g.service} />
              <p className="mt-3 text-lg font-bold text-ink">{g.title}</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                <MapPin className="size-3.5" aria-hidden /> {g.location}
              </p>
              <p className="mt-2 text-sm text-ink-2">{g.outcome}</p>
            </div>
          </button>
        ))}
      </section>
      <section className="px-4 pb-20 text-center sm:px-6">
        <LinkButton to="/quote" size="xl" iconRight={<ArrowRight className="size-5" />}>
          Get a quote for your home
        </LinkButton>
      </section>
      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.title ?? ''} description={open ? `${open.location} · ${open.outcome}` : ''} size="lg">
        {open &&
          (open.before ? (
            <BeforeAfterSlider before={open.before} after={open.image} alt={open.title} className="aspect-[4/3] w-full" />
          ) : (
            <img src={asset(open.image)} alt={open.title} className="w-full rounded-card object-cover" />
          ))}
      </Modal>
    </div>
  );
}
