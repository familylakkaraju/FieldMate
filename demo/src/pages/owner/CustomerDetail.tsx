import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BriefcaseBusiness, CalendarDays, FileText, Mail, MapPin, MessageSquare, Phone, PoundSterling, Repeat, StickyNote, Users } from 'lucide-react';
import type { TimelineEntry } from '../../types/domain';
import { useDemo } from '../../app/DemoProvider';
import { customerStats, invoiceTotal, quoteTotal } from '../../app/selectors';
import { Card, CardHeader, EmptyState, StatCard } from '../../components/common/Card';
import { Button, LinkButton } from '../../components/common/Button';
import { Avatar } from '../../components/common/Avatar';
import { Badge, ServiceBadge, StatusBadge } from '../../components/common/Badge';
import { Tabs } from '../../components/common/Tabs';
import { Timeline } from '../../components/common/Timeline';
import { TextArea } from '../../components/common/Form';
import { JobRow } from '../../components/owner/OwnerBits';
import { useQuickActions } from '../../components/owner/QuickActions';
import { useToast } from '../../components/common/Toast';
import { asset } from '../../utils/cx';
import { dayMonthYear, money, relativeDay, shortDate } from '../../utils/format';
import { DEMO_DATE } from '../../data/demoClock';

type Tab = 'overview' | 'jobs' | 'quotes' | 'invoices' | 'files' | 'notes';

export default function CustomerDetail() {
  const { id } = useParams();
  const { state, actions } = useDemo();
  const quick = useQuickActions();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('overview');
  const [note, setNote] = useState('');
  const d = state.data;
  const c = d.customers.find((x) => x.id === id);
  if (!c) return <EmptyState icon={Users} title="Customer not found" action={<LinkButton to="/app/customers">Back to customers</LinkButton>} />;
  const s = customerStats(d, c);
  const quotes = d.quotes.filter((q) => q.customerId === c.id);
  const files = d.evidence.filter((e) => e.customerId === c.id);
  const recurring = c.recurring ?? [];

  const timeline: TimelineEntry[] = [
    ...c.history.map((h, i) => ({ id: `h-${i}`, at: `${h.date}T12:00`, kind: 'task' as const, text: `${h.title} — ${money(h.value)}` })),
    ...s.jobs.flatMap((j) => j.timeline.map((e) => ({ ...e, text: `${j.ref}: ${e.text}` }))),
    ...s.invoices.filter((i) => i.paidAt).map((i) => ({ id: `p-${i.id}`, at: i.paidAt!, kind: 'payment' as const, text: `Paid ${i.ref} — ${money(invoiceTotal(i))}` })),
    { id: 'since', at: `${c.customerSince}T09:00`, kind: 'created', text: `Became a customer (${c.source})` },
  ];

  return (
    <div className="space-y-6">
      <Link to="/app/customers" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> All customers
      </Link>
      <div className="card p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <Avatar name={c.name} color="#1D4ED8" size="xl" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight text-ink">{c.name}</h1>
                {s.isRecurring && <Badge tone="teal" icon={<Repeat className="size-3" aria-hidden />}>Recurring</Badge>}
                {c.tags.filter((t) => !/Recurring/.test(t)).slice(0, 2).map((t) => (
                  <Badge key={t}>{t}</Badge>
                ))}
              </div>
              <div className="mt-2 flex flex-col gap-1 text-sm text-ink-2 sm:flex-row sm:flex-wrap sm:gap-x-5">
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="size-4 text-muted" aria-hidden /> {c.phone || '—'}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="size-4 text-muted" aria-hidden /> {c.email || '—'}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-4 text-muted" aria-hidden /> {c.address}, {c.town} {c.postcode}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-muted">
                Customer since {dayMonthYear(c.customerSince)} · {c.propertyType}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" icon={<MessageSquare className="size-4" />} onClick={() => toast({ title: `Text sent to ${c.name.split(' ')[0]}`, description: 'Demo only — nothing is sent.', tone: 'info' })}>
              Message
            </Button>
            <Button variant="outline" icon={<FileText className="size-4" />} onClick={() => quick.open('quote', { customerId: c.id })}>
              New Quote
            </Button>
            <Button icon={<BriefcaseBusiness className="size-4" />} onClick={() => quick.open('job', { customerId: c.id })}>
              New Job
            </Button>
          </div>
        </div>
      </div>

      <Tabs<Tab>
        label="Customer sections"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'jobs', label: 'Jobs', count: s.jobs.length + c.history.length },
          { id: 'quotes', label: 'Quotes', count: quotes.length },
          { id: 'invoices', label: 'Invoices', count: s.invoices.length },
          { id: 'files', label: 'Files', count: files.length },
          { id: 'notes', label: 'Notes', count: c.notes.length },
        ]}
      />

      {tab === 'overview' && (
        <div className="grid grid-cols-1 gap-6xl:grid-cols-[1.4fr_1fr]">
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Lifetime value" value={money(s.lifetimeValue)} icon={PoundSterling} tone="green" />
              <StatCard label="Outstanding" value={money(s.outstanding)} icon={FileText} tone={s.outstanding ? 'amber' : 'brand'} />
              <StatCard label="Last service" value={s.lastService ? shortDate(s.lastService) : '—'} icon={CalendarDays} />
              <StatCard label="Next service" value={s.nextService ? (s.nextService.slice(0, 10) <= DEMO_DATE ? 'Today' : shortDate(s.nextService)) : '—'} icon={Repeat} tone="accent" />
            </div>
            <Card>
              <CardHeader title="Upcoming & recent jobs" action={<button type="button" onClick={() => setTab('jobs')} className="text-[13px] font-semibold text-secondary-ink hover:underline">All jobs</button>} />
              <div className="space-y-2">
                {s.jobs.slice(0, 3).map((j) => (
                  <JobRow key={j.id} job={j} showDate />
                ))}
                {!s.jobs.length && <p className="text-sm text-muted">No jobs in FieldMate yet — history below was imported.</p>}
              </div>
            </Card>
            <Card>
              <CardHeader title="Timeline" />
              <Timeline entries={timeline} compact />
            </Card>
          </div>
          <div className="space-y-6">
            {recurring.length > 0 && (
              <Card>
                <CardHeader title="Recurring plan" icon={Repeat} />
                <ul className="space-y-3">
                  {recurring.map((r) => (
                    <li key={r.label} className="rounded-xl border border-line p-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-ink">{r.label}</p>
                        <ServiceBadge service={r.service} short />
                      </div>
                      <p className="mt-1 text-sm text-muted">
                        {money(r.pricePerVisit)} per visit · next due {relativeDay(r.nextDue)}
                      </p>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            <Card>
              <CardHeader title="Notes" icon={StickyNote} />
              {c.notes.slice(0, 2).map((n) => (
                <p key={n.id} className="mb-2 rounded-lg bg-warning-soft/60 p-3 text-sm text-ink-2">
                  {n.text}
                </p>
              ))}
              {!c.notes.length && <p className="text-sm text-muted">No notes yet.</p>}
            </Card>
          </div>
        </div>
      )}

      {tab === 'jobs' && (
        <div className="space-y-6">
          <div className="space-y-2">
            {s.jobs.map((j) => (
              <JobRow key={j.id} job={j} showDate />
            ))}
          </div>
          {c.history.length > 0 && (
            <Card>
              <CardHeader title="Earlier history" subtitle="Imported from previous records" />
              <ul className="divide-y divide-line text-sm">
                {c.history.map((h, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="flex items-center gap-3">
                      <span className="w-24 text-muted">{dayMonthYear(h.date)}</span>
                      <span className="text-ink">{h.title}</span>
                    </span>
                    <span className="flex items-center gap-3">
                      <ServiceBadge service={h.service} short />
                      <span className="tabular w-16 text-right font-semibold">{money(h.value)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      {tab === 'quotes' &&
        (quotes.length ? (
          <div className="card divide-y divide-line">
            {quotes.map((q) => (
              <Link key={q.id} to={`/app/quotes/${q.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-canvas">
                <div>
                  <p className="font-semibold text-ink">
                    {q.ref} · {q.title}
                  </p>
                  <p className="text-xs text-muted">Created {shortDate(q.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge kind="quote" status={q.status} />
                  <span className="tabular font-bold">{money(quoteTotal(q))}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState icon={FileText} title="No quotes yet" action={<Button onClick={() => quick.open('quote', { customerId: c.id })}>New Quote</Button>} />
        ))}

      {tab === 'invoices' &&
        (s.invoices.length ? (
          <div className="card divide-y divide-line">
            {s.invoices.map((i) => (
              <div key={i.id} className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold text-ink">{i.ref}</p>
                  <p className="text-xs text-muted">
                    Issued {shortDate(i.issuedAt)}
                    {i.dueDate ? ` · due ${shortDate(i.dueDate)}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge kind="invoice" status={i.status} />
                  <span className="tabular font-bold">{money(invoiceTotal(i))}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={FileText} title="No invoices yet" />
        ))}

      {tab === 'files' &&
        (files.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {files.map((f) => (
              <figure key={f.id} className="card overflow-hidden">
                <img src={asset(f.url)} alt={f.caption ?? ''} loading="lazy" className="aspect-square w-full object-cover" />
                <figcaption className="p-2.5 text-xs text-ink-2">
                  <span className="font-semibold uppercase text-muted">{f.type}</span> · {f.caption}
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <EmptyState icon={FileText} title="No files yet" text="Photos from jobs appear here automatically." />
        ))}

      {tab === 'notes' && (
        <div className="grid grid-cols-1 gap-6lg:grid-cols-[1fr_1fr]">
          <Card>
            <CardHeader title="Add a note" />
            <TextArea label="Note" value={note} onChange={(e) => setNote(e.target.value)} rows={4} placeholder="e.g. Prefers morning visits, dog in garden" />
            <Button
              className="mt-3"
              disabled={!note.trim()}
              onClick={() => {
                actions.addCustomerNote(c.id, note.trim());
                setNote('');
                toast({ title: 'Note saved' });
              }}
            >
              Save note
            </Button>
          </Card>
          <div className="space-y-3">
            {c.notes.map((n) => (
              <div key={n.id} className="card p-4">
                <p className="text-sm text-ink">{n.text}</p>
                <p className="mt-1 text-xs text-muted">
                  {relativeDay(n.at)} · {d.team.find((m) => m.id === n.by)?.name ?? 'Office'}
                </p>
              </div>
            ))}
            {!c.notes.length && <EmptyState icon={StickyNote} title="No notes yet" />}
          </div>
        </div>
      )}
    </div>
  );
}
