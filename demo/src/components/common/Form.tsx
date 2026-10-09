import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Search } from 'lucide-react';
import { cx } from '../../utils/cx';

export const inputClass =
  'h-11 w-full rounded-control border border-line-2 bg-surface px-3.5 text-[15px] text-ink shadow-[0_1px_2px_rgb(16_24_40/0.04)] outline-none transition placeholder:text-[#98A2B3] focus:border-secondary focus:ring-4 focus:ring-secondary/15 disabled:bg-subtle';

export function Field({ label, hint, children, className, htmlFor, required }: { label: string; hint?: ReactNode; children: ReactNode; className?: string; htmlFor?: string; required?: boolean }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-ink-2">
        {label}
        {required && <span className="text-danger-ink"> *</span>}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-[13px] text-muted">{hint}</p>}
    </div>
  );
}

export function TextInput({ label, hint, className, required, ...rest }: { label: string; hint?: ReactNode; className?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id} className={className} required={required}>
      <input id={id} required={required} className={inputClass} {...rest} />
    </Field>
  );
}

export function TextArea({ label, hint, className, ...rest }: { label: string; hint?: ReactNode; className?: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id} className={className}>
      <textarea id={id} className={cx(inputClass, 'h-auto min-h-24 py-2.5')} {...rest} />
    </Field>
  );
}

export function SelectInput({ label, hint, className, children, ...rest }: { label: string; hint?: ReactNode; className?: string; children: ReactNode } & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id} className={className}>
      <select id={id} className={cx(inputClass, 'appearance-none bg-[url("data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 fill=%27none%27 stroke=%27%23667085%27 stroke-width=%272%27><path d=%27M4 6l4 4 4-4%27/></svg>")] bg-[right_12px_center] bg-no-repeat pr-10')} {...rest}>
        {children}
      </select>
    </Field>
  );
}

export function Toggle({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: ReactNode; disabled?: boolean }) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <label htmlFor={id} className="text-sm font-semibold text-ink">
          {label}
        </label>
        {description && <p className="text-[13px] text-muted">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx('relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50', checked ? 'bg-secondary-solid' : 'bg-line-2')}
      >
        <span className={cx('absolute top-0.5 size-5 rounded-full bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
        <span className="sr-only">{checked ? 'On' : 'Off'}</span>
      </button>
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options, label, size = 'md' }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; label: string; size?: 'sm' | 'md' }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-control bg-subtle p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'inline-flex items-center gap-1.5 rounded-[calc(var(--brand-radius-control)-2px)] font-semibold transition',
            size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-[13px]',
            value === o.value ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Search…', className, label = 'Search', autoFocus }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string; label?: string; autoFocus?: boolean }) {
  return (
    <div className={cx('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
      <input
        type="search"
        aria-label={label}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cx(inputClass, 'h-10 pl-9 text-sm')}
      />
    </div>
  );
}

export function FilterChips<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; count?: number }[]; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold transition',
            value === o.value ? 'border-primary-solid bg-primary-solid text-primary-on' : 'border-line-2 bg-surface text-ink-2 hover:border-muted',
          )}
        >
          {o.label}
          {o.count !== undefined && <span className={cx('rounded-full px-1.5 text-[11px]', value === o.value ? 'bg-white/20' : 'bg-subtle text-muted')}>{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Checkbox({ checked, onChange, label, className }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; className?: string }) {
  return (
    <label className={cx('flex cursor-pointer items-start gap-2.5 text-sm text-ink', className)}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 size-4.5 shrink-0 rounded accent-[var(--brand-secondary-solid)]" />
      <span>{label}</span>
    </label>
  );
}
