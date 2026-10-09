import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  ClipboardList,
  FileText,
  Mail,
  MessageSquare,
  Phone,
  Sparkles,
  TriangleAlert,
  UserRound,
  UserPlus,
  XCircle,
} from 'lucide-react';
import { useDemo } from '../../app/DemoProvider';
import { getCustomer, getJob, getQuote, quoteTotal } from '../../app/selectors';
import { TASK_TEMPLATES, DEFAULT_CREW, QUOTE_TEMPLATES } from '../../data/templates';
import { Card, CardHeader, EmptyState, KeyValue } from '../../components/common/Card';
import { Button, LinkButton } from '../../components/common/Button';
import { ServiceBadge, StatusBadge } from '../../components/common/Badge';
import { Timeline } from '../../components/common/Timeline';
import { Modal } from '../../components/common/Modal';
import { SelectInput, TextInput } from '../../components/common/Form';
import { AvatarStack } from '../../components/common/Avatar';
import { useToast } from '../../components/common/Toast';
import { asset } from '../../utils/cx';
import { longDate, money, shortDate, timeAgo } from '../../utils/format';
import { DEMO_DATE } from '../../data/demoClock';

export default function LeadDetail() {
  const { id } = useParams();
  const { state, actions } = useDemo();
  const navigate = useNavigate();
  const toast = useToast();
  const d = state.data;
  const lead = d.leads.find((l) => l.id === id);
  const [convertOpen, setConvertOpen] = useState(false);
  const [visitOpen, setVisitOpen] = useState(false);
  const [lostOpen, setLostOpen] = useState(false);
  const [lostReason, setLostReason] = useState('Chose another company');
  const [visit, setVisit] = useState({ date: DEMO_DATE, start: '14:30', worker: '' });

  if (!lead) return <EmptyState icon={ClipboardList} title="Lead not found" action={<LinkButton to="/app/leads">Back to leads</LinkButton>} />;

  const svc = state.config.services.find((s) => s.id === lead.service)!;
  const job = getJob(d, lead.jobId);
  const customer = getCustomer(d, lead.customerId);
  const quote = getQuote(d, lead.quoteId);
  const key = lead.templateKey && TASK_TEMPLATES[lead.templateKey] ? lead.templateKey : lead.service;
  const taskPlan = TASK_TEMPLATES[key];
  const crew = lead.preferredSlot?.workerIds ?? DEFAULT_CREW[lead.service];
  const quoteLines = (lead.templateKey && QUOTE_TEMPLATES[lead.templateKey]) || lead.estimateLines || QUOTE_TEMPLATES[lead.service];
  const quoteSum = quote ? quoteTotal(quote) : quoteLines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const existingCustomer = lead.email ? d.customers.find((c) => c.email.toLowerCase() === lead.email!.toLowerCase()) : undefined;
  const closed = lead.status === 'converted' || lead.status === 'lost';

  const convert = () => {
    const jobId = actions.convertLeadToJob(lead.id);
    setConvertOpen(false);
    toast({ title: 'Converted to customer + job', description: `${lead.customerName} · ${jobId ? jobId.replace('job-', 'JOB-') : 'new job'} created${lead.preferredSlot ? ` and scheduled ${lead.preferredSlot.label}` : ''}`, action: jobId ? { label: 'Open job', to: `/app/jobs/${jobId}` } : undefined });
  };

  const createQuote = () => {
    const qid = actions.createQuoteForLead(lead.id);
    if (qid) navigate(`/app/quotes/${qid}`);
  };

  const contact = (how: string) => {
    actions.setLeadStatus(lead.id, lead.status === 'new' ? 'contacted' : lead.status, `${how} (demo)`);
    toast({ title: `${how} ${lead.customerName.split(' ')[0]}`, description: 'Demo only — nothing is sent. Logged on the lead history.', tone: 'info' });
  };

  const aiSummary =
    lead.service === 'gutter'
      ? `${lead.customerName.split(' ')[0]} wants ${(lead.summary.charAt(0).toLowerCase() + lead.summary.slice(1)).replace(/\.$/, '')}. ${lead.details.some((x) => /block|overflow|may be/i.test(x.value)) ? 'A blocked downpipe is likely — include downpipe clearance (£25) so the price doesn’t change on the day. ' : ''}${lead.preferredSlot ? `${crew.map((w) => d.team.find((m) => m.id === w)?.firstName).join(' & ')} are free for the chosen slot (${lead.preferredSlot.label}).` : 'Suggest the next Friday gutter slot.'}`
      : lead.service === 'plumbing'
        ? `${lead.urgency === 'urgent' ? 'Urgent: ' : ''}${lead.summary} ${lead.preferredSlot ? `Daniel is holding ${lead.preferredSlot.label}.` : ''} Typical fix is a cartridge or valve replacement — about 45–60 minutes on site. Quote call-out plus parts and send it before converting.`
        : `${lead.customerName.split(' ')[0]} is a good fit for the Great Baddow 4-weekly round (next visit Fri 6 Nov) — no extra travel. Recurring value ≈ ${money((lead.estimatedValue ?? 24) * 13)} a year.`;

  return (
    <div className="space-y-6">
      <Link to="/app/leads" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> All leads
      </Link>

      <div className="card p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge kind="lead" status={lead.status} />
              <ServiceBadge service={lead.service} />
              {lead.urgency === 'urgent' && (
                <span className="inline-flex h-6 items-center gap-1 rounded-full bg-danger-soft px-2.5 text-xs font-bold text-danger-ink">
                  <TriangleAlert className="size-3.5" aria-hidden /> Urgent
                </span>
              )}
              <span className="text-xs text-muted">
                {lead.ref} · {lead.source === 'website' ? 'Website quote' : lead.source === 'phone' ? 'Phone enquiry' : 'Referral'} · {timeAgo(lead.createdAt)}
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink md:text-[28px]">{lead.customerName}</h1>
            <p className="mt-1 text-[15px] text-ink-2">{lead.summary}</p>
          </div>
          {!closed && (
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Button variant="outline" icon={<FileText className="size-4" />} onClick={createQuote}>
                {quote ? 'Open Quote' : 'Create Quote'}
              </Button>
              <Button variant="outline" icon={<CalendarPlus className="size-4" />} onClick={() => setVisitOpen(true)}>
                Schedule Visit
              </Button>
              <Button variant="ghost" className="text-danger-ink" icon={<XCircle className="size-4" />} onClick={() => setLostOpen(true)}>
                Mark Lost
              </Button>
              <Button size="lg" icon={<UserPlus className="size-4.5" />} onClick={() => setConvertOpen(true)}>
                Convert to Customer + Job
              </Button>
            </div>
          )}
        </div>
      </div>

      {lead.status === 'converted' && (
        <div className="flex animate-rise flex-col gap-4 rounded-card border border-success/30 bg-success-soft p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-success-ink" aria-hidden />
            <div>
              <p className="font-bold text-ink">Converted to customer + job</p>
              <p className="text-sm text-ink-2">
                {customer?.name ?? lead.customerName} is now a customer{job ? ` · ${job.ref} ${job.title} ${job.scheduledStart ? `scheduled ${shortDate(job.scheduledStart)} ${job.scheduledStart.slice(11, 16)}` : 'awaiting scheduling'}` : ''}.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {customer && (
              <LinkButton to={`/app/customers/${customer.id}`} variant="outline" size="sm" icon={<UserRound className="size-4" />}>
                Customer
              </LinkButton>
            )}
            {job && (
              <LinkButton to={`/app/jobs/${job.id}`} size="sm" icon={<BriefcaseBusiness className="size-4" />}>
                Open job {job.ref}
              </LinkButton>
            )}
            <LinkButton to="/app/schedule" variant="outline" size="sm" icon={<CalendarDays className="size-4" />}>
              Schedule
            </LinkButton>
          </div>
        </div>
      )}
      {lead.status === 'lost' && (
        <div className="rounded-card border border-line bg-subtle p-4 text-sm text-ink-2">
          Marked lost{lead.lostReason ? ` — ${lead.lostReason}` : ''}.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Enquiry details" subtitle={lead.source === 'website' ? 'Captured by the instant quote wizard' : 'Logged by the office'} icon={ClipboardList} />
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {lead.details.map((x) => (
                <KeyValue key={x.label} label={x.label}>
                  {x.value}
                </KeyValue>
              ))}
              {lead.estimateRange && (
                <KeyValue label="Instant estimate shown">
                  {money(lead.estimateRange[0])}–{money(lead.estimateRange[1])}
                </KeyValue>
              )}
              {lead.preferredSlot && <KeyValue label="Preferred slot">{lead.preferredSlot.label}</KeyValue>}
            </dl>
            {lead.photo && (
              <figure className="mt-5">
                <img src={asset(lead.photo)} alt="Photo attached by the customer" className="h-48 w-full rounded-xl object-cover sm:w-80" />
                <figcaption className="mt-1.5 text-xs text-muted">Photo uploaded by customer (demo)</figcaption>
              </figure>
            )}
          </Card>
          <Card>
            <CardHeader title="Lead history" />
            <Timeline entries={lead.history} />
          </Card>
        </div>

        <div className="space-y-6">
          <div className="rounded-card border border-secondary-tint bg-gradient-to-b from-secondary-soft to-surface p-5">
            <p className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wider text-secondary-ink">
              <Sparkles className="size-4" aria-hidden /> AI summary
            </p>
            <p className="mt-2 text-[15px] leading-relaxed text-ink">{aiSummary}</p>
          </div>
          <Card>
            <CardHeader title="Contact" icon={UserRound} />
            <dl className="space-y-3 text-sm">
              <KeyValue label="Phone">{lead.phone ?? '—'}</KeyValue>
              <KeyValue label="Email">{lead.email ?? '—'}</KeyValue>
              <KeyValue label="Address">{[lead.address, lead.town, lead.postcode].filter(Boolean).join(', ') || '—'}</KeyValue>
              <KeyValue label="Prefers">{lead.preferredContact === 'sms' ? 'Text message' : lead.preferredContact === 'email' ? 'Email' : 'Phone call'}</KeyValue>
            </dl>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <Button variant="outline" size="sm" icon={<Phone className="size-4" />} onClick={() => contact('Called')}>
                Call
              </Button>
              <Button variant="outline" size="sm" icon={<MessageSquare className="size-4" />} onClick={() => contact('Texted')}>
                Text
              </Button>
              <Button variant="outline" size="sm" icon={<Mail className="size-4" />} onClick={() => contact('Emailed')}>
                Email
              </Button>
            </div>
          </Card>
          <Card>
            <CardHeader title="Estimated value" icon={FileText} action={quote && <StatusBadge kind="quote" status={quote.status} />} />
            <p className="tabular font-display text-3xl font-extrabold text-ink">{money(quoteSum)}</p>
            <ul className="mt-3 space-y-1.5 text-sm">
              {(quote ? quote.lineItems : quoteLines).map((l) => (
                <li key={l.description} className="flex justify-between gap-3">
                  <span className="text-ink-2">{l.description}</span>
                  <span className="tabular font-semibold">{money(l.unitPrice * l.quantity)}</span>
                </li>
              ))}
            </ul>
            {quote && (
              <Link to={`/app/quotes/${quote.id}`} className="mt-3 inline-block text-sm font-semibold text-secondary-ink hover:underline">
                {quote.ref} · open quote →
              </Link>
            )}
          </Card>
        </div>
      </div>

      {/* Convert */}
      <Modal
        open={convertOpen}
        onClose={() => setConvertOpen(false)}
        title="Convert to customer + job"
        description="FieldMate will create these records — nothing is retyped."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setConvertOpen(false)}>
              Cancel
            </Button>
            <Button data-autofocus icon={<CheckCircle2 className="size-4" />} onClick={convert}>
              Convert now
            </Button>
          </>
        }
      >
        <ol className="space-y-3">
          <li className="flex gap-3 rounded-xl border border-line p-3.5">
            <UserRound className="mt-0.5 size-5 shrink-0 text-secondary-ink" aria-hidden />
            <div>
              <p className="font-semibold text-ink">{existingCustomer ? 'Link to existing customer' : 'New customer'}: {lead.customerName}</p>
              <p className="text-sm text-muted">{[lead.address, lead.town, lead.postcode].filter(Boolean).join(', ')}</p>
            </div>
          </li>
          <li className="flex gap-3 rounded-xl border border-line p-3.5">
            <BriefcaseBusiness className="mt-0.5 size-5 shrink-0 text-secondary-ink" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">
                Job: {lead.customerName.split(' ').slice(-1)[0]} {svc.name === 'Gutter Cleaning' ? 'Gutter Clean' : svc.name === 'Plumbing' ? (key === 'sarah-tap' ? 'Kitchen Tap Repair' : 'Plumbing Repair') : 'Window Clean'} · {taskPlan.length} tasks
              </p>
              <p className="text-sm text-muted">{taskPlan.map((t) => t.title).join(' · ')}</p>
            </div>
          </li>
          <li className="flex gap-3 rounded-xl border border-line p-3.5">
            <CalendarDays className="mt-0.5 size-5 shrink-0 text-secondary-ink" aria-hidden />
            <div className="flex flex-1 flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-ink">{lead.preferredSlot ? `Scheduled ${longDate(lead.preferredSlot.date)}, ${lead.preferredSlot.start}–${lead.preferredSlot.end}` : 'Added to the unscheduled tray'}</p>
                <p className="text-sm text-muted">{lead.preferredSlot ? 'Customer’s chosen slot' : 'Schedule it from the planner'}</p>
              </div>
              {lead.preferredSlot && <AvatarStack ids={crew} size="sm" />}
            </div>
          </li>
          <li className="flex gap-3 rounded-xl border border-line p-3.5">
            <FileText className="mt-0.5 size-5 shrink-0 text-secondary-ink" aria-hidden />
            <div>
              <p className="font-semibold text-ink">
                {quote ? `Link quote ${quote.ref}` : 'Quote sent for approval'} · {money(quoteSum)}
              </p>
              <p className="text-sm text-muted">{quote ? `Status: ${quote.status}` : 'Customer can accept it in their portal'}</p>
            </div>
          </li>
        </ol>
      </Modal>

      {/* Schedule visit */}
      <Modal
        open={visitOpen}
        onClose={() => setVisitOpen(false)}
        title="Schedule a visit"
        description="Hold a survey or work slot for this lead."
        footer={
          <>
            <Button variant="outline" onClick={() => setVisitOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const [h, m] = visit.start.split(':').map(Number);
                const end = `${String(h + 1).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                const workers = visit.worker ? [visit.worker] : crew;
                actions.scheduleVisit(lead.id, { date: visit.date, start: visit.start, end, label: `${shortDate(visit.date)} · ${visit.start}–${end}`, workerIds: workers });
                setVisitOpen(false);
                toast({ title: 'Visit scheduled', description: `${shortDate(visit.date)} at ${visit.start}` });
              }}
            >
              Hold slot
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <TextInput label="Date" type="date" value={visit.date} onChange={(e) => setVisit({ ...visit, date: e.target.value })} />
          <TextInput label="Time" type="time" value={visit.start} onChange={(e) => setVisit({ ...visit, start: e.target.value })} />
          <SelectInput label="With" value={visit.worker} onChange={(e) => setVisit({ ...visit, worker: e.target.value })}>
            <option value="">Default crew</option>
            {d.team.filter((m) => !m.isOffice).map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </SelectInput>
        </div>
      </Modal>

      {/* Lost */}
      <Modal
        open={lostOpen}
        onClose={() => setLostOpen(false)}
        title="Mark lead as lost"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setLostOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                actions.setLeadStatus(lead.id, 'lost', lostReason);
                setLostOpen(false);
                toast({ title: 'Lead marked lost', description: lostReason, tone: 'warning' });
              }}
            >
              Mark lost
            </Button>
          </>
        }
      >
        <SelectInput label="Reason" value={lostReason} onChange={(e) => setLostReason(e.target.value)}>
          <option>Chose another company</option>
          <option>Price too high</option>
          <option>Outside service area</option>
          <option>No response</option>
          <option>No longer needed</option>
        </SelectInput>
      </Modal>
    </div>
  );
}
