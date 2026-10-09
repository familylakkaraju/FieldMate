import { ArrowRight, CalendarDays, CalendarPlus, Camera, CheckCircle2, ClipboardList, CreditCard, FileText, Headset, MapPin, MessageSquare, Phone, ReceiptText, Repeat, Sparkles } from 'lucide-react';
import type { Job, Lead, Quote } from '../../types/domain';
import { invoiceTotal, isOutstanding, jobAddress, jobProgress, quoteTotal } from '../../app/selectors';
import { DEMO_DATE } from '../../data/demoClock';
import { asset } from '../../utils/cx';
import { dayMonthYear, longDate, money, relativeDay, time, timeRange } from '../../utils/format';
import { Button, LinkButton } from '../../components/common/Button';
import { Card, CardHeader, CardLink, KeyValue, ProgressBar } from '../../components/common/Card';
import { ServiceBadge } from '../../components/common/Badge';
import { useToast } from '../../components/common/Toast';
import { EvidenceGrid } from '../../components/shared/EvidenceGrid';
import {
  crewNames,
  CrewList,
  DateTile,
  etaFor,
  groupJobs,
  InvoiceStatusBadge,
  isQuotePending,
  JobStatusBadge,
  jobSteps,
  liveStep,
  MiniTracker,
  PortalNoAccount,
  RecurringPlanCard,
  requestSteps,
  StepTimeline,
  useCallBusiness,
  useInvoiceDialogs,
  usePortal,
  whenPhrase,
} from '../../components/customer/PortalUi';

export default function PortalHome() {
  const { customer, lead } = usePortal();
  if (customer) return <CustomerHome />;
  if (lead) return <RequestReceived lead={lead} />;
  return <PortalNoAccount />;
}

// ---------------------------------------------------------------- greeting

function Hero({ firstName, line, chips }: { firstName: string; line: string; chips: string[] }) {
  return (
    <section className="relative overflow-hidden rounded-card bg-primary-solid p-6 text-primary-on shadow-raised sm:p-8">
      <span aria-hidden className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-secondary opacity-30 blur-3xl" />
      <span aria-hidden className="pointer-events-none absolute -bottom-28 right-28 size-60 rounded-full bg-accent opacity-25 blur-3xl" />
      <p className="relative text-[13px] font-semibold opacity-75">{longDate(DEMO_DATE)}</p>
      <h1 className="relative mt-1 font-display text-[32px] font-extrabold leading-tight tracking-tight sm:text-[40px]">Hello {firstName}</h1>
      <p className="relative mt-2 max-w-lg text-[15px] leading-relaxed opacity-90 sm:text-base">{line}</p>
      {chips.length > 0 && (
        <ul className="relative mt-5 flex flex-wrap gap-2">
          {chips.map((c) => (
            <li key={c} className="rounded-full bg-primary-on/12 px-3 py-1 text-[13px] font-semibold ring-1 ring-primary-on/15">
              {c}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function QuoteBanner({ quote }: { quote: Quote }) {
  return (
    <section className="card flex animate-rise flex-col gap-4 border-secondary-tint bg-secondary-soft/50 p-5 sm:flex-row sm:items-center">
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-secondary-solid text-secondary-on shadow-sm">
        <FileText className="size-6" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-wider text-secondary-ink">Quote awaiting your approval</p>
        <p className="mt-0.5 font-display text-lg font-bold text-ink">{quote.title}</p>
        <p className="text-sm text-muted">
          {quote.ref} · <span className="font-semibold text-ink">{money(quoteTotal(quote))}</span> · valid until {dayMonthYear(quote.validUntil)}
        </p>
      </div>
      <LinkButton to={`/portal/quotes/${quote.id}`} size="lg" iconRight={<ArrowRight className="size-4.5" />} className="max-sm:w-full">
        Review & accept
      </LinkButton>
    </section>
  );
}

function ContactCard() {
  const { company } = usePortal();
  const call = useCallBusiness();
  return (
    <Card>
      <CardHeader title={`Contact ${company.companyName}`} subtitle={company.openingHours} icon={Headset} />
      <div className="grid gap-2">
        <Button variant="outline" full icon={<Phone className="size-4" />} onClick={call}>
          Call {company.phone}
        </Button>
        <LinkButton to="/portal/messages" variant="soft" full icon={<MessageSquare className="size-4" />}>
          Send us a message
        </LinkButton>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------- converted customer

function CustomerHome() {
  const { data, config, customer, firstName, jobs, quotes, invoices, evidence } = usePortal();
  const { openPay, openView, dialogs } = useInvoiceDialogs();
  const toast = useToast();
  const c = customer!;
  const g = groupJobs(jobs);
  const current: Job | undefined = g.active[0] ?? g.upcoming[0] ?? g.done[0];
  const nextVisit = [...g.active, ...g.upcoming].find((j) => j.scheduledStart && !j.completedAt);
  const awaiting = quotes.filter((q) => isQuotePending(q.status));
  const outstanding = invoices.filter(isOutstanding);
  const lastPaid = invoices.find((i) => i.status === 'paid');
  const photos = evidence.filter((e) => e.type !== 'document').slice(0, 4);
  const plans = c.recurring ?? [];
  const nextPlan = [...plans].filter((p) => p.nextDue >= DEMO_DATE).sort((a, b) => (a.nextDue < b.nextDue ? -1 : 1))[0];
  const svcName = (j: Job) => (config.services.find((s) => s.id === j.service)?.name ?? 'visit').toLowerCase();
  const toPay = outstanding.reduce((a, i) => a + invoiceTotal(i), 0);

  let line = 'Everything’s up to date — thanks for choosing us.';
  if (current?.status === 'in-progress') {
    const crew = crewNames(data, current.assignedWorkerIds) || 'Your technician';
    line = `${crew} ${current.assignedWorkerIds.length > 1 ? 'are' : 'is'} working on your ${svcName(current)} right now — follow along live.`;
  } else if (current?.status === 'blocked') line = `Your ${svcName(current)} is briefly paused — ${current.blockedReason ?? 'we’ll update you shortly'}.`;
  else if (nextVisit?.onTheWayAt && !nextVisit.startedAt) line = `${crewNames(data, nextVisit.assignedWorkerIds) || 'Your technician'} is on the way — arriving around ${etaFor(nextVisit)}.`;
  else if (nextVisit?.scheduledStart) line = `Your ${svcName(nextVisit)} is booked for ${whenPhrase(nextVisit.scheduledStart)}, ${timeRange(nextVisit.scheduledStart, nextVisit.scheduledEnd)}.`;
  else if (awaiting.length) line = 'You have a quote waiting for your approval.';
  else if (outstanding.length) line = `Your invoice for ${money(toPay, true)} is ready to pay online.`;

  const chips = [
    g.active.length ? `${g.active.length} active ${g.active.length === 1 ? 'job' : 'jobs'}` : '',
    awaiting.length ? `${awaiting.length} ${awaiting.length === 1 ? 'quote' : 'quotes'} to review` : '',
    toPay ? `${money(toPay, true)} to pay` : invoices.length ? 'Nothing to pay' : '',
    plans.length ? `${plans.length} recurring ${plans.length === 1 ? 'plan' : 'plans'}` : '',
  ].filter(Boolean);

  const steps = current ? jobSteps(data, current) : [];
  const live = current ? liveStep(current) : undefined;
  const prog = current ? jobProgress(data, current) : undefined;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <Hero firstName={firstName} line={line} chips={chips} />

        {/* Upcoming appointment */}
        <Card className="flex flex-col">
          <CardHeader title="Upcoming appointment" icon={CalendarDays} />
          {nextVisit?.scheduledStart ? (
            <>
              <div className="flex items-start gap-4">
                <DateTile iso={nextVisit.scheduledStart} />
                <div className="min-w-0">
                  <p className="font-display text-lg font-bold text-ink">{relativeDay(nextVisit.scheduledStart)}</p>
                  <p className="text-sm text-ink-2">Arrival {timeRange(nextVisit.scheduledStart, nextVisit.scheduledEnd)}</p>
                  <div className="mt-1.5">
                    <ServiceBadge service={nextVisit.service} />
                  </div>
                </div>
              </div>
              <div className="mt-4 border-t border-line pt-4">
                <p className="mb-2.5 text-xs font-bold uppercase tracking-wide text-muted">Your {nextVisit.assignedWorkerIds.length > 1 ? 'technicians' : 'technician'}</p>
                <CrewList ids={nextVisit.assignedWorkerIds} />
              </div>
              {nextVisit.status === 'in-progress' || nextVisit.status === 'blocked' ? (
                <div className="mt-auto pt-4">
                  <p className="flex items-center gap-2 rounded-lg bg-success-soft px-3 py-2 text-[13px] font-semibold text-success-ink">
                    <CheckCircle2 className="size-4 shrink-0" aria-hidden />
                    Your technician is on site — since {time(nextVisit.startedAt) || 'this morning'}
                  </p>
                </div>
              ) : (
                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<CalendarPlus className="size-3.5" />}
                    onClick={() => toast({ title: 'Added to your calendar', description: `${longDate(nextVisit.scheduledStart)} · ${timeRange(nextVisit.scheduledStart, nextVisit.scheduledEnd)} (demo invite).` })}
                  >
                    Add to calendar
                  </Button>
                  <LinkButton to={`/portal/messages?job=${nextVisit.id}`} variant="ghost" size="sm">
                    Need to change it?
                  </LinkButton>
                </div>
              )}
            </>
          ) : nextPlan ? (
            <div className="flex flex-1 flex-col">
              <div className="flex items-start gap-4">
                <DateTile iso={nextPlan.nextDue} />
                <div>
                  <p className="font-display text-lg font-bold text-ink">{nextPlan.label}</p>
                  <p className="text-sm text-ink-2">Due {whenPhrase(nextPlan.nextDue)}</p>
                  <p className="mt-1 text-[13px] text-muted">We’ll text you the day before with an arrival window.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-start">
              <p className="text-sm text-muted">No visits booked at the moment.</p>
              <LinkButton to="/quote" variant="soft" size="sm" className="mt-3" icon={<Sparkles className="size-3.5" />}>
                Book another service
              </LinkButton>
            </div>
          )}
        </Card>
      </div>

      {awaiting.map((q) => (
        <QuoteBanner key={q.id} quote={q} />
      ))}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Current job */}
          {current ? (
            <Card className="animate-rise">
              <CardHeader title="Current job status" subtitle={`${current.ref} · ${current.title}`} icon={ClipboardList} action={<JobStatusBadge job={current} />} />
              <MiniTracker steps={steps} live={!!live} />
              {live && prog && live.key === 'started' && (
                <div className="mt-4 rounded-xl border border-line bg-canvas p-3.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-ink">{live.tone === 'warning' ? 'Work paused' : 'Work in progress'}</span>
                    <span className="tabular font-bold text-secondary-ink">{prog.pct}% done</span>
                  </div>
                  <ProgressBar value={prog.pct} className="mt-2" label="Work progress" tone={live.tone === 'warning' ? 'amber' : 'brand'} />
                  <p className="mt-1.5 text-xs text-muted">
                    {prog.done} of {prog.total} tasks complete{current.startedAt ? ` · started ${time(current.startedAt)}` : ''}
                  </p>
                </div>
              )}
              <div className="mt-5 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex min-w-0 items-center gap-1.5 text-[13px] text-muted">
                  <MapPin className="size-4 shrink-0" aria-hidden />
                  <span className="truncate">{jobAddress(data, current)}</span>
                </p>
                <LinkButton to={`/portal/jobs/${current.id}`} size="sm" iconRight={<ArrowRight className="size-3.5" />} className="max-sm:w-full">
                  {live ? 'Follow live' : 'View job'}
                </LinkButton>
              </div>
            </Card>
          ) : (
            <Card>
              <CardHeader title="Current job status" icon={ClipboardList} />
              <p className="text-sm text-muted">You don’t have any jobs with us yet.</p>
            </Card>
          )}

          {/* Recent photos */}
          <Card>
            <CardHeader
              title="Recent photos"
              subtitle="Before & after photos from your technicians"
              icon={Camera}
              action={photos.length ? <CardLink to={`/portal/jobs/${photos[0].jobId}`}>View job</CardLink> : undefined}
            />
            <EvidenceGrid items={photos} cols="grid-cols-2 sm:grid-cols-4" empty="Photos from your visit will appear here." />
          </Card>
        </div>

        <div className="space-y-6">
          {/* Invoice */}
          <Card>
            <CardHeader title="Invoice" icon={ReceiptText} action={invoices.length ? <CardLink to="/portal/invoices">All invoices</CardLink> : undefined} />
            {outstanding[0] ? (
              <div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted">{outstanding[0].ref}</p>
                  <InvoiceStatusBadge status={outstanding[0].status} />
                </div>
                <p className="tabular mt-1 font-display text-[32px] font-extrabold leading-tight text-ink">{money(invoiceTotal(outstanding[0]), true)}</p>
                <p className="text-[13px] text-muted">{outstanding[0].dueDate ? `Due ${dayMonthYear(outstanding[0].dueDate)}` : 'Due within 14 days'}</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button icon={<CreditCard className="size-4" />} onClick={() => openPay(outstanding[0].id)}>
                    Pay now
                  </Button>
                  <Button variant="outline" onClick={() => openView(outstanding[0].id)}>
                    View
                  </Button>
                </div>
              </div>
            ) : lastPaid ? (
              <div>
                <p className="flex items-center gap-2 font-semibold text-success-ink">
                  <CheckCircle2 className="size-5" aria-hidden /> All paid — thank you
                </p>
                <p className="mt-1 text-sm text-muted">
                  {lastPaid.ref} · {money(invoiceTotal(lastPaid), true)} paid on {dayMonthYear(lastPaid.paidAt)}
                </p>
                <Button variant="outline" size="sm" className="mt-3" icon={<ReceiptText className="size-3.5" />} onClick={() => openView(lastPaid.id)}>
                  View receipt
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted">No invoices yet — we’ll send one here once your work is complete.</p>
            )}
          </Card>

          {plans.length > 0 && (
            <Card>
              <CardHeader title={plans.length > 1 ? 'Your plans' : 'Your plan'} icon={Repeat} action={<CardLink to="/portal/jobs">Manage</CardLink>} />
              <div className="space-y-3">
                {plans.map((p) => (
                  <RecurringPlanCard key={`${p.service}-${p.label}`} plan={p} />
                ))}
              </div>
            </Card>
          )}

          <ContactCard />
        </div>
      </div>
      {dialogs}
    </div>
  );
}

// ---------------------------------------------------------------- request not yet converted

function RequestReceived({ lead }: { lead: Lead }) {
  const { config, company, firstName, quotes } = usePortal();
  const svc = config.services.find((s) => s.id === lead.service);
  const awaiting = quotes.filter((q) => isQuotePending(q.status));
  const lost = lead.status === 'lost';
  const address = [lead.address, lead.town, lead.postcode].filter(Boolean).join(', ');
  const steps = requestSteps(lead);
  const contactBy = lead.preferredContact === 'email' ? `by email to ${lead.email}` : lead.phone ? `by text to ${lead.phone}` : 'shortly';
  return (
    <div className="space-y-6">
      <Hero
        firstName={firstName}
        line={lost ? `Thanks for thinking of ${company.companyName}. This request has been closed — get in touch if anything changes.` : `Thanks for your ${svc?.name.toLowerCase() ?? 'service'} request — here’s where things stand.`}
        chips={[`Reference ${lead.ref}`, `Sent ${relativeDay(lead.createdAt).toLowerCase()} at ${time(lead.createdAt)}`]}
      />

      {awaiting.map((q) => (
        <QuoteBanner key={q.id} quote={q} />
      ))}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card className="animate-rise">
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 animate-pop place-items-center rounded-2xl bg-success-soft text-success-ink">
              <CheckCircle2 className="size-6" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-success-ink">{lost ? 'Request closed' : 'Request received'}</p>
              <h2 className="mt-0.5 font-display text-xl font-extrabold text-ink">
                {svc?.name ?? 'Service'} request · {lead.ref}
              </h2>
              <p className="text-sm text-muted">
                Sent {relativeDay(lead.createdAt).toLowerCase()} at {time(lead.createdAt)}
              </p>
            </div>
          </div>

          {!lost && (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-secondary-tint bg-secondary-soft p-4">
              <MessageSquare className="mt-0.5 size-5 shrink-0 text-secondary-ink" aria-hidden />
              <div>
                <p className="font-semibold text-ink">We’re confirming your booking — you’ll get a text shortly</p>
                <p className="mt-0.5 text-sm text-ink-2">
                  {company.companyName} will confirm your technician and arrival time {contactBy}.
                </p>
              </div>
            </div>
          )}

          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <KeyValue label="Your request" className="sm:col-span-2">
              {lead.summary}
            </KeyValue>
            <KeyValue label="Preferred slot">{lead.preferredSlot?.label ?? 'We’ll call to arrange a time'}</KeyValue>
            <KeyValue label="Instant estimate">{lead.estimateRange ? `${money(lead.estimateRange[0])}–${money(lead.estimateRange[1])}` : 'Confirmed after a quick look'}</KeyValue>
            {address && (
              <KeyValue label="Address" className="sm:col-span-2">
                {address}
              </KeyValue>
            )}
          </dl>

          {lead.details.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-2" aria-label="Details you gave us">
              {lead.details
                .filter((d) => d.label !== 'Photo')
                .map((d) => (
                  <li key={d.label} className="rounded-full bg-subtle px-3 py-1 text-[13px] text-ink-2">
                    <span className="font-semibold text-ink">{d.label}:</span> {d.value}
                  </li>
                ))}
            </ul>
          )}

          {lead.photo && (
            <figure className="mt-5 flex items-center gap-3 rounded-xl border border-line p-2.5">
              <img src={asset(lead.photo)} alt="Photo you sent with your request" className="size-16 rounded-lg object-cover" loading="lazy" />
              <figcaption className="text-sm text-ink-2">
                <span className="block font-semibold text-ink">Your photo</span>
                Thanks — this helps your technician bring the right kit.
              </figcaption>
            </figure>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Progress" subtitle="We’ll update this as things happen" icon={ClipboardList} />
            <StepTimeline steps={steps} live={lost ? undefined : { key: 'request', label: 'Confirming', tone: 'success' }} />
          </Card>
          <ContactCard />
        </div>
      </div>
    </div>
  );
}
