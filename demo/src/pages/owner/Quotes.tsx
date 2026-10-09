import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Eye, FileText, Plus, Send } from 'lucide-react';
import type { QuoteStatus } from '../../types/domain';
import { useDemo } from '../../app/DemoProvider';
import { getCustomer, getLead, quoteTotal } from '../../app/selectors';
import { EmptyState, PageHeader, StatCard } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { FilterChips } from '../../components/common/Form';
import { ServiceBadge, StatusBadge } from '../../components/common/Badge';
import { useQuickActions } from '../../components/owner/QuickActions';
import { money, shortDate } from '../../utils/format';

export default function Quotes() {
  const { state } = useDemo();
  const d = state.data;
  const navigate = useNavigate();
  const quick = useQuickActions();
  const [f, setF] = useState<'all' | QuoteStatus>('all');
  const who = (q: (typeof d.quotes)[number]) => getCustomer(d, q.customerId)?.name ?? getLead(d, q.leadId)?.customerName ?? '—';
  const list = d.quotes.filter((q) => f === 'all' || q.status === f).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const count = (s: QuoteStatus) => d.quotes.filter((q) => q.status === s).length;
  const awaiting = d.quotes.filter((q) => q.status === 'sent' || q.status === 'viewed');
  const decided = d.quotes.filter((q) => ['accepted', 'declined', 'expired'].includes(q.status));
  const winRate = decided.length ? Math.round((count('accepted') / decided.length) * 100) : 0;
  return (
    <div>
      <PageHeader title="Quotes" subtitle="Build, send and track quotes. Customers accept online in their portal." actions={<Button icon={<Plus className="size-4" />} onClick={() => quick.open('quote')}>New Quote</Button>} />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Drafts" value={count('draft')} icon={FileText} />
        <StatCard label="Awaiting customer" value={awaiting.length} icon={Send} tone="accent" sub={money(awaiting.reduce((a, q) => a + quoteTotal(q), 0))} />
        <StatCard label="Viewed" value={count('viewed')} icon={Eye} tone="violet" sub="Opened by customer" />
        <StatCard label="Win rate" value={`${winRate}%`} icon={CheckCircle2} tone="green" sub={`${count('accepted')} accepted`} />
      </div>
      <div className="mb-4">
        <FilterChips
          label="Quote status"
          value={f}
          onChange={setF}
          options={[
            { value: 'all', label: 'All', count: d.quotes.length },
            ...(['draft', 'sent', 'viewed', 'accepted', 'declined', 'expired'] as QuoteStatus[]).map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1), count: count(s) })),
          ]}
        />
      </div>
      {!list.length ? (
        <EmptyState icon={FileText} title="No quotes with this status" />
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {list.map((q) => (
              <Link key={q.id} to={`/app/quotes/${q.id}`} className="card block p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink">{who(q)}</p>
                    <p className="text-xs text-muted">
                      {q.ref} · {q.title}
                    </p>
                  </div>
                  <StatusBadge kind="quote" status={q.status} />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <ServiceBadge service={q.service} short />
                  <span className="tabular font-bold">{money(quoteTotal(q))}</span>
                </div>
              </Link>
            ))}
          </div>
          <div className="card hidden overflow-hidden md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-canvas text-xs font-semibold uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">Quote</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Valid until</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {list.map((q) => (
                  <tr key={q.id} onClick={() => navigate(`/app/quotes/${q.id}`)} className="cursor-pointer hover:bg-canvas">
                    <td className="px-4 py-3">
                      <Link to={`/app/quotes/${q.id}`} onClick={(e) => e.stopPropagation()} className="font-semibold text-ink hover:text-secondary-ink">
                        {q.ref}
                      </Link>
                      <p className="max-w-60 truncate text-xs text-muted">{q.title}</p>
                    </td>
                    <td className="px-4 py-3 text-ink-2">{who(q)}</td>
                    <td className="px-4 py-3">
                      <ServiceBadge service={q.service} short />
                    </td>
                    <td className="px-4 py-3 text-ink-2">{shortDate(q.createdAt)}</td>
                    <td className="px-4 py-3 text-ink-2">{shortDate(q.validUntil)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge kind="quote" status={q.status} />
                    </td>
                    <td className="tabular px-4 py-3 text-right font-semibold">{money(quoteTotal(q))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
