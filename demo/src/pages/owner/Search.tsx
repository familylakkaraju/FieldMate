import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BriefcaseBusiness, Camera, ClipboardCheck, FileText, Inbox, ReceiptText, Search as SearchIcon, Users, type LucideIcon } from 'lucide-react';
import { useDemo } from '../../app/DemoProvider';
import { searchAll, type SearchHit } from '../../app/selectors';
import { EmptyState, PageHeader } from '../../components/common/Card';
import { FilterChips, SearchInput } from '../../components/common/Form';
import { ServiceBadge } from '../../components/common/Badge';

const ICON: Record<SearchHit['type'], LucideIcon> = { Customer: Users, Job: BriefcaseBusiness, Task: ClipboardCheck, Lead: Inbox, Quote: FileText, Invoice: ReceiptText, File: Camera };
const SUGGESTIONS = ['Shah', 'Willow Close', 'CM2', 'gutter', 'Maya', 'INV-3009', 'downpipe'];

export default function Search() {
  const { state } = useDemo();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [type, setType] = useState<'all' | SearchHit['type']>('all');
  const hits = useMemo(() => searchAll(state.data, q), [state.data, q]);
  const shown = hits.filter((h) => type === 'all' || h.type === type);
  const types = Array.from(new Set(hits.map((h) => h.type)));
  const update = (v: string) => {
    setQ(v);
    setParams(v ? { q: v } : {}, { replace: true });
  };
  return (
    <div className="max-w-4xl">
      <PageHeader title="Search" subtitle="Customers, leads, jobs, tasks, quotes, invoices and files — instantly." />
      <SearchInput value={q} onChange={update} placeholder="Try “Shah”, “CM2” or “downpipe”" autoFocus className="[&_input]:h-12 [&_input]:text-base" />
      {!q && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">Try:</span>
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" onClick={() => update(s)} className="rounded-full bg-subtle px-3 py-1 font-semibold text-ink-2 hover:bg-secondary-soft hover:text-secondary-ink">
              {s}
            </button>
          ))}
        </div>
      )}
      {q && (
        <>
          <div className="mt-5">
            <FilterChips label="Result type" value={type} onChange={setType} options={[{ value: 'all', label: 'All', count: hits.length }, ...types.map((t) => ({ value: t, label: `${t}s`, count: hits.filter((h) => h.type === t).length }))]} />
          </div>
          <div className="mt-4">
            {shown.length ? (
              <ul className="card divide-y divide-line">
                {shown.map((h) => {
                  const Icon = ICON[h.type];
                  return (
                    <li key={`${h.type}-${h.id}`}>
                      <Link to={h.link} className="flex items-center gap-3 p-3.5 hover:bg-canvas">
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary-soft text-secondary-ink">
                          <Icon className="size-5" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ink">{h.title}</p>
                          <p className="truncate text-xs text-muted">
                            {h.type} · {h.subtitle}
                          </p>
                        </div>
                        {h.service && <ServiceBadge service={h.service} short />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState icon={SearchIcon} title={`No results for “${q}”`} text="Try a name, street, postcode or reference." />
            )}
          </div>
        </>
      )}
    </div>
  );
}
