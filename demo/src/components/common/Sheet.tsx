import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cx } from '../../utils/cx';
import { Modal } from './Modal';

/**
 * Bottom sheet that renders inside the nearest positioned container (used inside the
 * worker app's phone frame), so it never covers the presenter's whole screen.
 */
export function PhoneSheet({ open, onClose, title, children, footer, tall }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; footer?: ReactNode; tall?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    window.setTimeout(() => (ref.current?.querySelector<HTMLElement>('[data-autofocus]') ?? ref.current)?.focus(), 30);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 animate-fade-in bg-[#0B1320]/50" onClick={onClose} aria-hidden />
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={title ? `${id}-t` : undefined} tabIndex={-1} className={cx('relative flex animate-rise flex-col rounded-t-[26px] bg-surface shadow-float outline-none', tall ? 'max-h-[94%]' : 'max-h-[86%]')}>
        <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-line-2" aria-hidden />
        {title && (
          <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-3">
            <h2 id={`${id}-t`} className="text-lg font-bold text-ink">
              {title}
            </h2>
            <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-muted hover:bg-subtle">
              <X className="size-5" />
            </button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
        {footer && <div className="border-t border-line px-5 py-3.5">{footer}</div>}
      </div>
    </div>
  );
}

/** Same content, rendered as a centred modal (office) or an in-frame bottom sheet (worker). */
export function ActionShell({ variant = 'modal', ...p }: { variant?: 'modal' | 'sheet'; open: boolean; onClose: () => void; title: ReactNode; description?: ReactNode; children: ReactNode; footer?: ReactNode; tall?: boolean }) {
  if (variant === 'sheet')
    return (
      <PhoneSheet open={p.open} onClose={p.onClose} title={p.title} footer={p.footer} tall={p.tall}>
        {p.description && <p className="-mt-1 mb-3 text-sm text-muted">{p.description}</p>}
        {p.children}
      </PhoneSheet>
    );
  return (
    <Modal open={p.open} onClose={p.onClose} title={p.title} description={p.description} footer={p.footer} size="md">
      {p.children}
    </Modal>
  );
}
