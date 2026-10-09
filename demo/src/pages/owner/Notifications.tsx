import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BriefcaseBusiness, CheckCheck, ClipboardCheck, FileText, Inbox, MessageSquare, PoundSterling, ReceiptText, Repeat, Settings, type LucideIcon } from 'lucide-react';
import type { NotificationItem } from '../../types/domain';
import { useDemo } from '../../app/DemoProvider';
import { EmptyState, PageHeader } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { FilterChips } from '../../components/common/Form';
import { cx } from '../../utils/cx';
import { relativeDay, time, timeAgo } from '../../utils/format';

const ICON: Record<NotificationItem['kind'], [LucideIcon, string]> = {
  lead: [Inbox, 'bg-secondary-soft text-secondary-ink'],
  quote: [FileText, 'bg-[#F2EEFF] text-[#5925DC]'],
  task: [ClipboardCheck, 'bg-success-soft text-success-ink'],
  invoice: [ReceiptText, 'bg-danger-soft text-danger-ink'],
  recurring: [Repeat, 'bg-accent-soft text-accent-ink'],
  job: [BriefcaseBusiness, 'bg-warning-soft text-warning-ink'],
  payment: [PoundSterling, 'bg-success-soft text-success-ink'],
  message: [MessageSquare, 'bg-info-soft text-info-ink'],
  system: [Settings, 'bg-subtle text-ink-2'],
};

export default function Notifications() {
  const { state, actions } = useDemo();
  const navigate = useNavigate();
  const [f, setF] = useState<'all' | 'unread'>('all');
  const all = [...state.data.notifications].sort((a, b) => (a.at < b.at ? 1 : -1));
  const unread = all.filter((n) => !n.read);
  const list = f === 'unread' ? unread : all;
  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Notifications"
        subtitle="New requests, quote decisions, completed work, payments and reminders."
        actions={
          <Button variant="outline" icon={<CheckCheck className="size-4" />} disabled={!unread.length} onClick={() => actions.markNotificationsRead()}>
            Mark all read
          </Button>
        }
      />
      <div className="mb-4">
        <FilterChips label="Filter notifications" value={f} onChange={setF} options={[{ value: 'all', label: 'All', count: all.length }, { value: 'unread', label: 'Unread', count: unread.length }]} />
      </div>
      {!list.length ? (
        <EmptyState icon={Bell} title="You’re all caught up" />
      ) : (
        <ul className="card divide-y divide-line">
          {list.map((n) => {
            const [Icon, tone] = ICON[n.kind];
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => {
                    actions.markNotificationsRead([n.id]);
                    if (n.link) navigate(n.link);
                  }}
                  className={cx('flex w-full items-start gap-3 p-4 text-left hover:bg-canvas', !n.read && 'bg-secondary-soft/40')}
                >
                  <span className={cx('grid size-10 shrink-0 place-items-center rounded-xl', tone)}>
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-bold text-ink">{n.title}</span>
                      {!n.read && <span className="size-2 rounded-full bg-secondary" aria-label="Unread" />}
                    </span>
                    <span className="mt-0.5 block text-sm text-ink-2">{n.body}</span>
                  </span>
                  <span className="shrink-0 text-right text-xs text-muted">
                    {timeAgo(n.at)}
                    <span className="block">{relativeDay(n.at) === 'Today' ? time(n.at) : ''}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
