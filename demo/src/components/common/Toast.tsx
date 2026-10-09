import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { cx } from '../../utils/cx';

export interface ToastInput {
  title: string;
  description?: string;
  tone?: 'success' | 'info' | 'warning';
  action?: { label: string; to: string };
  duration?: number;
}

interface ToastItem extends ToastInput {
  id: number;
}

const ToastContext = createContext<(t: ToastInput) => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const dismiss = useCallback((id: number) => setItems((xs) => xs.filter((x) => x.id !== id)), []);
  const push = useCallback(
    (t: ToastInput) => {
      const id = ++seq.current;
      setItems((xs) => [...xs.slice(-3), { ...t, id }]);
      window.setTimeout(() => dismiss(id), t.duration ?? 4200);
    },
    [dismiss],
  );
  const value = useMemo(() => push, [push]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" aria-atomic="false" className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex flex-col items-center gap-2 p-4 pb-24 sm:items-end sm:pb-6 sm:pr-6">
        {items.map((t) => (
          <ToastCard key={t.id} toast={t} onClose={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  const navigate = useNavigate();
  const Icon = toast.tone === 'warning' ? TriangleAlert : toast.tone === 'info' ? Info : CheckCircle2;
  return (
    <div role="status" className="pointer-events-auto flex w-full max-w-sm animate-rise items-start gap-3 rounded-card border border-line bg-surface p-4 shadow-float">
      <span
        className={cx(
          'mt-0.5 grid size-8 shrink-0 place-items-center rounded-full',
          toast.tone === 'warning' ? 'bg-warning-soft text-warning-ink' : toast.tone === 'info' ? 'bg-secondary-soft text-secondary-ink' : 'bg-success-soft text-success-ink',
        )}
      >
        <Icon className="size-4.5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">{toast.title}</p>
        {toast.description && <p className="mt-0.5 text-sm text-muted">{toast.description}</p>}
        {toast.action && (
          <button
            type="button"
            onClick={() => {
              navigate(toast.action!.to);
              onClose();
            }}
            className="mt-2 text-sm font-semibold text-secondary-ink hover:underline"
          >
            {toast.action.label} →
          </button>
        )}
      </div>
      <button type="button" onClick={onClose} aria-label="Dismiss notification" className="-m-1 rounded-md p-1 text-muted hover:bg-subtle hover:text-ink">
        <X className="size-4" />
      </button>
    </div>
  );
}

export const useToast = () => useContext(ToastContext);
