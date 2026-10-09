import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Repeat, UserPlus, Users } from 'lucide-react';
import { useDemo } from '../../app/DemoProvider';
import { customerStats } from '../../app/selectors';
import { PageHeader, EmptyState } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { FilterChips, SearchInput } from '../../components/common/Form';
import { Avatar } from '../../components/common/Avatar';
import { Badge } from '../../components/common/Badge';
import { useQuickActions } from '../../components/owner/QuickActions';
import { dayMonthYear, money, relativeDay } from '../../utils/format';
import { DEMO_DATE } from '../../data/demoClock';

type F = 'all' | 'recurring' | 'outstanding' | 'new';

export default function Customers() {
  const { state } = useDemo();
  const navigate = useNavigate();
  const quick = useQuickActions();
  const [q, setQ] = useState('');
  const [f, setF] = useState<F>('all');
  const rows = useMemo(
    () =>
      state.data.customers
        .map((c) => ({ c, s: customerStats(state.data, c) }))
        .filter(({ c }) => !q || `${c.name} ${c.address} ${c.town} ${c.postcode} ${c.email}`.toLowerCase().includes(q.toLowerCase()))
        .sort((a, b) => a.c.name.localeCompare(b.c.name)),
    [state.data, q],
  );
  const filtered = rows.filter(({ c, s }) => (f === 'recurring' ? s.isRecurring : f === 'outstanding' ? s.outstanding > 0 : f === 'new' ? c.customerSince >= '2026-09-01' : true));
  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle={`${state.data.customers.length} customers · ${rows.filter((r) => r.s.isRecurring).length} on recurring plans`}
        actions={
          <Button icon={<UserPlus className="size-4" />} onClick={() => quick.open('customer')}>
            New Customer
          </Button>
        }
      />
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <FilterChips
          label="Customer filter"
          value={f}
          onChange={setF}
          options={[
            { value: 'all', label: 'All', count: rows.length },
            { value: 'recurring', label: 'Recurring', count: rows.filter((r) => r.s.isRecurring).length },
            { value: 'outstanding', label: 'Outstanding', count: rows.filter((r) => r.s.outstanding > 0).length },
            { value: 'new', label: 'New this month', count: rows.filter((r) => r.c.customerSince >= '2026-09-01').length },
          ]}
        />
        <SearchInput value={q} onChange={setQ} placeholder="Search name, street, postcode…" className="md:w-72" />
      </div>
      {!filtered.length ? (
        <EmptyState icon={Users} title="No customers match" />
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {filtered.map(({ c, s }) => (
              <Link key={c.id} to={`/app/customers/${c.id}`} className="card flex items-center gap-3 p-4">
                <Avatar name={c.name} color="#475467" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{c.name}</p>
                  <p className="truncate text-xs text-muted">
                    {c.town} · {c.postcode}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {s.isRecurring && <Badge tone="teal" icon={<Repeat className="size-3" aria-hidden />}>Recurring</Badge>}
                    {s.outstanding > 0 && <Badge tone="amber">{money(s.outstanding)} due</Badge>}
                  </div>
                </div>
                <span className="tabular text-sm font-bold text-ink">{money(s.lifetimeValue)}</span>
              </Link>
            ))}
          </div>
          <div className="card hidden overflow-hidden md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-canvas text-xs font-semibold uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Last service</th>
                  <th className="px-4 py-3">Next service</th>
                  <th className="px-4 py-3 text-right">Outstanding</th>
                  <th className="px-4 py-3 text-right">Lifetime value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map(({ c, s }) => (
                  <tr key={c.id} onClick={() => navigate(`/app/customers/${c.id}`)} className="cursor-pointer hover:bg-canvas">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={c.name} color="#475467" size="sm" />
                        <div>
                          <Link to={`/app/customers/${c.id}`} onClick={(e) => e.stopPropagation()} className="font-semibold text-ink hover:text-secondary-ink">
                            {c.name}
                          </Link>
                          <p className="text-xs text-muted">Since {dayMonthYear(c.customerSince)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-2">
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="size-3.5 text-muted" aria-hidden /> {c.town} {c.postcode.split(' ')[0]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {s.isRecurring ? (
                        <Badge tone="teal" icon={<Repeat className="size-3" aria-hidden />}>
                          {c.recurring!.find((r) => r.frequencyWeeks < 52)!.frequencyWeeks}-weekly
                        </Badge>
                      ) : c.recurring?.length ? (
                        <Badge tone="amber">Annual</Badge>
                      ) : (
                        <span className="text-xs text-muted">One-off</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-2">{s.lastService ? dayMonthYear(s.lastService) : '—'}</td>
                    <td className="px-4 py-3 text-ink-2">{s.nextService ? (s.nextService.slice(0, 10) <= DEMO_DATE ? 'Today' : relativeDay(s.nextService)) : '—'}</td>
                    <td className="tabular px-4 py-3 text-right">{s.outstanding > 0 ? <span className="font-semibold text-warning-ink">{money(s.outstanding)}</span> : <span className="text-muted">—</span>}</td>
                    <td className="tabular px-4 py-3 text-right font-semibold text-ink">{money(s.lifetimeValue)}</td>
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
