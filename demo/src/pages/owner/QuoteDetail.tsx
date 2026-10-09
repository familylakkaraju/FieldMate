import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Copy, Eye, FileText, Lock, Plus, Save, Send, Trash2, UserRound } from 'lucide-react';
import type { QuoteLine } from '../../types/domain';
import { useDemo } from '../../app/DemoProvider';
import { getCustomer, getJob, getLead } from '../../app/selectors';
import { uid } from '../../app/actions';
import { Card, CardHeader, EmptyState } from '../../components/common/Card';
import { Button, LinkButton } from '../../components/common/Button';
import { ServiceBadge, StatusBadge } from '../../components/common/Badge';
import { TextArea, TextInput, Toggle, inputClass } from '../../components/common/Form';
import { Timeline } from '../../components/common/Timeline';
import { useToast } from '../../components/common/Toast';
import { DocumentPreview } from '../../components/shared/DocumentPreview';
import { cx } from '../../utils/cx';
import { money, quoteTotals } from '../../utils/format';

export default function QuoteDetail() {
  const { id } = useParams();
  const { state, actions } = useDemo();
  const navigate = useNavigate();
  const toast = useToast();
  const d = state.data;
  const quote = d.quotes.find((q) => q.id === id);
  const [lines, setLines] = useState<QuoteLine[]>(quote?.lineItems ?? []);
  const [discount, setDiscount] = useState(String(quote?.discount ?? 0));
  const [vat, setVat] = useState(quote?.vat ?? false);
  const [notes, setNotes] = useState(quote?.notes ?? '');
  const [terms, setTerms] = useState(quote?.terms ?? '');
  const [title, setTitle] = useState(quote?.title ?? '');
  useEffect(() => {
    if (!quote) return;
    setLines(quote.lineItems);
    setDiscount(String(quote.discount));
    setVat(quote.vat);
    setNotes(quote.notes);
    setTerms(quote.terms);
    setTitle(quote.title);
    // reset local edits only when switching quote
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote?.id]);

  const draft = useMemo(() => (quote ? { ...quote, lineItems: lines, discount: Number(discount) || 0, vat, notes, terms, title } : undefined), [quote, lines, discount, vat, notes, terms, title]);
  if (!quote || !draft) return <EmptyState icon={FileText} title="Quote not found" action={<LinkButton to="/app/quotes">Back to quotes</LinkButton>} />;

  const customer = getCustomer(d, quote.customerId);
  const lead = getLead(d, quote.leadId);
  const job = getJob(d, quote.jobId);
  const locked = ['accepted', 'declined', 'expired'].includes(quote.status);
  const dirty = JSON.stringify(lines) !== JSON.stringify(quote.lineItems) || Number(discount) !== quote.discount || vat !== quote.vat || notes !== quote.notes || terms !== quote.terms || title !== quote.title;
  const totals = quoteTotals(lines, Number(discount) || 0, vat);
  const name = customer?.name ?? lead?.customerName ?? 'Customer';

  const save = (silent?: boolean) => {
    actions.updateQuote(quote.id, { lineItems: lines.filter((l) => l.description.trim()), discount: Number(discount) || 0, vat, notes, terms, title });
    if (!silent) toast({ title: 'Draft saved', description: quote.ref });
  };
  const send = () => {
    save(true);
    actions.sendQuote(quote.id);
    toast({ title: 'Quote sent', description: `${quote.ref} sent to ${name} — they can accept it in their portal (demo).`, action: { label: 'View as customer', to: `/portal/quotes/${quote.id}` } });
  };
  const duplicate = () => {
    const nid = actions.duplicateQuote(quote.id);
    if (nid) {
      toast({ title: 'Quote duplicated' });
      navigate(`/app/quotes/${nid}`);
    }
  };
  const setLine = (i: number, patch: Partial<QuoteLine>) => setLines((ls) => ls.map((l, k) => (k === i ? { ...l, ...patch } : l)));

  const history = [
    { id: 'c', at: quote.createdAt, kind: 'created' as const, text: `Quote ${quote.ref} created` },
    ...(quote.sentAt ? [{ id: 's', at: quote.sentAt, kind: 'quote' as const, text: 'Sent to customer' }] : []),
    ...(quote.viewedAt ? [{ id: 'v', at: quote.viewedAt, kind: 'quote' as const, text: 'Viewed by customer', by: 'customer' }] : []),
    ...(quote.acceptedAt ? [{ id: 'a', at: quote.acceptedAt, kind: 'quote' as const, text: 'Accepted', by: 'customer' }] : []),
    ...(quote.declinedAt ? [{ id: 'd', at: quote.declinedAt, kind: 'quote' as const, text: `Declined — ${quote.declineReason ?? ''}`, by: 'customer' }] : []),
  ];

  return (
    <div className="space-y-6">
      <Link to="/app/quotes" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> All quotes
      </Link>
      <div className="card p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge kind="quote" status={quote.status} />
              <ServiceBadge service={quote.service} />
              <span className="text-xs font-semibold text-muted">{quote.ref}</span>
            </div>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink">{quote.title}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-2">
              <span className="inline-flex items-center gap-1.5">
                <UserRound className="size-4 text-muted" aria-hidden />
                {customer ? (
                  <Link to={`/app/customers/${customer.id}`} className="font-semibold hover:text-secondary-ink">
                    {customer.name}
                  </Link>
                ) : lead ? (
                  <Link to={`/app/leads/${lead.id}`} className="font-semibold hover:text-secondary-ink">
                    {lead.customerName} (lead {lead.ref})
                  </Link>
                ) : (
                  name
                )}
              </span>
              {job && (
                <Link to={`/app/jobs/${job.id}`} className="font-semibold text-secondary-ink hover:underline">
                  {job.ref} · {job.title}
                </Link>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" icon={<Copy className="size-4" />} onClick={duplicate}>
              Duplicate
            </Button>
            <LinkButton to={`/portal/quotes/${quote.id}`} variant="outline" icon={<Eye className="size-4" />} onClick={() => actions.setPersona({ persona: 'customer', portalCustomerKey: customer?.email ?? lead?.email ?? state.persona.portalCustomerKey })}>
              Customer view
            </LinkButton>
            {!locked && (
              <>
                <Button variant="outline" icon={<Save className="size-4" />} onClick={() => save()} disabled={!dirty}>
                  Save Draft
                </Button>
                <Button icon={<Send className="size-4" />} onClick={send}>
                  {quote.status === 'draft' ? 'Send Quote' : 'Resend Quote'}
                </Button>
              </>
            )}
            {['sent', 'viewed'].includes(quote.status) && (
              <Button variant="soft" icon={<CheckCircle2 className="size-4" />} onClick={() => { actions.acceptQuote(quote.id, 'w-sophie'); toast({ title: 'Quote marked accepted' }); }}>
                Mark accepted
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6xl:grid-cols-[1.15fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Quote builder" subtitle={locked ? 'This quote is closed — duplicate it to make changes.' : 'Edit line items — the preview updates live.'} icon={locked ? Lock : FileText} />
            <TextInput label="Title" value={title} disabled={locked} onChange={(e) => setTitle(e.target.value)} />
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  <tr>
                    <th className="pb-2">Description</th>
                    <th className="w-28 pb-2">Type</th>
                    <th className="w-16 pb-2">Qty</th>
                    <th className="w-24 pb-2">Price £</th>
                    <th className="w-20 pb-2 text-right">Total</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, i) => (
                    <tr key={l.id} className="align-top">
                      <td className="py-1 pr-2">
                        <input aria-label={`Line ${i + 1} description`} disabled={locked} value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} className={cx(inputClass, 'h-10 text-sm')} />
                      </td>
                      <td className="py-1 pr-2">
                        <select aria-label={`Line ${i + 1} type`} disabled={locked} value={l.kind} onChange={(e) => setLine(i, { kind: e.target.value as QuoteLine['kind'] })} className={cx(inputClass, 'h-10 px-2 text-sm')}>
                          <option value="labour">Labour</option>
                          <option value="material">Material</option>
                          <option value="service">Service</option>
                        </select>
                      </td>
                      <td className="py-1 pr-2">
                        <input aria-label={`Line ${i + 1} quantity`} disabled={locked} inputMode="numeric" value={l.quantity} onChange={(e) => setLine(i, { quantity: Number(e.target.value) || 0 })} className={cx(inputClass, 'h-10 px-2 text-sm')} />
                      </td>
                      <td className="py-1 pr-2">
                        <input aria-label={`Line ${i + 1} price`} disabled={locked} inputMode="decimal" value={l.unitPrice} onChange={(e) => setLine(i, { unitPrice: Number(e.target.value) || 0 })} className={cx(inputClass, 'h-10 px-2 text-sm')} />
                      </td>
                      <td className="tabular py-3 text-right font-semibold">{money(l.quantity * l.unitPrice)}</td>
                      <td className="py-1 pl-1">
                        {!locked && (
                          <button type="button" aria-label={`Remove line ${i + 1}`} onClick={() => setLines((ls) => ls.filter((_, k) => k !== i))} className="grid size-10 place-items-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger-ink">
                            <Trash2 className="size-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!locked && (
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" variant="soft" icon={<Plus className="size-4" />} onClick={() => setLines((ls) => [...ls, { id: uid('ql'), description: 'Labour (per hour)', quantity: 1, unitPrice: 55, kind: 'labour' }])}>
                  Add labour
                </Button>
                <Button size="sm" variant="soft" icon={<Plus className="size-4" />} onClick={() => setLines((ls) => [...ls, { id: uid('ql'), description: 'Materials', quantity: 1, unitPrice: 20, kind: 'material' }])}>
                  Add material
                </Button>
              </div>
            )}
            <div className="mt-6 grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
              <TextInput label="Discount (£)" inputMode="decimal" disabled={locked} value={discount} onChange={(e) => setDiscount(e.target.value)} />
              <div className="pt-7">
                <Toggle label="Add VAT (20%)" description="Off — business not VAT registered (demo)" checked={vat} disabled={locked} onChange={setVat} />
              </div>
            </div>
            <div className="mt-4 space-y-1.5 rounded-xl bg-canvas p-4 text-sm">
              <div className="flex justify-between text-ink-2">
                <span>Subtotal</span>
                <span className="tabular">{money(totals.subtotal, true)}</span>
              </div>
              {totals.discount > 0 && (
                <div className="flex justify-between text-ink-2">
                  <span>Discount</span>
                  <span className="tabular">−{money(totals.discount, true)}</span>
                </div>
              )}
              {vat && (
                <div className="flex justify-between text-ink-2">
                  <span>VAT</span>
                  <span className="tabular">{money(totals.vatAmount, true)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-line pt-2 text-lg font-extrabold text-ink">
                <span>Total</span>
                <span className="tabular">{money(totals.total, true)}</span>
              </div>
            </div>
            <div className="mt-5 grid gap-4">
              <TextArea label="Notes to customer" rows={2} disabled={locked} value={notes} onChange={(e) => setNotes(e.target.value)} />
              <TextArea label="Terms" rows={3} disabled={locked} value={terms} onChange={(e) => setTerms(e.target.value)} />
            </div>
          </Card>
          <Card>
            <CardHeader title="Quote history" />
            <Timeline entries={history} compact />
          </Card>
        </div>
        <div className="xl:sticky xl:top-24 xl:self-start">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Customer preview</p>
          <DocumentPreview kind="quote" doc={draft} customer={customer} customerName={lead?.customerName} address={lead ? [lead.address, lead.town, lead.postcode].filter(Boolean).join(', ') : undefined} />
        </div>
      </div>
    </div>
  );
}
