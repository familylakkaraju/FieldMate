import { useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  CalendarCheck,
  Check,
  CheckCircle2,
  ExternalLink,
  FileText,
  Globe,
  ImageUp,
  LayoutTemplate,
  Lock,
  MapPin,
  Menu,
  Palette,
  Phone,
  Pipette,
  RotateCcw,
  Shapes,
  ShieldCheck,
  Signal,
  Sparkles,
  Star,
  Trash2,
  TriangleAlert,
  Type,
  Upload,
  WandSparkles,
} from 'lucide-react';
import type { BrandingSettings, FontPreset, HeroStyle, RadiusPreset } from '../../types/domain';
import { useDemo } from '../../app/DemoProvider';
import { enabledServices } from '../../app/selectors';
import { BRAND_PRESETS, DEFAULT_COMPANY, EXAMPLE_REBRAND, FONT_PRESETS, LOGO_MARKS, RADIUS_PRESETS } from '../../data/brand';
import { contrast, solidPair } from '../../theme/branding';
import { asset, cx } from '../../utils/cx';
import { DraftInput, HexColorField, ServiceCardPreview, SettingsShell, usePublicPreview } from '../../components/settings/SettingsShell';
import { Card, CardHeader } from '../../components/common/Card';
import { Badge, StatusBadge } from '../../components/common/Badge';
import { Toggle } from '../../components/common/Form';
import { BrandMark, FieldMateMark, Logo } from '../../components/common/Logo';
import { ServiceIcon } from '../../components/common/ServiceIcon';
import { useToast } from '../../components/common/Toast';

const HERO_IMG = 'assets/hero/hero-window-cleaner-sm.webp';
const MAX_LOGO_BYTES = 400 * 1024;

type ColorKey = 'primaryColor' | 'secondaryColor' | 'accentColor';
const COLOR_ROWS: { key: ColorKey; label: string; hint: string; use: string }[] = [
  { key: 'primaryColor', label: 'Primary colour', hint: 'Header, hero, footer and portal sidebar.', use: 'Header' },
  { key: 'secondaryColor', label: 'Secondary colour', hint: 'Main buttons and links — your call to action.', use: 'Button' },
  { key: 'accentColor', label: 'Accent colour', hint: 'Highlights, badges and icons.', use: 'Badge' },
];

const HERO_OPTIONS: { id: HeroStyle; label: string; text: string }[] = [
  { id: 'image', label: 'Photo', text: 'Full-width photo with a brand overlay' },
  { id: 'split', label: 'Split', text: 'Headline beside a photo on a light background' },
  { id: 'solid', label: 'Solid colour', text: 'Bold brand colour with service tiles' },
];

const RADIUS_TEXT: Record<RadiusPreset, string> = {
  sharp: 'Crisp, technical corners',
  rounded: 'Friendly, modern default',
  soft: 'Pill buttons, soft cards',
};

const optionCls = (selected: boolean) =>
  cx('relative rounded-xl border text-left transition', selected ? 'border-secondary-solid bg-secondary-soft/50 ring-2 ring-secondary/25' : 'border-line bg-surface hover:border-line-2 hover:bg-canvas');

function Tick() {
  return (
    <span className="absolute right-2 top-2 grid size-5 place-items-center rounded-full bg-secondary-solid text-secondary-on shadow-sm" aria-hidden>
      <Check className="size-3.5" strokeWidth={3} />
    </span>
  );
}

export default function Branding() {
  const { state, actions } = useDemo();
  const { company, branding } = state.config;
  const toast = useToast();
  const site = usePublicPreview();
  const fileRef = useRef<HTMLInputElement>(null);
  const [announce, setAnnounce] = useState('');

  const isExample = company.companyName === EXAMPLE_REBRAND.companyName && branding.presetId === EXAMPLE_REBRAND.presetId;
  const isClearFlow = company.companyName === DEFAULT_COMPANY.companyName && branding.presetId === 'clearflow';
  const activePreset = BRAND_PRESETS.find((p) => p.id === branding.presetId);

  const tryExample = () => {
    actions.applyExampleRebrand();
    setAnnounce(`Rebranded to ${EXAMPLE_REBRAND.companyName}`);
    toast({
      title: `Rebranded to ${EXAMPLE_REBRAND.companyName}`,
      description: 'Trade Navy colours, shield logo, clean type and sharp corners — applied everywhere.',
      action: { label: 'View public website', to: '/' },
    });
  };

  const restore = () => {
    actions.updateCompany({ companyName: DEFAULT_COMPANY.companyName, tagline: DEFAULT_COMPANY.tagline, phone: DEFAULT_COMPANY.phone, email: DEFAULT_COMPANY.email });
    actions.applyPreset('clearflow');
    actions.updateBranding({ heroStyle: 'image', showPoweredByFieldMate: true });
    setAnnounce('ClearFlow branding restored');
    toast({ title: 'ClearFlow branding restored', description: 'Name, colours, logo, fonts and hero are back to the original demo brand.' });
  };

  const applyPreset = (id: string, name: string) => {
    actions.applyPreset(id);
    setAnnounce(`${name} preset applied`);
  };

  const setColor = (key: ColorKey, hex: string) => {
    const patch: Partial<BrandingSettings> = {};
    patch[key] = hex;
    actions.updateBranding(patch);
  };

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'That file isn’t an image', description: 'Upload a PNG, SVG, JPG or WebP logo.', tone: 'warning' });
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast({ title: 'Logo is too large', description: `That file is ${Math.round(file.size / 1024)} KB. Please upload an image under 400 KB.`, tone: 'warning' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      actions.updateBranding({ logoMark: 'custom', logoDataUrl: reader.result });
      toast({ title: 'Logo uploaded', description: 'Your logo now appears on the website, portals and apps.' });
    };
    reader.onerror = () => toast({ title: 'Couldn’t read that file', description: 'Try a different image.', tone: 'warning' });
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    actions.updateBranding({ logoMark: activePreset?.branding.logoMark ?? 'clearflow', logoDataUrl: undefined });
    toast({ title: 'Uploaded logo removed', tone: 'info' });
  };

  const togglePoweredBy = (v: boolean) => {
    actions.updateBranding({ showPoweredByFieldMate: v });
    toast({
      title: v ? '“Powered by FieldMate” shown' : 'Fully white-labelled',
      description: v ? 'A small FieldMate credit appears in the footer and portal sidebar.' : `Customers now only see ${company.companyName}.`,
      tone: 'info',
    });
  };

  return (
    <SettingsShell
      title="Branding"
      subtitle="Make FieldMate look and feel like your business. Every change applies instantly to your website, office portal, worker app and customer portal."
      actions={
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1.5 text-[13px] font-semibold text-success-ink">
          <CheckCircle2 className="size-4" aria-hidden /> Changes save automatically
        </span>
      }
    >
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>

      {/* ------------------------------------------------------------ one-click rebrand */}
      <section aria-labelledby="rebrand-title" className="relative overflow-hidden rounded-card bg-gradient-to-br from-primary-solid to-primary-deep p-5 text-white shadow-raised sm:p-6">
        <div className="absolute -right-16 -top-24 size-64 rounded-full bg-secondary opacity-30 blur-3xl" aria-hidden />
        <div className="absolute -bottom-28 left-1/4 size-64 rounded-full bg-accent opacity-20 blur-3xl" aria-hidden />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-white/70">
              <WandSparkles className="size-4" aria-hidden /> Live rebrand
            </p>
            <h2 id="rebrand-title" className="mt-1.5 text-xl font-extrabold tracking-tight text-white sm:text-2xl">
              Show the client their brand in seconds
            </h2>
            <p className="mt-1 text-sm text-white/80">One click rebrands the website, office portal, worker app and customer portal — then open the public site to show it off.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-end">
            <button
              type="button"
              onClick={tryExample}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-white px-4 py-2 text-left text-sm font-bold text-primary-ink shadow-sm transition hover:bg-white/90 active:scale-[0.98]"
            >
              {isExample ? <CheckCircle2 className="size-4.5 shrink-0 text-success" aria-hidden /> : <Sparkles className="size-4.5 shrink-0" aria-hidden />}
              <span>Try example: ABC Plumbing &amp; Exterior Cleaning</span>
            </button>
            <button
              type="button"
              onClick={restore}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-4 py-2 text-sm font-bold text-white ring-1 ring-inset ring-white/35 transition hover:bg-white/10 active:scale-[0.98]"
            >
              {isClearFlow ? <CheckCircle2 className="size-4.5 shrink-0 text-accent-tint" aria-hidden /> : <RotateCcw className="size-4.5 shrink-0" aria-hidden />}
              Restore ClearFlow
            </button>
          </div>
        </div>
        <div className="relative mt-5 flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-white/15 pt-4">
          <button
            type="button"
            onClick={() => site.view('/')}
            className="inline-flex h-10 items-center gap-2 rounded-control bg-secondary-solid px-4 text-sm font-semibold text-secondary-on shadow-sm transition hover:brightness-110 active:scale-[0.98]"
          >
            <Globe className="size-4" aria-hidden /> View public website
          </button>
          <button type="button" onClick={() => site.openNewTab('/')} className="inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-white/85 underline-offset-4 hover:text-white hover:underline">
            Open in new tab <ExternalLink className="size-3.5" aria-hidden />
          </button>
          <p className="text-xs text-white/60 lg:ml-auto">
            Now showing: <span className="font-semibold text-white/90">{company.companyName}</span> · {activePreset ? activePreset.name : 'Custom palette'}
          </p>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2 2xl:grid-cols-[minmax(0,1fr)_minmax(0,600px)]">
        {/* ------------------------------------------------------------ controls */}
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader
              title="Brand presets"
              subtitle="Start from a professionally paired palette, then fine-tune below."
              icon={Palette}
              action={branding.presetId === 'custom' ? <Badge tone="violet">Custom palette</Badge> : undefined}
            />
            <div role="radiogroup" aria-label="Brand presets" className="grid gap-3 sm:grid-cols-2">
              {BRAND_PRESETS.map((p) => {
                const sel = branding.presetId === p.id;
                const b = p.branding;
                return (
                  <button key={p.id} type="button" role="radio" aria-checked={sel} onClick={() => applyPreset(p.id, p.name)} className={cx(optionCls(sel), 'flex items-start gap-3 p-3.5 pr-8')}>
                    <BrandMark mark={b.logoMark} primary={b.primaryColor} accent={b.secondaryColor} size={42} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-ink">{p.name}</span>
                      <span className="mt-0.5 block text-[12px] leading-snug text-muted">{p.description}</span>
                      <span className="mt-2.5 flex items-center gap-2">
                        <span className="flex -space-x-1.5" aria-hidden>
                          {[b.primaryColor, b.secondaryColor, b.accentColor].map((c, i) => (
                            <span key={i} className="size-5 rounded-full shadow-sm ring-2 ring-white" style={{ background: c }} />
                          ))}
                        </span>
                        <span className="truncate text-[11px] font-medium text-muted">
                          {FONT_PRESETS[b.fontPreset].sample} · {RADIUS_PRESETS[b.borderRadiusPreset].label}
                        </span>
                      </span>
                    </span>
                    {sel && <Tick />}
                  </button>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardHeader title="Name & logo" subtitle="Pick a mark drawn in your colours, or upload your own logo." icon={ImageUp} />
            <DraftInput
              label="Company name"
              value={company.companyName}
              onCommit={(v) => actions.updateCompany({ companyName: v })}
              error="Your company name can’t be empty"
              hint="Shown in the header, browser tab, emails, quotes and invoices."
              autoComplete="organization"
            />
            <p id="logo-mark-label" className="mb-2 mt-5 text-sm font-semibold text-ink-2">
              Logo mark
            </p>
            <div role="radiogroup" aria-labelledby="logo-mark-label" className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
              {LOGO_MARKS.map((m) => {
                const sel = branding.logoMark === m.id;
                return (
                  <button key={m.id} type="button" role="radio" aria-checked={sel} onClick={() => actions.updateBranding({ logoMark: m.id })} className={cx(optionCls(sel), 'flex flex-col items-center gap-1.5 px-1.5 py-3')}>
                    <BrandMark mark={m.id} primary={branding.primaryColor} accent={branding.secondaryColor} size={40} />
                    <span className="text-center text-[11px] font-semibold leading-tight text-ink-2">{m.label}</span>
                    {sel && <Tick />}
                  </button>
                );
              })}
              {branding.logoDataUrl && (
                <button
                  type="button"
                  role="radio"
                  aria-checked={branding.logoMark === 'custom'}
                  onClick={() => actions.updateBranding({ logoMark: 'custom' })}
                  className={cx(optionCls(branding.logoMark === 'custom'), 'flex flex-col items-center gap-1.5 px-1.5 py-3')}
                >
                  <BrandMark mark="custom" dataUrl={branding.logoDataUrl} primary={branding.primaryColor} accent={branding.secondaryColor} size={40} />
                  <span className="text-center text-[11px] font-semibold leading-tight text-ink-2">Your logo</span>
                  {branding.logoMark === 'custom' && <Tick />}
                </button>
              )}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-line-2 px-1.5 py-3 text-[11px] font-semibold text-ink-2 transition hover:border-secondary hover:bg-secondary-soft hover:text-secondary-ink"
              >
                <span className="grid size-10 place-items-center rounded-[11px] bg-subtle">
                  <Upload className="size-5" aria-hidden />
                </span>
                {branding.logoDataUrl ? 'Replace logo' : 'Upload logo'}
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="sr-only" tabIndex={-1} aria-hidden />
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[12px] text-muted">
              <span>PNG, SVG, JPG or WebP up to 400 KB. Square logos work best.</span>
              {branding.logoDataUrl && (
                <button type="button" onClick={removeLogo} className="inline-flex items-center gap-1 font-semibold text-danger-ink hover:underline">
                  <Trash2 className="size-3.5" aria-hidden /> Remove uploaded logo
                </button>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Colours" subtitle="Text and button contrast is checked and adjusted automatically." icon={Pipette} />
            <div className="divide-y divide-line">
              {COLOR_ROWS.map((row) => (
                <div key={row.key} className="grid gap-3 py-4 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:items-center">
                  <HexColorField label={row.label} hint={row.hint} value={branding[row.key]} onChange={(hex) => setColor(row.key, hex)} />
                  <ContrastNote color={branding[row.key]} use={row.use} />
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Typography" subtitle="Headings and body text across every screen." icon={Type} />
            <div role="radiogroup" aria-label="Font preset" className="grid gap-2.5 sm:grid-cols-2">
              {(Object.keys(FONT_PRESETS) as FontPreset[]).map((k) => {
                const f = FONT_PRESETS[k];
                const sel = branding.fontPreset === k;
                return (
                  <button key={k} type="button" role="radio" aria-checked={sel} onClick={() => actions.updateBranding({ fontPreset: k })} className={cx(optionCls(sel), 'p-3.5 pr-8')}>
                    <span className="flex items-baseline gap-3" style={{ fontFamily: f.display }}>
                      <span className="text-[30px] font-extrabold leading-none tracking-tight text-primary-ink">Aa</span>
                      <span className="min-w-0 text-[13px] font-bold leading-snug text-ink">Plumbing. Gutters. Windows.</span>
                    </span>
                    <span className="mt-2 block text-[12px] font-medium text-muted" style={{ fontFamily: f.body }}>
                      {f.label}
                    </span>
                    {sel && <Tick />}
                  </button>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardHeader title="Corner style" subtitle="Cards, buttons and inputs." icon={Shapes} />
            <div role="radiogroup" aria-label="Border radius" className="grid grid-cols-3 gap-2.5">
              {(Object.keys(RADIUS_PRESETS) as RadiusPreset[]).map((k) => {
                const r = RADIUS_PRESETS[k];
                const sel = branding.borderRadiusPreset === k;
                const mini = (v: string) => `${Math.round(parseInt(v, 10) * 0.6)}px`;
                return (
                  <button key={k} type="button" role="radio" aria-checked={sel} onClick={() => actions.updateBranding({ borderRadiusPreset: k })} className={cx(optionCls(sel), 'p-2.5')}>
                    <span className="grid h-16 place-items-center rounded-lg bg-canvas" aria-hidden>
                      <span className="block w-[72%] max-w-24 border border-line-2 bg-surface p-1.5 shadow-sm" style={{ borderRadius: mini(r.card) }}>
                        <span className="block h-1.5 w-2/3 rounded-full bg-line-2" />
                        <span className="mt-1.5 block h-3.5 w-full bg-secondary-solid" style={{ borderRadius: mini(r.control) }} />
                      </span>
                    </span>
                    <span className="mt-2 block text-sm font-bold text-ink">{r.label}</span>
                    <span className="block text-[11px] leading-snug text-muted">{RADIUS_TEXT[k]}</span>
                    {sel && <Tick />}
                  </button>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardHeader title="Homepage hero" subtitle="The first thing customers see on your website." icon={LayoutTemplate} />
            <div role="radiogroup" aria-label="Hero style" className="grid gap-2.5 sm:grid-cols-3">
              {HERO_OPTIONS.map((h) => {
                const sel = branding.heroStyle === h.id;
                return (
                  <button key={h.id} type="button" role="radio" aria-checked={sel} onClick={() => actions.updateBranding({ heroStyle: h.id })} className={cx(optionCls(sel), 'p-2.5')}>
                    <span className="block aspect-[16/10] overflow-hidden rounded-lg border border-line" aria-hidden>
                      <HeroThumb style={h.id} />
                    </span>
                    <span className="mt-2 block text-sm font-bold text-ink">{h.label}</span>
                    <span className="block text-[11px] leading-snug text-muted">{h.text}</span>
                    {sel && <Tick />}
                  </button>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardHeader title="White label" subtitle="Decide whether customers see any FieldMate branding." icon={BadgeCheck} />
            <Toggle checked={branding.showPoweredByFieldMate} onChange={togglePoweredBy} label="Show “Powered by FieldMate”" description="A small credit in the website footer and the portal sidebar." />
            <p className={cx('mt-3 flex items-start gap-2 rounded-xl p-3 text-[13px]', branding.showPoweredByFieldMate ? 'bg-subtle text-ink-2' : 'bg-success-soft text-success-ink')}>
              {branding.showPoweredByFieldMate ? (
                <>
                  <FieldMateMark className="shrink-0 text-[13px]" />
                  <span>credit is visible. Turn it off for a fully white-labelled experience.</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <span>Fully white-labelled — customers only ever see {company.companyName}.</span>
                </>
              )}
            </p>
          </Card>
        </div>

        {/* ------------------------------------------------------------ live preview */}
        <aside aria-label="Live preview" className="order-first min-w-0 xl:order-none">
          <div className="space-y-4 xl:sticky xl:top-20 xl:-mx-2 xl:max-h-[calc(100dvh-6rem)] xl:overflow-y-auto xl:px-2 xl:pb-3">
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-sm font-bold text-ink">
                <span className="relative flex size-2.5" aria-hidden>
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-success" />
                </span>
                Live preview
              </p>
              <button type="button" onClick={() => site.view('/')} className="inline-flex items-center gap-1 text-[13px] font-semibold text-secondary-ink hover:underline">
                Open full website <ArrowUpRight className="size-3.5" aria-hidden />
              </button>
            </div>
            <SitePreview />
            <div className="hidden gap-4 sm:grid sm:grid-cols-[auto_minmax(0,1fr)]">
              <MobilePreview />
              <BrandKit />
            </div>
          </div>
        </aside>
      </div>
    </SettingsShell>
  );
}

// ------------------------------------------------------------------ contrast readout
function ContrastNote({ color, use }: { color: string; use: string }) {
  const { solid, on } = solidPair(color);
  const ratio = contrast(solid, on);
  const adjusted = solid.toLowerCase() !== color.toLowerCase();
  const pass = ratio >= 4.5;
  const level = ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'large text only' : 'low';
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[13px]">
      <span className="inline-flex h-7 items-center rounded-control px-2.5 text-xs font-bold shadow-sm" style={{ background: solid, color: on }}>
        {use}
      </span>
      <span className={cx('inline-flex items-center gap-1 font-semibold', pass ? 'text-success-ink' : 'text-warning-ink')}>
        {pass ? <CheckCircle2 className="size-4" aria-hidden /> : <TriangleAlert className="size-4" aria-hidden />}
        {use} text {ratio.toFixed(1)}:1 · {level}
      </span>
      {adjusted && (
        <span className="inline-flex items-center gap-1.5 text-muted">
          <span className="flex" aria-hidden>
            <span className="size-3.5 rounded-l-sm" style={{ background: color }} />
            <span className="size-3.5 rounded-r-sm" style={{ background: solid }} />
          </span>
          auto-adjusted for accessibility
        </span>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ hero thumbnails
function HeroThumb({ style }: { style: HeroStyle }) {
  const bars = (dark: boolean) => (
    <span className="block space-y-1">
      <span className={cx('block h-1.5 w-14 rounded-full', dark ? 'bg-white' : 'bg-primary')} />
      <span className={cx('block h-1.5 w-10 rounded-full', dark ? 'bg-accent-tint' : 'bg-accent')} />
      <span className={cx('block h-1 w-12 rounded-full opacity-60', dark ? 'bg-white' : 'bg-muted')} />
      <span className="flex gap-1 pt-1">
        <span className="block h-2.5 w-7 rounded-[3px] bg-secondary-solid" />
        <span className={cx('block h-2.5 w-6 rounded-[3px]', dark ? 'bg-white' : 'bg-primary-solid')} />
      </span>
    </span>
  );
  if (style === 'split') {
    return (
      <span className="grid size-full grid-cols-[1.2fr_1fr] items-center gap-2 bg-gradient-to-b from-primary-soft to-surface p-2.5">
        {bars(false)}
        <img src={asset(HERO_IMG)} alt="" className="h-full max-h-[70%] w-full rounded-md object-cover shadow-sm" />
      </span>
    );
  }
  if (style === 'solid') {
    return (
      <span className="relative block size-full overflow-hidden bg-primary-solid p-2.5">
        <span className="absolute inset-0 opacity-[0.12] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:8px_8px]" />
        <span className="absolute -right-6 -top-6 size-16 rounded-full bg-secondary opacity-40 blur-lg" />
        <span className="relative grid h-full grid-cols-[1.3fr_1fr] items-center gap-2">
          {bars(true)}
          <span className="grid grid-cols-2 gap-1">
            <span className="col-span-2 block h-5 rounded-[3px] bg-white/30" />
            <span className="block h-4 rounded-[3px] bg-white/20" />
            <span className="block h-4 rounded-[3px] bg-white/20" />
          </span>
        </span>
      </span>
    );
  }
  return (
    <span className="relative isolate flex size-full items-center overflow-hidden bg-primary-deep p-2.5">
      <img src={asset(HERO_IMG)} alt="" className="absolute inset-0 -z-10 size-full -scale-x-100 object-cover" />
      <span className="absolute inset-0 -z-10 bg-gradient-to-r from-primary-deep via-primary-deep/75 to-primary-deep/0" />
      {bars(true)}
    </span>
  );
}

// ------------------------------------------------------------------ desktop website preview
function SitePreview() {
  const { state } = useDemo();
  const { company, branding } = state.config;
  const services = enabledServices(state.config);
  const first = services[0];
  const headline = services.map((s) => s.heroWord).join(' ');
  const slug = company.companyName.split(/\s+/).slice(0, 2).join('').toLowerCase().replace(/[^a-z0-9]/g, '') || 'yourbusiness';
  const style = branding.heroStyle;
  const dark = style !== 'split';

  const heroText = (
    <div className="relative min-w-0">
      <p className={cx('mb-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold', dark ? 'bg-white/12 text-white ring-1 ring-white/20' : 'bg-accent-soft text-accent-ink')}>
        <MapPin className="size-3" aria-hidden /> Trusted home services across {company.region}
      </p>
      <p className={cx('font-display text-[18px] font-extrabold leading-[1.08] tracking-tight sm:text-[22px]', dark ? 'text-white' : 'text-primary-ink')}>
        <span className="block">{headline}</span>
        <span className={cx('block', dark ? 'text-accent-tint' : 'text-accent-ink')}>One trusted local team.</span>
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="inline-flex h-8 items-center gap-1.5 rounded-control bg-secondary-solid px-3 text-[11px] font-bold text-secondary-on shadow-sm">
          Get an Instant Quote <ArrowRight className="size-3.5" aria-hidden />
        </span>
        <span className={cx('inline-flex h-8 items-center gap-1.5 rounded-control px-3 text-[11px] font-bold shadow-sm', dark ? 'bg-white text-primary-ink' : 'bg-primary-solid text-primary-on')}>
          <CalendarCheck className="size-3.5" aria-hidden /> Book a Service
        </span>
      </div>
      <p className={cx('mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-medium', dark ? 'text-white/85' : 'text-ink-2')}>
        <span className="inline-flex items-center gap-1">
          <Star className="size-3 fill-warning text-warning" aria-hidden /> 4.9 rating
        </span>
        <span className="inline-flex items-center gap-1">
          <ShieldCheck className={cx('size-3', dark ? 'text-accent-tint' : 'text-accent-ink')} aria-hidden /> Fully insured
        </span>
      </p>
    </div>
  );

  let hero: ReactNode;
  if (style === 'split') {
    hero = (
      <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] items-center gap-3 bg-gradient-to-b from-primary-soft to-surface p-4">
        {heroText}
        <img src={asset(HERO_IMG)} alt="" className="aspect-[4/5] w-full rounded-card object-cover shadow-raised" />
      </div>
    );
  } else if (style === 'solid') {
    hero = (
      <div className="relative overflow-hidden bg-primary-solid p-4">
        <div className="absolute inset-0 opacity-[0.08] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:16px_16px]" aria-hidden />
        <div className="absolute -right-16 -top-16 size-48 rounded-full bg-secondary opacity-25 blur-2xl" aria-hidden />
        <div className="relative grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] items-center gap-3">
          {heroText}
          <div className="grid grid-cols-2 gap-1.5">
            {services.slice(0, 3).map((s, i) => (
              <img key={s.id} src={asset(s.image)} alt="" className={cx('w-full rounded-[calc(var(--brand-radius-card)*0.5)] object-cover shadow-raised', i === 0 ? 'col-span-2 aspect-[16/9]' : 'aspect-square')} />
            ))}
          </div>
        </div>
      </div>
    );
  } else {
    hero = (
      <div className="relative isolate overflow-hidden bg-primary-deep px-4 py-5">
        <img src={asset(HERO_IMG)} alt="" className="absolute inset-0 -z-10 size-full -scale-x-100 object-cover object-[0%_30%]" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-primary-deep via-primary-deep/80 to-primary-deep/0" aria-hidden />
        <div className="max-w-[80%]">{heroText}</div>
      </div>
    );
  }

  return (
    <figure aria-label={`Preview of the ${company.companyName} website`} className="overflow-hidden rounded-card border border-line bg-surface shadow-float">
      {/* browser chrome */}
      <div className="flex items-center gap-3 border-b border-line bg-subtle px-3 py-2" aria-hidden>
        <span className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-[#FF5F57]" />
          <span className="size-2.5 rounded-full bg-[#FEBC2E]" />
          <span className="size-2.5 rounded-full bg-[#28C840]" />
        </span>
        <span className="flex h-6 min-w-0 flex-1 items-center gap-1.5 rounded-md bg-surface px-2.5 text-[11px] text-muted ring-1 ring-line">
          <Lock className="size-3 shrink-0" />
          <span className="truncate">www.{slug}.co.uk</span>
        </span>
      </div>

      {/* site header */}
      <div className="flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-2.5">
        <Logo size={30} className="min-w-0" />
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden text-[11px] font-semibold text-ink-2 md:inline xl:hidden 2xl:inline">Services</span>
          <span className="hidden text-[11px] font-semibold text-ink-2 md:inline xl:hidden 2xl:inline">Our work</span>
          <span className="inline-flex h-7 items-center rounded-control bg-secondary-solid px-2.5 text-[11px] font-bold text-secondary-on shadow-sm">Get a Quote</span>
        </div>
      </div>

      {hero}

      {/* body: service card + portal bits */}
      <div className="grid gap-3 bg-canvas p-3 sm:grid-cols-2 sm:p-4">
        <div className="min-w-0">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-accent-ink">Our services</p>
          {first && <ServiceCardPreview service={first} />}
        </div>
        <div className="min-w-0 space-y-3">
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-accent-ink">Customer portal</p>
            <div className="rounded-card border border-line bg-surface p-3 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-bold text-ink">{first?.name ?? 'Your job'}</p>
                  <p className="text-[10px] text-muted">Thu 10:00 · Maya assigned</p>
                </div>
                <StatusBadge kind="job" status="scheduled" className="h-5 px-2 text-[10px]" />
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-subtle" aria-hidden>
                <div className="h-full w-2/3 rounded-full bg-secondary" />
              </div>
              <p className="mt-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-accent-ink">
                <span className="size-1.5 rounded-full bg-accent" aria-hidden /> On the way · arriving 10:25
              </p>
            </div>
          </div>
          <div className="rounded-card border border-line bg-surface p-3 shadow-card">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Status badges</p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              <StatusBadge kind="job" status="in-progress" className="h-5 px-2 text-[10px]" />
              <StatusBadge kind="job" status="completed" className="h-5 px-2 text-[10px]" />
              <StatusBadge kind="quote" status="accepted" className="h-5 px-2 text-[10px]" />
              <StatusBadge kind="invoice" status="paid" className="h-5 px-2 text-[10px]" />
              <Badge tone="brand" dot className="h-5 px-2 text-[10px]">
                New lead
              </Badge>
            </div>
            <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-muted">Buttons</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <span className="inline-flex h-7 items-center rounded-control bg-primary-solid px-2.5 text-[11px] font-bold text-primary-on">Primary</span>
              <span className="inline-flex h-7 items-center rounded-control bg-secondary-solid px-2.5 text-[11px] font-bold text-secondary-on">Secondary</span>
              <span className="inline-flex h-7 items-center rounded-control bg-accent-solid px-2.5 text-[11px] font-bold text-accent-on">Accent</span>
              <span className="inline-flex h-7 items-center rounded-control border border-line-2 bg-surface px-2.5 text-[11px] font-bold text-ink">Outline</span>
            </div>
          </div>
        </div>
      </div>

      {/* footer */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 bg-primary-deep px-4 py-3 text-[10px] text-white/70">
        <span className="flex min-w-0 items-center gap-2">
          <BrandMark mark={branding.logoMark} primary="rgba(255,255,255,0.14)" accent={branding.secondaryColor} dataUrl={branding.logoDataUrl} size={20} />
          <span className="truncate">
            © 2026 {company.companyName} · {company.phone}
          </span>
        </span>
        {branding.showPoweredByFieldMate && (
          <span className="inline-flex items-center gap-1">
            Powered by <FieldMateMark light className="text-[10px]" />
          </span>
        )}
      </div>
    </figure>
  );
}

// ------------------------------------------------------------------ mobile preview strip
function MobilePreview() {
  const { state } = useDemo();
  const { company, branding } = state.config;
  const services = enabledServices(state.config);
  const headline = services.map((s) => s.heroWord).join(' ');
  const style = branding.heroStyle;
  const dark = style !== 'split';
  return (
    <figure aria-label="Mobile website preview" className="mx-auto w-[228px] shrink-0">
      <div className="overflow-hidden rounded-[30px] border-[6px] border-[#0B1320] bg-surface shadow-float">
        <div className="flex items-center justify-between bg-surface px-4 pb-1 pt-1.5 text-[9px] font-bold text-ink" aria-hidden>
          <span>9:41</span>
          <span className="h-3.5 w-12 rounded-full bg-[#0B1320]" />
          <span className="flex items-center gap-0.5">
            <Signal className="size-2.5" /> 5G
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
          <span className="flex min-w-0 items-center gap-1.5">
            <BrandMark mark={branding.logoMark} primary={branding.primaryColor} accent={branding.secondaryColor} dataUrl={branding.logoDataUrl} size={24} />
            <span className="truncate font-display text-[11px] font-extrabold text-primary-ink">{company.companyName}</span>
          </span>
          <span className="flex shrink-0 items-center gap-1 text-primary-ink" aria-hidden>
            <span className="grid size-6 place-items-center rounded-control border border-line-2">
              <Phone className="size-3" />
            </span>
            <Menu className="size-4 text-ink" />
          </span>
        </div>
        <div
          className={cx(
            'relative isolate overflow-hidden px-3 py-4',
            style === 'image' ? 'bg-primary-deep' : style === 'solid' ? 'bg-primary-solid' : 'bg-gradient-to-b from-primary-soft to-surface',
          )}
        >
          {style === 'image' && (
            <>
              <img src={asset(HERO_IMG)} alt="" className="absolute inset-0 -z-10 size-full -scale-x-100 object-cover" />
              <span className="absolute inset-0 -z-10 bg-primary-deep/80" aria-hidden />
            </>
          )}
          <p className={cx('font-display text-[15px] font-extrabold leading-tight tracking-tight', dark ? 'text-white' : 'text-primary-ink')}>
            {headline}
            <span className={cx('block', dark ? 'text-accent-tint' : 'text-accent-ink')}>One trusted local team.</span>
          </p>
          <p className={cx('mt-1.5 text-[9px]', dark ? 'text-white/75' : 'text-muted')}>Simple quotes, easy booking, clear updates.</p>
        </div>
        <ul className="space-y-1 px-2.5 py-2.5">
          {services.slice(0, 3).map((s) => (
            <li key={s.id} className="flex items-center gap-2 rounded-lg border border-line px-2 py-1.5">
              <span className="grid size-5 shrink-0 place-items-center rounded-md bg-primary-soft text-primary-ink">
                <ServiceIcon name={s.icon} className="size-3" />
              </span>
              <span className="min-w-0 flex-1 truncate text-[10px] font-bold text-ink">{s.name}</span>
              <span className="text-[9px] text-muted">from £{s.startingPrice}</span>
            </li>
          ))}
        </ul>
        <div className="grid grid-cols-3 gap-1.5 border-t border-line bg-white/95 px-2 pb-3 pt-2 shadow-[0_-8px_24px_-12px_rgb(16_24_40/0.25)]">
          <span className="inline-flex h-8 items-center justify-center gap-1 rounded-control border border-line-2 bg-surface text-[10px] font-bold text-ink">
            <Phone className="size-3" aria-hidden /> Call
          </span>
          <span className="inline-flex h-8 items-center justify-center gap-1 rounded-control bg-secondary-solid text-[10px] font-bold text-secondary-on">
            <FileText className="size-3" aria-hidden /> Quote
          </span>
          <span className="inline-flex h-8 items-center justify-center gap-1 rounded-control bg-primary-solid text-[10px] font-bold text-primary-on">
            <CalendarCheck className="size-3" aria-hidden /> Book
          </span>
        </div>
      </div>
    </figure>
  );
}

// ------------------------------------------------------------------ brand kit summary
function BrandKit() {
  const { state } = useDemo();
  const b = state.config.branding;
  const preset = BRAND_PRESETS.find((p) => p.id === b.presetId);
  const swatches: [string, string][] = [
    ['Primary', b.primaryColor],
    ['Secondary', b.secondaryColor],
    ['Accent', b.accentColor],
  ];
  const rows: [string, string][] = [
    ['Font', FONT_PRESETS[b.fontPreset]?.label.split(' — ')[0] ?? 'Modern'],
    ['Corners', RADIUS_PRESETS[b.borderRadiusPreset]?.label ?? 'Rounded'],
    ['Hero', HERO_OPTIONS.find((h) => h.id === b.heroStyle)?.label ?? 'Photo'],
    ['FieldMate credit', b.showPoweredByFieldMate ? 'Shown' : 'Hidden'],
  ];
  return (
    <div className="card flex min-w-0 flex-col p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Brand kit</p>
      <p className="mt-0.5 truncate text-sm font-bold text-ink">{preset ? preset.name : 'Custom palette'}</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {swatches.map(([name, c]) => (
          <div key={name} className="min-w-0">
            <div className="h-11 rounded-lg shadow-sm ring-1 ring-inset ring-black/5" style={{ background: c }} />
            <p className="mt-1 truncate text-[11px] font-semibold text-ink-2">{name}</p>
            <p className="truncate font-mono text-[10px] uppercase text-muted">{c}</p>
          </div>
        ))}
      </div>
      <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-[12px]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-2">
            <dt className="text-muted">{k}</dt>
            <dd className="truncate font-semibold text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-auto pt-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Applied to</p>
        <ul className="mt-1.5 flex flex-wrap gap-1">
          {['Website', 'Office portal', 'Worker app', 'Customer portal', 'Quotes & invoices'].map((x) => (
            <li key={x} className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-semibold text-success-ink">
              <Check className="size-3" aria-hidden /> {x}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
