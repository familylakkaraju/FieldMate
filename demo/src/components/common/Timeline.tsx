import { Bot, Camera, CircleDot, ClipboardCheck, Clock, FileText, Mail, MessageSquare, Mic, Package, PhoneCall, PoundSterling, ReceiptText, CalendarDays, StickyNote, TriangleAlert, type LucideIcon } from 'lucide-react';
import type { TimelineEntry } from '../../types/domain';
import { useDemoData } from '../../app/DemoProvider';
import { cx } from '../../utils/cx';
import { relativeDay, time } from '../../utils/format';

const ICONS: Record<TimelineEntry['kind'], [LucideIcon, string]> = {
  created: [CircleDot, 'bg-secondary-soft text-secondary-ink'],
  status: [ClipboardCheck, 'bg-[#E6F6F4] text-[#0B6B5E]'],
  task: [ClipboardCheck, 'bg-success-soft text-success-ink'],
  time: [Clock, 'bg-[#F2EEFF] text-[#5925DC]'],
  material: [Package, 'bg-warning-soft text-warning-ink'],
  issue: [TriangleAlert, 'bg-danger-soft text-danger-ink'],
  evidence: [Camera, 'bg-info-soft text-info-ink'],
  note: [StickyNote, 'bg-subtle text-ink-2'],
  voice: [Mic, 'bg-accent-soft text-accent-ink'],
  quote: [FileText, 'bg-secondary-soft text-secondary-ink'],
  invoice: [ReceiptText, 'bg-[#F2EEFF] text-[#5925DC]'],
  payment: [PoundSterling, 'bg-success-soft text-success-ink'],
  message: [MessageSquare, 'bg-info-soft text-info-ink'],
  schedule: [CalendarDays, 'bg-secondary-soft text-secondary-ink'],
  contact: [PhoneCall, 'bg-subtle text-ink-2'],
};

export function Timeline({ entries, newestFirst = true, compact, empty = 'Nothing yet' }: { entries: TimelineEntry[]; newestFirst?: boolean; compact?: boolean; empty?: string }) {
  const data = useDemoData();
  const list = [...entries].sort((a, b) => (a.at < b.at ? (newestFirst ? 1 : -1) : a.at > b.at ? (newestFirst ? -1 : 1) : 0));
  if (!list.length) return <p className="text-sm text-muted">{empty}</p>;
  const who = (by?: string) => (by === 'customer' ? 'Customer' : by === 'system' ? 'FieldMate' : data.team.find((m) => m.id === by)?.name);
  return (
    <ol className="relative">
      {list.map((e, i) => {
        const [Icon, tone] = ICONS[e.kind] ?? [Mail, 'bg-subtle text-ink-2'];
        const byName = who(e.by);
        return (
          <li key={e.id} className={cx('relative flex gap-3', compact ? 'pb-3' : 'pb-5')}>
            {i < list.length - 1 && <span className="absolute left-[15px] top-8 h-[calc(100%-28px)] w-px bg-line" aria-hidden />}
            <span className={cx('relative z-[1] grid size-8 shrink-0 place-items-center rounded-full', tone)}>
              {e.by === 'system' ? <Bot className="size-4" aria-hidden /> : <Icon className="size-4" aria-hidden />}
            </span>
            <div className="min-w-0 pt-1">
              <p className={cx('text-sm text-ink', e.kind === 'voice' && 'italic')}>{e.text}</p>
              <p className="mt-0.5 text-xs text-muted">
                {relativeDay(e.at)} · {time(e.at)}
                {byName ? ` · ${byName}` : ''}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
