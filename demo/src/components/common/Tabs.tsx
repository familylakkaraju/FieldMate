import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cx } from '../../utils/cx';

export function Tabs<T extends string>({ tabs, value, onChange, label, className }: { tabs: { id: T; label: ReactNode; count?: number }[]; value: T; onChange: (v: T) => void; label: string; className?: string }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent, i: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    refs.current[next]?.focus();
    onChange(tabs[next].id);
  };
  return (
    <div role="tablist" aria-label={label} className={cx('no-scrollbar flex gap-1 overflow-x-auto border-b border-line', className)}>
      {tabs.map((t, i) => (
        <button
          key={t.id}
          ref={(el) => {
            refs.current[i] = el;
          }}
          role="tab"
          type="button"
          aria-selected={value === t.id}
          tabIndex={value === t.id ? 0 : -1}
          onKeyDown={(e) => onKey(e, i)}
          onClick={() => onChange(t.id)}
          className={cx(
            '-mb-px inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 pb-2.5 pt-1 text-sm font-semibold transition',
            value === t.id ? 'border-secondary-solid text-ink' : 'border-transparent text-muted hover:text-ink',
          )}
        >
          {t.label}
          {t.count !== undefined && <span className={cx('rounded-full px-1.5 py-px text-[11px]', value === t.id ? 'bg-secondary-soft text-secondary-ink' : 'bg-subtle text-muted')}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}
