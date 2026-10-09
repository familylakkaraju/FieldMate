import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, type LucideIcon } from 'lucide-react';
import { cx } from '../../utils/cx';

export function Card({ children, className, as: As = 'div', padded = true }: { children: ReactNode; className?: string; as?: 'div' | 'section' | 'article' | 'aside'; padded?: boolean }) {
  return <As className={cx('card', padded && 'p-5', className)}>{children}</As>;
}

export function CardHeader({ title, subtitle, action, icon: Icon, className }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; icon?: LucideIcon; className?: string }) {
  return (
    <div className={cx('mb-4 flex items-start justify-between gap-3', className)}>
      <div className="flex min-w-0 items-center gap-2.5">
        {Icon && (
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary-soft text-secondary-ink">
            <Icon className="size-4" aria-hidden />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-bold text-ink">{title}</h2>
          {subtitle && <p className="text-[13px] text-muted">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1 text-[13px] font-semibold text-secondary-ink hover:underline">
      {children}
      <ArrowRight className="size-3.5" aria-hidden />
    </Link>
  );
}

export function PageHeader({ title, subtitle, actions, eyebrow, children }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1.5 text-[13px] font-semibold text-muted">{eyebrow}</div>}
        <h1 className="text-2xl font-extrabold tracking-tight text-ink md:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 text-[15px] text-muted">{subtitle}</p>}
        {children}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SectionHeader({ eyebrow, title, text, center, className, light }: { eyebrow?: string; title: ReactNode; text?: ReactNode; center?: boolean; className?: string; light?: boolean }) {
  return (
    <div className={cx('max-w-2xl', center && 'mx-auto text-center', className)}>
      {eyebrow && <p className={cx('mb-3 text-[13px] font-bold uppercase tracking-[0.14em]', light ? 'text-white/70' : 'text-accent-ink')}>{eyebrow}</p>}
      <h2 className={cx('text-3xl font-extrabold tracking-tight md:text-[40px] md:leading-[1.1]', light ? 'text-white' : 'text-primary-ink')}>{title}</h2>
      {text && <p className={cx('mt-4 text-base md:text-lg', light ? 'text-white/80' : 'text-muted')}>{text}</p>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = 'brand',
  to,
  trend,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: LucideIcon;
  tone?: 'brand' | 'accent' | 'green' | 'amber' | 'red' | 'violet';
  to?: string;
  trend?: { text: string; up?: boolean; good?: boolean };
}) {
  const tones = {
    brand: 'bg-secondary-soft text-secondary-ink',
    accent: 'bg-accent-soft text-accent-ink',
    green: 'bg-success-soft text-success-ink',
    amber: 'bg-warning-soft text-warning-ink',
    red: 'bg-danger-soft text-danger-ink',
    violet: 'bg-[#F2EEFF] text-[#5925DC]',
  };
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-semibold text-muted">{label}</p>
        {Icon && (
          <span className={cx('grid size-9 place-items-center rounded-xl', tones[tone])}>
            <Icon className="size-4.5" aria-hidden />
          </span>
        )}
      </div>
      <p className="tabular mt-1 font-display text-[28px] font-extrabold leading-tight tracking-tight text-ink">{value}</p>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[13px] text-muted">
        {trend && <span className={cx('font-semibold', trend.good === false ? 'text-danger-ink' : 'text-success-ink')}>{trend.text}</span>}
        {sub}
      </div>
    </>
  );
  return to ? (
    <Link to={to} className="card block p-4 transition hover:-translate-y-0.5 hover:shadow-raised">
      {body}
    </Link>
  ) : (
    <div className="card p-4">{body}</div>
  );
}

export function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-line-2 bg-surface/60 px-6 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-subtle text-muted">
        <Icon className="size-6" aria-hidden />
      </span>
      <p className="mt-3 font-semibold text-ink">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('skeleton rounded-lg', className)} aria-hidden />;
}

export function PageSkeleton() {
  return (
    <div className="space-y-4 p-6" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

export function ProgressBar({ value, className, tone = 'brand', label }: { value: number; className?: string; tone?: 'brand' | 'green' | 'amber' | 'red' | 'accent'; label?: string }) {
  const colors = { brand: 'bg-secondary', green: 'bg-success', amber: 'bg-warning', red: 'bg-danger', accent: 'bg-accent' };
  return (
    <div className={cx('h-2 w-full overflow-hidden rounded-full bg-subtle', className)} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={cx('h-full rounded-full transition-all duration-500', colors[tone])} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function KeyValue({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-[12px] font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-ink">{children}</dd>
    </div>
  );
}
