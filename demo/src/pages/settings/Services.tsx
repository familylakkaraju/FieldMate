import { useId, useState } from 'react';
import { ArrowDown, ArrowUp, ExternalLink, EyeOff, Globe, Info, Repeat } from 'lucide-react';
import type { ServiceConfig } from '../../types/domain';
import { useDemo } from '../../app/DemoProvider';
import { sortedServices } from '../../app/selectors';
import { SERVICE_ICON_OPTIONS } from '../../data/services';
import { serviceTone } from '../../theme/branding';
import { cx } from '../../utils/cx';
import { DraftInput, HexColorField, ServiceCardPreview, SettingsShell, usePublicPreview } from '../../components/settings/SettingsShell';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { TextArea, Toggle } from '../../components/common/Form';
import { ServiceIcon } from '../../components/common/ServiceIcon';
import { useToast } from '../../components/common/Toast';

const iconLabel = (name: string) => name.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
const WHOLE_POUNDS = /^\d{1,5}$/;

export default function Services() {
  const { state } = useDemo();
  const services = sortedServices(state.config);
  const enabledCount = services.filter((s) => s.enabled).length;
  const site = usePublicPreview();
  const [announce, setAnnounce] = useState('');

  return (
    <SettingsShell
      title="Services & Pricing"
      subtitle="Choose what you offer, how each service looks and the demo starting prices shown to customers."
      actions={
        <>
          <Button variant="outline" icon={<ExternalLink className="size-4" />} onClick={() => site.openNewTab('/services')}>
            Open in new tab
          </Button>
          <Button icon={<Globe className="size-4" />} onClick={() => site.view('/services')}>
            Preview public site
          </Button>
        </>
      }
    >
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>

      <div className="flex flex-col gap-3 rounded-card border border-info/30 bg-info-soft p-4 text-info-ink sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2.5 text-sm">
          <Info className="mt-0.5 size-4.5 shrink-0" aria-hidden />
          <span>
            <span className="font-semibold">Disabled services disappear from the public website, quote wizard and booking.</span> Existing jobs and customers are kept — nothing is deleted.
          </span>
        </p>
        <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-surface px-3 py-1 text-[13px] font-semibold text-ink shadow-sm sm:self-auto">
          <span className="size-2 rounded-full bg-success" aria-hidden />
          {enabledCount} of {services.length} services live
        </span>
      </div>

      <ol className="space-y-5">
        {services.map((svc, i) => (
          <li key={svc.id}>
            <ServiceEditor svc={svc} index={i} count={services.length} enabledCount={enabledCount} onAnnounce={setAnnounce} />
          </li>
        ))}
      </ol>
    </SettingsShell>
  );
}

function ServiceEditor({ svc, index, count, enabledCount, onAnnounce }: { svc: ServiceConfig; index: number; count: number; enabledCount: number; onAnnounce: (t: string) => void }) {
  const { actions } = useDemo();
  const toast = useToast();
  const iconLabelId = useId();
  const tone = serviceTone(svc.color);
  const update = (patch: Partial<ServiceConfig>) => actions.updateService(svc.id, patch);

  const toggle = () => {
    if (svc.enabled && enabledCount <= 1) {
      toast({ title: 'Keep at least one service live', description: 'Your website needs at least one bookable service. Enable another service first.', tone: 'warning' });
      return;
    }
    actions.toggleService(svc.id);
    toast(
      svc.enabled
        ? { title: `${svc.name} hidden from your website`, description: 'Removed from service cards, menus, the quote wizard and booking.', tone: 'info', action: { label: 'Check the website', to: '/' } }
        : { title: `${svc.name} is live`, description: 'Now shown on service cards, menus, the quote wizard and booking.', action: { label: 'Check the website', to: '/' } },
    );
  };

  const move = (dir: -1 | 1) => {
    actions.moveService(svc.id, dir);
    onAnnounce(`${svc.name} moved to position ${index + 1 + dir} of ${count}`);
  };

  return (
    <Card as="article" padded={false} className={cx('overflow-hidden transition', !svc.enabled && 'bg-canvas')}>
      {/* header */}
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 sm:px-5">
        <span className="tabular grid size-7 shrink-0 place-items-center rounded-lg bg-subtle text-xs font-bold text-ink-2" title="Sort order" aria-label={`Position ${index + 1}`}>
          {index + 1}
        </span>
        <span className={cx('grid size-10 shrink-0 place-items-center rounded-xl', !svc.enabled && 'grayscale')} style={{ background: tone.soft, color: tone.ink }}>
          <ServiceIcon name={svc.icon} className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-bold text-ink">{svc.name}</h3>
            <Badge tone={svc.enabled ? 'green' : 'gray'} dot>
              {svc.enabled ? 'Live' : 'Hidden'}
            </Badge>
          </div>
          <p className="text-xs text-muted">{svc.enabled ? 'Shown on the website, quote wizard and booking' : 'Hidden from the public website'}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => move(-1)}
            disabled={index === 0}
            aria-label={`Move ${svc.name} up`}
            title="Move up"
            className="grid size-9 place-items-center rounded-control border border-line text-ink-2 transition hover:bg-subtle hover:text-ink disabled:pointer-events-none disabled:opacity-40"
          >
            <ArrowUp className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            disabled={index === count - 1}
            aria-label={`Move ${svc.name} down`}
            title="Move down"
            className="grid size-9 place-items-center rounded-control border border-line text-ink-2 transition hover:bg-subtle hover:text-ink disabled:pointer-events-none disabled:opacity-40"
          >
            <ArrowDown className="size-4" aria-hidden />
          </button>
        </div>
        <div className="w-full border-t border-line pt-3 sm:w-auto sm:border-0 sm:pl-2 sm:pt-0">
          <Toggle checked={svc.enabled} onChange={toggle} label="Show on website" />
        </div>
      </div>

      {/* body */}
      <div className="grid gap-6 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="grid content-start gap-4 sm:grid-cols-2">
          <DraftInput label="Service name" value={svc.name} onCommit={(v) => update({ name: v })} error="Give the service a name" />
          <DraftInput label="Headline word" value={svc.heroWord} onCommit={(v) => update({ heroWord: v })} error="Add a word for the homepage headline" hint="Used in the homepage headline, e.g. “Gutters.”" />

          <div className="sm:col-span-2">
            <p id={iconLabelId} className="mb-1.5 text-sm font-semibold text-ink-2">
              Icon
            </p>
            <div role="radiogroup" aria-labelledby={iconLabelId} className="flex flex-wrap gap-1.5">
              {SERVICE_ICON_OPTIONS.map((ic) => {
                const sel = svc.icon === ic;
                return (
                  <button
                    key={ic}
                    type="button"
                    role="radio"
                    aria-checked={sel}
                    aria-label={iconLabel(ic)}
                    title={iconLabel(ic)}
                    onClick={() => update({ icon: ic })}
                    className={cx('grid size-10 place-items-center rounded-control border transition', sel ? 'border-transparent shadow-sm ring-2 ring-offset-1' : 'border-line bg-surface text-ink-2 hover:border-line-2 hover:bg-canvas')}
                    style={sel ? { background: tone.solid, color: tone.on, ['--tw-ring-color' as string]: tone.border } : undefined}
                  >
                    <ServiceIcon name={ic} className="size-[18px]" />
                  </button>
                );
              })}
            </div>
          </div>

          <HexColorField label="Accent colour" value={svc.color} onChange={(hex) => update({ color: hex })} hint="Icons, chips and calendar blocks." />
          <DraftInput label="Button text" value={svc.cta} onCommit={(v) => update({ cta: v })} error="Add the button text customers will tap" hint="The call to action on the service card." />

          <ServiceDescription svc={svc} onCommit={(v) => update({ description: v })} />

          <DraftInput
            label="Demo starting price"
            value={String(svc.startingPrice)}
            onCommit={(v) => update({ startingPrice: Number(v) })}
            isValid={(v) => WHOLE_POUNDS.test(v.trim())}
            error="Enter a whole number of pounds, e.g. 85"
            prefix="£"
            inputMode="numeric"
            hint="Shown as “from £…” on the website."
          />
          <DraftInput label="Price unit" value={svc.priceUnit} onCommit={(v) => update({ priceUnit: v })} error="Add a unit, e.g. visit or clean" prefix="/" hint="e.g. visit, clean, hour" />

          <div className="rounded-xl border border-line bg-canvas p-3.5 sm:col-span-2">
            <Toggle
              checked={svc.recurring}
              onChange={(v) => update({ recurring: v })}
              label="Offer recurring plans"
              description={
                <span className="inline-flex items-center gap-1">
                  <Repeat className="size-3.5" aria-hidden /> Customers can choose regular visits, e.g. every 4, 8 or 12 weeks.
                </span>
              }
            />
          </div>
        </div>

        {/* live public card */}
        <div className="min-w-0">
          <p className="mb-2 flex items-center justify-between gap-2 text-[12px] font-bold uppercase tracking-[0.12em] text-muted">
            Public card preview
            {!svc.enabled && (
              <span className="inline-flex items-center gap-1 normal-case tracking-normal text-warning-ink">
                <EyeOff className="size-3.5" aria-hidden /> Not shown
              </span>
            )}
          </p>
          <div className="relative">
            <ServiceCardPreview service={svc} className={cx(!svc.enabled && 'opacity-45 grayscale')} />
            {!svc.enabled && (
              <div className="absolute inset-0 grid place-items-center p-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-[13px] font-semibold text-ink shadow-raised">
                  <EyeOff className="size-4 text-muted" aria-hidden /> Hidden from website
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function ServiceDescription({ svc, onCommit }: { svc: ServiceConfig; onCommit: (v: string) => void }) {
  const [draft, setDraft] = useState(svc.description);
  const [synced, setSynced] = useState(svc.description);
  if (synced !== svc.description) {
    // external change (e.g. demo reset) — adopt it
    setSynced(svc.description);
    setDraft(svc.description);
  }
  return (
    <TextArea
      label="Short description"
      className="sm:col-span-2"
      rows={2}
      maxLength={120}
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value);
        setSynced(e.target.value);
        onCommit(e.target.value);
      }}
      hint={`${draft.length}/120 · Shown under the service name on cards and menus.`}
    />
  );
}
