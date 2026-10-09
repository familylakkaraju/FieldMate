import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, MessagesSquare, Phone } from 'lucide-react';
import type { Job } from '../../types/domain';
import { relativeDay, time } from '../../utils/format';
import { cx } from '../../utils/cx';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/Card';
import { JobStatusBadge, MessageThread, PortalHeading, PortalNoAccount, PortalPending, ServiceTile, useCallBusiness, usePortal } from '../../components/customer/PortalUi';

const lastActivity = (j: Job) => j.messages[j.messages.length - 1]?.at ?? j.scheduledStart ?? j.createdAt;

export default function PortalMessages() {
  const { customer, lead, jobs, name, company } = usePortal();
  const [params, setParams] = useSearchParams();
  const call = useCallBusiness();
  if (!customer) return lead ? <PortalPending what="Messages" /> : <PortalNoAccount />;

  const threads = [...jobs].sort((a, b) => (lastActivity(a) < lastActivity(b) ? 1 : -1));
  const selected = threads.find((j) => j.id === params.get('job')) ?? threads[0];

  return (
    <>
      <PortalHeading
        title="Messages"
        subtitle={`Talk to the ${company.companyName} team about any of your jobs.`}
        actions={
          <Button variant="outline" icon={<Phone className="size-4" />} onClick={call}>
            Call us
          </Button>
        }
      />
      {!selected ? (
        <EmptyState icon={MessagesSquare} title="No conversations yet" text="Once you have a job with us, you can message the team about it here." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
          <nav aria-label="Conversations" className="card p-2">
            <ul className="space-y-1">
              {threads.map((j) => {
                const last = j.messages[j.messages.length - 1];
                const active = j.id === selected.id;
                return (
                  <li key={j.id}>
                    <button
                      type="button"
                      aria-current={active ? 'true' : undefined}
                      onClick={() => setParams({ job: j.id }, { replace: true })}
                      className={cx('flex w-full items-start gap-3 rounded-xl p-3 text-left transition', active ? 'bg-secondary-soft ring-1 ring-secondary-tint' : 'hover:bg-subtle')}
                    >
                      <ServiceTile service={j.service} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-ink">{j.title}</span>
                          {last && <span className="shrink-0 text-[11px] text-muted">{relativeDay(last.at) === 'Today' ? time(last.at) : relativeDay(last.at)}</span>}
                        </span>
                        <span className="block truncate text-[13px] text-muted">{last ? `${last.from === 'customer' ? 'You' : last.author.split(' ')[0]}: ${last.text}` : 'No messages yet'}</span>
                        <span className="mt-1 block text-[11px] font-semibold text-muted">
                          {j.ref} · {j.messages.length} {j.messages.length === 1 ? 'message' : 'messages'}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <section className="card p-4 sm:p-5" aria-labelledby="thread-title">
            <div className="mb-4 flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <ServiceTile service={selected.service} />
                <div className="min-w-0">
                  <h2 id="thread-title" className="truncate font-display text-lg font-bold text-ink">
                    {selected.title}
                  </h2>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[13px] text-muted">
                    {selected.ref}
                    <JobStatusBadge job={selected} />
                  </div>
                </div>
              </div>
              <Link to={`/portal/jobs/${selected.id}`} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-secondary-ink hover:underline">
                View job <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </div>
            <MessageThread key={selected.id} job={selected} author={customer.name || name} maxHeight="max-h-[55vh] min-h-48" />
          </section>
        </div>
      )}
    </>
  );
}
