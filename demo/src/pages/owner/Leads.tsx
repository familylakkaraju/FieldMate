import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Globe, Inbox, Phone, TriangleAlert, Users } from 'lucide-react';
import type { LeadStatus, ServiceType } from '../../types/domain';
import { useDemo } from '../../app/DemoProvider';
import { PageHeader, EmptyState } from '../../components/common/Card';
import { FilterChips, SearchInput, SelectInput } from '../../components/common/Form';
import { ServiceBadge, StatusBadge } from '../../components/common/Badge';
import { LeadCard } from '../../components/owner/OwnerBits';
import { money, timeAgo } from '../../utils/format';

const SOURCE = { website: [Globe, 'Website'], phone: [Phone, 'Phone'], referral: [Users, 'Referral'] } as const;

export default function Leads() {
  const { state } = useDemo();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | LeadStatus>('all');
  const [service, setService] = useState<'all' | ServiceType>('all');
  const leads = state.data.leads;
  const count = (s: LeadStatus) => leads.filter((l) => l.status === s).length;
  const list = useMemo(
    () =>
      leads
        .filter((l) => status === 'all' || l.status === status)
        .filter((l) => service === 'all' || l.service === service)
        .filter((l) => !q || `${l.customerName} ${l.summary} ${l.ref} ${l.postcode}`.toLowerCase().includes(q.toLowerCase()))
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [leads, status, service, q],
  );
  return (
    <div>
      <PageHeader title="Inbox / Leads" subtitle="Every enquiry from the website, phone and referrals — in one place." />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterChips
          label="Lead status"
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: 'All', count: leads.length },
            { value: 'new', label: 'New', count: count('new') },
            { value: 'contacted', label: 'Contacted', count: count('contacted') },
            { value: 'quoted', label: 'Quoted', count: count('quoted') },
            { value: 'converted', label: 'Converted', count: count('converted') },
            { value: 'lost', label: 'Lost', count: count('lost') },
          ]}
        />
        <div className="flex gap-2">
          <SearchInput value={q} onChange={setQ} placeholder="Search leads…" className="w-full lg:w-64" />
          <div className="w-44 shrink-0">
            <SelectInput label="Service" value={service} onChange={(e) => setService(e.target.value as 'all' | ServiceType)} className="[&_label]:sr-only">
              <option value="all">All services</option>
              {state.config.services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </SelectInput>
          </div>
        </div>
      </div>

      {!list.length ? (
        <EmptyState icon={Inbox} title="No leads match" text="Try a different filter or search." />
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {list.map((l) => (
              <LeadCard key={l.id} lead={l} />
            ))}
          </div>
          <div className="card hidden overflow-hidden md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-canvas text-xs font-semibold uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">Lead</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="hidden px-4 py-3 xl:table-cell">Enquiry</th>
                  <th className="px-4 py-3">Urgency</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Est. value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {list.map((l) => {
                  const [Icon, label] = SOURCE[l.source];
                  return (
                    <tr key={l.id} onClick={() => navigate(`/app/leads/${l.id}`)} className="cursor-pointer transition hover:bg-canvas">
                      <td className="px-4 py-3">
                        <Link to={`/app/leads/${l.id}`} className="font-semibold text-ink hover:text-secondary-ink" onClick={(e) => e.stopPropagation()}>
                          {l.customerName}
                        </Link>
                        <p className="text-xs text-muted">
                          {l.ref} · {l.postcode ?? '—'}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <ServiceBadge service={l.service} />
                      </td>
                      <td className="hidden max-w-xs px-4 py-3 xl:table-cell">
                        <p className="line-clamp-2 text-ink-2">{l.summary}</p>
                      </td>
                      <td className="px-4 py-3">
                        {l.urgency === 'urgent' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-danger-ink">
                            <TriangleAlert className="size-3.5" aria-hidden /> Urgent
                          </span>
                        ) : (
                          <span className="text-xs text-muted">Normal</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-ink-2">
                          <Icon className="size-3.5 text-muted" aria-hidden /> {label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge kind="lead" status={l.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted">{timeAgo(l.createdAt)}</td>
                      <td className="tabular px-4 py-3 text-right font-semibold text-ink">{l.estimatedValue !== undefined ? money(l.estimatedValue) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
