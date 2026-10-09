import { useState } from 'react';
import { Camera, FileText, ReceiptText } from 'lucide-react';
import type { EvidenceItem } from '../../types/domain';
import { useDemoData } from '../../app/DemoProvider';
import { Modal } from '../common/Modal';
import { asset, cx } from '../../utils/cx';
import { relativeDay, time } from '../../utils/format';

export function EvidenceGrid({ items, cols = 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4', empty = 'No photos yet' }: { items: EvidenceItem[]; cols?: string; empty?: string }) {
  const data = useDemoData();
  const [open, setOpen] = useState<EvidenceItem | null>(null);
  if (!items.length)
    return (
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-line-2 p-4 text-sm text-muted">
        <Camera className="size-5" aria-hidden /> {empty}
      </div>
    );
  return (
    <>
      <div className={cx('grid gap-3', cols)}>
        {items.map((e) => (
          <button key={e.id} type="button" onClick={() => setOpen(e)} className="group overflow-hidden rounded-xl border border-line bg-surface text-left transition hover:shadow-raised">
            <div className="relative aspect-[4/3] overflow-hidden bg-subtle">
              <img src={asset(e.url)} alt={e.caption ?? 'Job photo'} loading="lazy" className="size-full object-cover transition duration-500 group-hover:scale-105" />
              <span
                className={cx(
                  'absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                  e.type === 'before' ? 'bg-black/65 text-white' : e.type === 'after' ? 'bg-success text-white' : 'bg-white/90 text-ink',
                )}
              >
                {e.type === 'receipt' ? <ReceiptText className="size-3" aria-hidden /> : e.type === 'document' ? <FileText className="size-3" aria-hidden /> : null}
                {e.type}
              </span>
            </div>
            <div className="p-2.5">
              <p className="line-clamp-1 text-xs font-semibold text-ink">{e.caption}</p>
              <p className="text-[11px] text-muted">
                {relativeDay(e.at)} {time(e.at)} · {data.team.find((m) => m.id === e.by)?.firstName ?? (e.by === 'customer' ? 'Customer' : 'Office')}
              </p>
            </div>
          </button>
        ))}
      </div>
      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.caption ?? 'Photo'} description={open ? `${open.type.toUpperCase()} · ${relativeDay(open.at)} ${time(open.at)} · ${data.jobs.find((j) => j.id === open.jobId)?.ref ?? ''}` : ''} size="lg">
        {open && <img src={asset(open.url)} alt={open.caption ?? ''} className="max-h-[70vh] w-full rounded-xl object-contain" />}
      </Modal>
    </>
  );
}
