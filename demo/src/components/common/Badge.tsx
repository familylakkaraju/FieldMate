import type { ReactNode } from 'react';
import type { InvoiceStatus, JobStatus, LeadStatus, QuoteStatus, ServiceType, TaskStatus } from '../../types/domain';
import { useConfig } from '../../app/DemoProvider';
import { serviceTone } from '../../theme/branding';
import { cx } from '../../utils/cx';
import { ServiceIcon } from './ServiceIcon';

type Tone = 'gray' | 'blue' | 'violet' | 'amber' | 'green' | 'red' | 'teal' | 'brand';

const TONES: Record<Tone, { box: string; dot: string }> = {
  gray: { box: 'bg-subtle text-ink-2 ring-line', dot: 'bg-muted' },
  blue: { box: 'bg-[#EAF2FF] text-[#1849A9] ring-[#C9DCFF]', dot: 'bg-[#2E6BE6]' },
  violet: { box: 'bg-[#F2EEFF] text-[#5925DC] ring-[#DDD3FE]', dot: 'bg-[#7A5AF8]' },
  amber: { box: 'bg-warning-soft text-warning-ink ring-[#F8DDA8]', dot: 'bg-warning' },
  green: { box: 'bg-success-soft text-success-ink ring-[#C3E7D3]', dot: 'bg-success' },
  red: { box: 'bg-danger-soft text-danger-ink ring-[#F6C9C9]', dot: 'bg-danger' },
  teal: { box: 'bg-[#E6F6F4] text-[#0B6B5E] ring-[#BFE6E0]', dot: 'bg-[#0F9D8A]' },
  brand: { box: 'bg-secondary-soft text-secondary-ink ring-secondary-tint', dot: 'bg-secondary' },
};

export function Badge({ tone = 'gray', dot = false, children, className, icon }: { tone?: Tone; dot?: boolean; children: ReactNode; className?: string; icon?: ReactNode }) {
  const t = TONES[tone];
  return (
    <span className={cx('inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-semibold ring-1 ring-inset', t.box, className)}>
      {dot && <span className={cx('size-1.5 rounded-full', t.dot)} aria-hidden />}
      {icon}
      {children}
    </span>
  );
}

const JOB: Record<JobStatus, [Tone, string]> = {
  new: ['gray', 'New'],
  quoted: ['amber', 'Quoted'],
  scheduled: ['blue', 'Scheduled'],
  'in-progress': ['teal', 'In progress'],
  blocked: ['red', 'Blocked'],
  completed: ['green', 'Completed'],
  invoiced: ['violet', 'Invoiced'],
  closed: ['gray', 'Closed · Paid'],
};
const LEAD: Record<LeadStatus, [Tone, string]> = {
  new: ['blue', 'New'],
  contacted: ['violet', 'Contacted'],
  quoted: ['amber', 'Quoted'],
  converted: ['green', 'Converted'],
  lost: ['gray', 'Lost'],
};
const TASK: Record<TaskStatus, [Tone, string]> = {
  ready: ['gray', 'Ready'],
  scheduled: ['blue', 'Scheduled'],
  'in-progress': ['teal', 'In progress'],
  blocked: ['red', 'Blocked'],
  completed: ['green', 'Completed'],
};
const QUOTE: Record<QuoteStatus, [Tone, string]> = {
  draft: ['gray', 'Draft'],
  sent: ['blue', 'Sent'],
  viewed: ['violet', 'Viewed'],
  accepted: ['green', 'Accepted'],
  declined: ['red', 'Declined'],
  expired: ['amber', 'Expired'],
};
const INVOICE: Record<InvoiceStatus, [Tone, string]> = {
  draft: ['gray', 'Draft'],
  sent: ['blue', 'Sent'],
  due: ['amber', 'Due'],
  overdue: ['red', 'Overdue'],
  paid: ['green', 'Paid'],
};

type StatusKind = 'job' | 'lead' | 'task' | 'quote' | 'invoice';
const MAPS: Record<StatusKind, Record<string, [Tone, string]>> = { job: JOB, lead: LEAD, task: TASK, quote: QUOTE, invoice: INVOICE };

export function StatusBadge({ kind, status, className }: { kind: StatusKind; status: string; className?: string }) {
  const [tone, label] = MAPS[kind][status] ?? ['gray', status];
  return (
    <Badge tone={tone} dot className={className}>
      {label}
    </Badge>
  );
}

export const statusLabel = (kind: StatusKind, status: string) => MAPS[kind][status]?.[1] ?? status;

export function ServiceBadge({ service, className, short }: { service: ServiceType; className?: string; short?: boolean }) {
  const cfg = useConfig();
  const s = cfg.services.find((x) => x.id === service)!;
  const tone = serviceTone(s.color);
  return (
    <span
      className={cx('inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-semibold', className)}
      style={{ background: tone.soft, color: tone.ink }}
    >
      <ServiceIcon name={s.icon} className="size-3.5" />
      {short ? s.heroWord.replace('.', '') : s.name}
    </span>
  );
}

export function DemoBadge({ children = 'Demo', className }: { children?: ReactNode; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full border border-dashed border-warning bg-warning-soft px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-warning-ink', className)}>
      {children}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: 'low' | 'normal' | 'high' }) {
  if (priority === 'normal') return null;
  return (
    <Badge tone={priority === 'high' ? 'red' : 'gray'} className="h-5 px-2 text-[11px]">
      {priority === 'high' ? 'High priority' : 'Low'}
    </Badge>
  );
}
