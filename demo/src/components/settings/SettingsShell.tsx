import { useEffect, useId, useRef, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, CreditCard, LayoutGrid, Palette, Plug, Users, type LucideIcon } from 'lucide-react';
import type { ServiceConfig } from '../../types/domain';
import { useDemo } from '../../app/DemoProvider';
import { hexToRgb, isValidHex, rgbToHex, serviceTone } from '../../theme/branding';
import { asset, cx } from '../../utils/cx';
import { Field, inputClass } from '../common/Form';
import { ServiceIcon } from '../common/ServiceIcon';

const TABS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/app/settings/company', label: 'Company', icon: Building2 },
  { to: '/app/settings/branding', label: 'Branding', icon: Palette },
  { to: '/app/settings/services', label: 'Services & Pricing', icon: LayoutGrid },
  { to: '/app/settings/team', label: 'Team', icon: Users },
  { to: '/app/settings/integrations', label: 'Integrations', icon: Plug },
  { to: '/app/settings/plan', label: 'Plan', icon: CreditCard },
];

/** Shared frame for every settings screen: page title, section tabs and the section heading. */
export function SettingsShell({ title, subtitle, actions, children }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  const listRef = useRef<HTMLUListElement>(null);

  // Keep the active tab in view on narrow screens (horizontal scroll only — never moves the page).
  useEffect(() => {
    const list = listRef.current;
    const active = list?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!list || !active) return;
    const target = active.offsetLeft - (list.clientWidth - active.offsetWidth) / 2;
    list.scrollLeft = Math.max(0, target);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[13px] font-semibold text-muted">Business portal</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink md:text-[28px]">Settings</h1>
        <p className="mt-0.5 text-[15px] text-muted">Your brand, services, team and plan. Changes apply instantly to the website, portals and apps.</p>
      </div>

      <nav aria-label="Settings sections" className="-mx-4 border-b border-line sm:mx-0">
        <ul ref={listRef} className="no-scrollbar flex gap-1 overflow-x-auto scroll-smooth px-4 sm:px-0">
          {TABS.map((t) => (
            <li key={t.to} className="shrink-0">
              <NavLink
                to={t.to}
                className={({ isActive }) =>
                  cx(
                    'relative inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-t-lg px-3 text-sm font-semibold transition',
                    isActive
                      ? 'text-secondary-ink after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-secondary-solid'
                      : 'text-muted hover:bg-subtle/70 hover:text-ink',
                  )
                }
              >
                <t.icon className="size-4" aria-hidden />
                {t.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-extrabold tracking-tight text-ink">{title}</h2>
          {subtitle && <p className="mt-0.5 max-w-3xl text-sm text-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>

      {children}
    </div>
  );
}

/** Jump to the public website (same tab) or open it in a new tab — the new tab stays in sync via localStorage. */
export function usePublicPreview() {
  const navigate = useNavigate();
  const { actions } = useDemo();
  return {
    view: (path = '/') => {
      actions.setPersona({ persona: 'public' });
      navigate(path);
    },
    openNewTab: (path = '/') => {
      window.open(`${window.location.pathname}#${path}`, '_blank', 'noopener');
    },
  };
}

const SIX = /^#[0-9a-f]{6}$/i;
const toSix = (hex: string) => (SIX.test(hex) ? hex : rgbToHex(hexToRgb(hex)));

/** Colour swatch picker + validated hex field. Commits only valid colours; 3-digit hex expands on blur. */
export function HexColorField({ label, value, onChange, hint, className }: { label: string; value: string; onChange: (hex: string) => void; hint?: ReactNode; className?: string }) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const valid = isValidHex(draft);
  // Only flag errors once the value can't become valid by typing more (bad characters or full length).
  const showError = !valid && (/[^#0-9a-f]/i.test(draft) || draft.length >= 7);

  const change = (raw: string) => {
    const v = raw.trim() && !raw.trim().startsWith('#') ? `#${raw.trim()}` : raw.trim();
    setDraft(v);
    if (SIX.test(v) && v.toLowerCase() !== value.toLowerCase()) onChange(v);
  };
  const blur = () => {
    if (!isValidHex(draft)) return setDraft(value);
    const full = toSix(draft);
    if (full.toLowerCase() !== value.toLowerCase()) onChange(full);
    else setDraft(value);
  };

  return (
    <div className={className}>
      <label htmlFor={`${id}-hex`} className="mb-1.5 block text-sm font-semibold text-ink-2">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <span className="relative size-11 shrink-0 overflow-hidden rounded-control border border-line-2 shadow-sm focus-within:ring-4 focus-within:ring-secondary/20" style={{ background: value }}>
          <input
            type="color"
            aria-label={`${label}: open colour picker`}
            value={toSix(value)}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
        </span>
        <input
          id={`${id}-hex`}
          value={draft}
          onChange={(e) => change(e.target.value)}
          onBlur={blur}
          spellCheck={false}
          autoComplete="off"
          maxLength={7}
          aria-invalid={showError}
          aria-describedby={showError ? `${id}-err` : hint ? `${id}-hint` : undefined}
          className={cx(inputClass, 'w-[7.5rem] font-mono text-sm uppercase tracking-wide', showError && 'border-danger focus:border-danger focus:ring-danger/15')}
        />
      </div>
      {showError ? (
        <p id={`${id}-err`} className="mt-1.5 text-[13px] font-medium text-danger-ink">
          Use a hex colour such as #1677FF
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-1.5 text-[13px] text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

/**
 * Text input that keeps a local draft and only commits valid values to the store
 * (so a field can be cleared mid-edit without breaking the live site). Reverts on blur if invalid.
 */
export function DraftInput({
  label,
  value,
  onCommit,
  hint,
  error = 'This field is required',
  isValid = (v: string) => v.trim().length > 0,
  prefix,
  className,
  ...rest
}: {
  label: string;
  value: string;
  onCommit: (v: string) => void;
  hint?: ReactNode;
  error?: string;
  isValid?: (v: string) => boolean;
  prefix?: ReactNode;
  className?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'prefix' | 'className'>) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const ok = isValid(draft);
  return (
    <Field label={label} htmlFor={id} hint={ok ? hint : undefined} className={className}>
      <div className="relative">
        {prefix && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] font-medium text-muted">{prefix}</span>}
        <input
          id={id}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (isValid(e.target.value) && e.target.value !== value) onCommit(e.target.value);
          }}
          onBlur={() => {
            if (!isValid(draft)) setDraft(value);
          }}
          aria-invalid={!ok}
          aria-describedby={!ok ? `${id}-err` : undefined}
          className={cx(inputClass, !!prefix && 'pl-8', !ok && 'border-danger focus:border-danger focus:ring-danger/15')}
          {...rest}
        />
      </div>
      {!ok && (
        <p id={`${id}-err`} className="mt-1.5 text-[13px] font-medium text-danger-ink">
          {error}
        </p>
      )}
    </Field>
  );
}

/** Compact, non-interactive replica of the public service card (used by live previews). */
export function ServiceCardPreview({ service, className }: { service: ServiceConfig; className?: string }) {
  const tone = serviceTone(service.color);
  return (
    <div className={cx('flex flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card', className)}>
      <div className="relative aspect-[16/9] overflow-hidden bg-subtle">
        <img src={asset(service.image)} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/0 to-black/0" aria-hidden />
        <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-bold shadow-sm" style={{ color: tone.ink }}>
          <ServiceIcon name={service.icon} className="size-3" />
          {service.recurring ? 'One-off or recurring' : 'Same-day available'}
        </span>
        <span className="absolute bottom-2.5 right-2.5 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
          from £{service.startingPrice}
          <span className="font-normal text-white/75"> / {service.priceUnit}</span>
        </span>
      </div>
      <div className="flex flex-1 flex-col p-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg" style={{ background: tone.soft, color: tone.ink }}>
            <ServiceIcon name={service.icon} className="size-[18px]" />
          </span>
          <p className="truncate font-display text-[15px] font-extrabold uppercase tracking-tight text-primary-ink">{service.name}</p>
        </div>
        <p className="mt-2 line-clamp-2 flex-1 text-[12px] leading-relaxed text-muted">{service.description || 'Add a short description so customers know what’s included.'}</p>
        <span className="mt-3 inline-flex h-8 w-full items-center justify-center gap-1.5 truncate rounded-control bg-secondary-solid px-3 text-[11px] font-bold text-secondary-on shadow-sm">
          {service.cta}
          <ArrowRight className="size-3.5 shrink-0" aria-hidden />
        </span>
      </div>
    </div>
  );
}
