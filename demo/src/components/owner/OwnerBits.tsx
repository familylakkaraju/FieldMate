import { Link } from 'react-router-dom';
import { ChevronRight, MapPin, TriangleAlert } from 'lucide-react';
import type { Job, Lead } from '../../types/domain';
import { useDemo } from '../../app/DemoProvider';
import { jobAddress, jobCustomerLabel, jobProgress } from '../../app/selectors';
import { serviceTone } from '../../theme/branding';
import { money, relativeDay, timeAgo, timeRange } from '../../utils/format';
import { cx } from '../../utils/cx';
import { ServiceBadge, StatusBadge } from '../common/Badge';
import { AvatarStack } from '../common/Avatar';
import { ProgressBar } from '../common/Card';
import { ServiceIcon } from '../common/ServiceIcon';

/** Compact job row used on the dashboard, schedule agenda and customer pages. */
export function JobRow({ job, showDate, to }: { job: Job; showDate?: boolean; to?: string }) {
  const { state } = useDemo();
  const svc = state.config.services.find((s) => s.id === job.service)!;
  const tone = serviceTone(svc.color);
  const prog = jobProgress(state.data, job);
  return (
    <Link to={to ?? `/app/jobs/${job.id}`} className="group flex items-stretch gap-3 rounded-xl border border-line bg-surface p-3 transition hover:border-line-2 hover:shadow-raised">
      <span className="w-1 shrink-0 rounded-full" style={{ background: tone.color }} aria-hidden />
      <div className="w-[76px] shrink-0">
        {showDate && <p className="text-[11px] font-semibold uppercase text-muted">{relativeDay(job.scheduledStart)}</p>}
        <p className="tabular text-sm font-bold text-ink">{job.scheduledStart ? job.scheduledStart.slice(11, 16) : '—'}</p>
        <p className="tabular text-xs text-muted">{job.scheduledEnd ? `to ${job.scheduledEnd.slice(11, 16)}` : 'unscheduled'}</p>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="truncate text-sm font-semibold text-ink group-hover:text-secondary-ink">{job.title}</p>
          <StatusBadge kind="job" status={job.status} className="h-5 px-2 text-[11px]" />
        </div>
        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted">
          <ServiceIcon name={svc.icon} className="size-3.5 shrink-0" style={{ color: tone.ink }} />
          {jobCustomerLabel(state.data, job)} · {job.area ?? jobAddress(state.data, job)}
        </p>
        {job.atRisk && job.status !== 'completed' && (
          <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-danger-ink">
            <TriangleAlert className="size-3.5" aria-hidden /> {job.atRisk}
          </p>
        )}
        {['in-progress', 'blocked'].includes(job.status) && <ProgressBar value={prog.pct} className="mt-2 h-1.5" tone={job.status === 'blocked' ? 'red' : 'accent'} label={`${prog.done} of ${prog.total} tasks`} />}
      </div>
      <div className="flex shrink-0 flex-col items-end justify-between gap-2">
        <AvatarStack ids={job.assignedWorkerIds} size="xs" />
        <ChevronRight className="size-4 text-muted transition group-hover:translate-x-0.5" aria-hidden />
      </div>
    </Link>
  );
}

export function LeadCard({ lead }: { lead: Lead }) {
  return (
    <Link to={`/app/leads/${lead.id}`} className="group block rounded-xl border border-line bg-surface p-3.5 transition hover:border-line-2 hover:shadow-raised">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink group-hover:text-secondary-ink">{lead.customerName}</p>
          <p className="text-xs text-muted">
            {lead.ref} · {timeAgo(lead.createdAt)} · {lead.source === 'website' ? 'Website' : lead.source === 'phone' ? 'Phone' : 'Referral'}
          </p>
        </div>
        <StatusBadge kind="lead" status={lead.status} />
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-ink-2">{lead.summary}</p>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <ServiceBadge service={lead.service} />
        {lead.urgency === 'urgent' && (
          <span className="inline-flex h-6 items-center gap-1 rounded-full bg-danger-soft px-2.5 text-xs font-bold text-danger-ink">
            <TriangleAlert className="size-3.5" aria-hidden /> Urgent
          </span>
        )}
        {lead.estimatedValue !== undefined && <span className="ml-auto text-sm font-bold text-ink">{money(lead.estimatedValue)}</span>}
      </div>
    </Link>
  );
}

export function AddressLine({ text, className }: { text: string; className?: string }) {
  return (
    <span className={cx('inline-flex items-start gap-1.5', className)}>
      <MapPin className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden /> {text}
    </span>
  );
}

export function ScheduleLabel({ job }: { job: Job }) {
  return <span className="tabular">{job.scheduledStart ? `${relativeDay(job.scheduledStart)} · ${timeRange(job.scheduledStart, job.scheduledEnd)}` : 'Unscheduled'}</span>;
}
