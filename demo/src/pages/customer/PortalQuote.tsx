import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, BadgeCheck, CheckCircle2, Clock, FileText, MessageSquare, SearchX, ShieldCheck, ThumbsUp, XCircle } from 'lucide-react';
import type { Quote } from '../../types/domain';
import { getCustomer, getJob, getLead, getQuote, quoteTotal } from '../../app/selectors';
import { dayMonthYear, longDate, money, relativeDay, time, timeRange } from '../../utils/format';
import { cx } from '../../utils/cx';
import { Button, LinkButton } from '../../components/common/Button';
import { Card, EmptyState } from '../../components/common/Card';
import { ServiceBadge } from '../../components/common/Badge';
import { SelectInput, TextArea } from '../../components/common/Form';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../components/common/Toast';
import { DocumentPreview } from '../../components/shared/DocumentPreview';
import { isQuotePending, PortalHeading, QuoteStatusBadge, usePortal } from '../../components/customer/PortalUi';

const DECLINE_REASONS = ['The price is higher than I expected', 'I’ve chosen another company', 'I no longer need the work', 'The timing doesn’t suit me', 'Something else'];

export default function PortalQuote() {
  const { id } = useParams();
  const { data, actions, name, company } = usePortal();
  const toast = useToast();
  const quote = getQuote(data, id);
  const viewed = useRef(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [justAccepted, setJustAccepted] = useState(false);
  const closeDecline = useCallback(() => setDeclineOpen(false), []);
  const closeAsk = useCallback(() => setAskOpen(false), []);

  const quoteId = quote?.id;
  const status = quote?.status;
  useEffect(() => {
    if (!quoteId || viewed.current) return;
    viewed.current = true;
    if (status === 'sent') actions.viewQuote(quoteId);
  }, [quoteId, status, actions]);

  if (!quote || quote.status === 'draft') {
    return (
      <div className="py-8">
        <EmptyState
          icon={quote ? Clock : SearchX}
          title={quote ? 'This quote is still being prepared' : 'We couldn’t find that quote'}
          text={quote ? 'We’ll let you know as soon as it’s ready to review.' : 'It may have been withdrawn or belongs to a different account.'}
          action={<LinkButton to="/portal/quotes">Back to quotes</LinkButton>}
        />
      </div>
    );
  }

  const job = getJob(data, quote.jobId);
  const qCustomer = getCustomer(data, quote.customerId);
  const qLead = getLead(data, quote.leadId);
  const author = qCustomer?.name ?? qLead?.customerName ?? name;
  const address = qLead ? [qLead.address, qLead.town, qLead.postcode].filter(Boolean).join(', ') : undefined;
  const total = quoteTotal(quote);
  const pending = isQuotePending(quote.status);

  const accept = () => {
    actions.acceptQuote(quote.id, 'customer');
    setJustAccepted(true);
    toast({ title: 'Quote accepted', description: `${company.companyName} has been notified — thank you!` });
  };

  const decline = (reason: string) => {
    actions.declineQuote(quote.id, reason);
    setDeclineOpen(false);
    toast({ title: 'Quote declined', description: 'Thanks for letting us know. You can still message us if anything changes.', tone: 'info' });
  };

  const ask = (text: string) => {
    setAskOpen(false);
    if (quote.jobId) {
      actions.sendMessage(quote.jobId, 'customer', author, `Question about quote ${quote.ref}: ${text}`);
      toast({ title: 'Question sent', description: `${company.companyName} will reply in your messages shortly.`, action: { label: 'View messages', to: `/portal/messages?job=${quote.jobId}` } });
    } else {
      toast({ title: 'Question sent', description: `${company.companyName} will get back to you by ${qLead?.preferredContact === 'phone' ? 'phone' : qLead?.preferredContact === 'sms' ? 'text' : 'email'} shortly (demo).` });
    }
  };

  return (
    <>
      <PortalHeading
        back={{ to: '/portal/quotes', label: 'Quotes' }}
        eyebrow={
          <div className="flex flex-wrap items-center gap-2">
            <ServiceBadge service={quote.service} />
            <span className="text-[13px] font-semibold text-muted">Sent {quote.sentAt ? dayMonthYear(quote.sentAt) : dayMonthYear(quote.createdAt)}</span>
          </div>
        }
        title={`Quote ${quote.ref}`}
        subtitle={quote.title}
        actions={<QuoteStatusBadge status={quote.status} className="h-7 px-3 text-[13px]" />}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <aside className="space-y-4 lg:sticky lg:top-24 lg:order-2" aria-label="Your decision">
          {pending ? (
            <Card className="animate-rise">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">Total price</p>
              <p className="tabular mt-1 font-display text-[40px] font-extrabold leading-none tracking-tight text-ink">{money(total, true)}</p>
              <p className="mt-2 text-sm text-muted">
                {quote.vat ? 'Including VAT' : 'No VAT to add'} · valid until {dayMonthYear(quote.validUntil)}
              </p>
              <ul className="mt-4 space-y-2 text-sm text-ink-2">
                {['Fixed price — no hidden extras', 'ID-checked, fully insured technicians', 'Pay online once the work is done'].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <BadgeCheck className="size-4 shrink-0 text-success" aria-hidden /> {t}
                  </li>
                ))}
              </ul>
              <div className="mt-5 grid gap-2">
                <Button size="lg" full icon={<ThumbsUp className="size-4.5" />} onClick={accept}>
                  Accept quote
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" icon={<MessageSquare className="size-4" />} onClick={() => setAskOpen(true)}>
                    Ask a question
                  </Button>
                  <Button variant="ghost" icon={<XCircle className="size-4" />} onClick={() => setDeclineOpen(true)}>
                    Decline
                  </Button>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted">By accepting you agree to the terms on the quote. Demo — no payment is taken.</p>
            </Card>
          ) : quote.status === 'accepted' ? (
            <AcceptedPanel quote={quote} animate={justAccepted} />
          ) : quote.status === 'declined' ? (
            <Card className="animate-rise">
              <span className="grid size-12 place-items-center rounded-2xl bg-danger-soft text-danger-ink">
                <XCircle className="size-6" aria-hidden />
              </span>
              <p className="mt-3 font-display text-lg font-extrabold text-ink">You declined this quote</p>
              <p className="mt-1 text-sm text-muted">
                {quote.declinedAt ? `${relativeDay(quote.declinedAt)} at ${time(quote.declinedAt)}` : 'Recently'}
                {quote.declineReason ? ` — “${quote.declineReason}”` : ''}
              </p>
              <Button variant="outline" full className="mt-4" icon={<MessageSquare className="size-4" />} onClick={() => setAskOpen(true)}>
                Changed your mind? Message us
              </Button>
            </Card>
          ) : (
            <Card className="animate-rise">
              <span className="grid size-12 place-items-center rounded-2xl bg-subtle text-muted">
                <Clock className="size-6" aria-hidden />
              </span>
              <p className="mt-3 font-display text-lg font-extrabold text-ink">This quote has expired</p>
              <p className="mt-1 text-sm text-muted">It was valid until {dayMonthYear(quote.validUntil)}. Ask us for an updated price — it only takes a minute.</p>
              <Button full className="mt-4" icon={<MessageSquare className="size-4" />} onClick={() => setAskOpen(true)}>
                Request an updated quote
              </Button>
            </Card>
          )}
          <p className="flex items-center gap-1.5 px-1 text-xs text-muted">
            <ShieldCheck className="size-3.5" aria-hidden /> Questions? Call {company.companyName} on {company.phone}.
          </p>
        </aside>

        <div className="min-w-0 lg:order-1">
          <DocumentPreview kind="quote" doc={quote} customer={qCustomer} customerName={qLead?.customerName ?? name} address={address} />
          {job && (
            <Link to={`/portal/jobs/${job.id}`} className="card mt-4 flex items-center gap-3 p-4 text-sm transition hover:shadow-raised">
              <FileText className="size-5 shrink-0 text-secondary-ink" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-ink">
                  Linked job {job.ref} · {job.title}
                </span>
                <span className="block text-muted">{job.scheduledStart ? `${relativeDay(job.scheduledStart)} · ${timeRange(job.scheduledStart, job.scheduledEnd)}` : 'Time to be confirmed'}</span>
              </span>
              <ArrowRight className="size-4 text-muted" aria-hidden />
            </Link>
          )}
        </div>
      </div>

      <DeclineModal open={declineOpen} onClose={closeDecline} onConfirm={decline} />
      <AskModal open={askOpen} onClose={closeAsk} onSend={ask} quoteRef={quote.ref} />
    </>
  );
}

function AcceptedPanel({ quote, animate }: { quote: Quote; animate: boolean }) {
  const { data } = usePortal();
  const job = getJob(data, quote.jobId);
  const lead = getLead(data, quote.leadId);
  const slot = lead?.preferredSlot;
  const seeYou = job?.scheduledStart
    ? `We’ll see you on ${longDate(job.scheduledStart)}, ${timeRange(job.scheduledStart, job.scheduledEnd)}.`
    : slot
      ? `We’ll see you on ${longDate(slot.date)}, ${slot.start}–${slot.end}.`
      : 'We’ll be in touch shortly to book your visit.';
  return (
    <Card className={cx('text-center', animate && 'animate-pop')}>
      <span className="relative mx-auto grid size-16 place-items-center rounded-full bg-success-soft text-success-ink">
        {animate && <span className="absolute inset-0 animate-pulse-ring rounded-full bg-success/30" aria-hidden />}
        <CheckCircle2 className="relative size-9" aria-hidden />
      </span>
      <p className="mt-4 font-display text-xl font-extrabold text-ink" role="status">
        Quote accepted — thank you!
      </p>
      <p className="mt-1.5 text-sm text-ink-2">{seeYou}</p>
      <p className="mt-3 text-xs text-muted">
        {quote.acceptedAt ? `Accepted ${relativeDay(quote.acceptedAt).toLowerCase() === 'today' ? 'today' : dayMonthYear(quote.acceptedAt)} at ${time(quote.acceptedAt)}` : 'Accepted'} · {money(quoteTotal(quote), true)}
      </p>
      {job && (
        <LinkButton to={`/portal/jobs/${job.id}`} full className="mt-4" iconRight={<ArrowRight className="size-4" />}>
          Track your job
        </LinkButton>
      )}
    </Card>
  );
}

function DeclineModal({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState(DECLINE_REASONS[0]);
  const [note, setNote] = useState('');
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Decline this quote?"
      description="Let us know why — it helps us improve."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Keep quote
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              onConfirm(note.trim() ? `${reason} — ${note.trim()}` : reason);
              setNote('');
            }}
          >
            Decline quote
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <SelectInput label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} data-autofocus>
          {DECLINE_REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </SelectInput>
        <TextArea label="Anything else? (optional)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. We’ve decided to wait until the spring" />
      </div>
    </Modal>
  );
}

function AskModal({ open, onClose, onSend, quoteRef }: { open: boolean; onClose: () => void; onSend: (text: string) => void; quoteRef: string }) {
  const [text, setText] = useState('');
  const send = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Ask a question"
      description={`About quote ${quoteRef} — we usually reply within the hour.`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button icon={<MessageSquare className="size-4" />} disabled={!text.trim()} onClick={send}>
            Send question
          </Button>
        </>
      }
    >
      <TextArea
        label="Your question"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="e.g. Does the price include clearing the extension gutter?"
        rows={4}
        data-autofocus
      />
    </Modal>
  );
}
