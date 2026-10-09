import type { Customer, Invoice, Quote, QuoteLine } from '../../types/domain';
import { useConfig } from '../../app/DemoProvider';
import { BrandMark } from '../common/Logo';
import { cx } from '../../utils/cx';
import { dayMonthYear, money, quoteTotals } from '../../utils/format';

/** A printable-looking quote or invoice rendered with the live brand. */
export function DocumentPreview({
  kind,
  doc,
  customer,
  customerName,
  address,
  className,
}: {
  kind: 'quote' | 'invoice';
  doc: Quote | Invoice;
  customer?: Customer;
  customerName?: string;
  address?: string;
  className?: string;
}) {
  const { company, branding } = useConfig();
  const lines: QuoteLine[] = doc.lineItems;
  const discount = kind === 'quote' ? (doc as Quote).discount : 0;
  const t = quoteTotals(lines, discount, doc.vat);
  const status = doc.status;
  const stamp = status === 'paid' ? 'PAID' : status === 'accepted' ? 'ACCEPTED' : status === 'draft' ? 'DRAFT' : status === 'overdue' ? 'OVERDUE' : status === 'declined' ? 'DECLINED' : '';
  return (
    <div className={cx('relative overflow-hidden rounded-xl border border-line bg-white p-6 text-[13px] text-ink shadow-card sm:p-8', className)}>
      {stamp && (
        <span
          className={cx(
            'pointer-events-none absolute right-6 top-24 rotate-[-12deg] rounded-lg border-4 px-3 py-1 font-display text-2xl font-extrabold tracking-widest opacity-25',
            stamp === 'PAID' || stamp === 'ACCEPTED' ? 'border-success text-success' : stamp === 'OVERDUE' || stamp === 'DECLINED' ? 'border-danger text-danger' : 'border-muted text-muted',
          )}
          aria-hidden
        >
          {stamp}
        </span>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <BrandMark mark={branding.logoMark} primary={branding.primaryColor} accent={branding.secondaryColor} dataUrl={branding.logoDataUrl} size={40} />
          <div>
            <p className="font-display text-base font-extrabold text-primary-ink">{company.companyName}</p>
            <p className="text-muted">{company.address}</p>
            <p className="text-muted">
              {company.phone} · {company.email}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-display text-xl font-extrabold uppercase tracking-wide text-primary-ink">{kind === 'quote' ? 'Quote' : 'Invoice'}</p>
          <p className="font-semibold">{doc.ref}</p>
          <p className="text-muted">
            {kind === 'quote' ? `Issued ${dayMonthYear((doc as Quote).createdAt)}` : `Issued ${dayMonthYear((doc as Invoice).issuedAt)}`}
          </p>
          <p className="text-muted">{kind === 'quote' ? `Valid until ${dayMonthYear((doc as Quote).validUntil)}` : (doc as Invoice).dueDate ? `Due ${dayMonthYear((doc as Invoice).dueDate)}` : 'Due 14 days from issue'}</p>
        </div>
      </div>
      <div className="mt-6 rounded-lg bg-canvas p-3.5">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted">{kind === 'quote' ? 'Prepared for' : 'Bill to'}</p>
        <p className="font-semibold">{customer?.name ?? customerName}</p>
        <p className="text-muted">{customer ? `${customer.address}, ${customer.town} ${customer.postcode}` : address}</p>
      </div>
      <table className="mt-6 w-full">
        <thead className="border-b border-line text-left text-[11px] uppercase tracking-wide text-muted">
          <tr>
            <th className="pb-2 font-bold">Description</th>
            <th className="w-12 pb-2 text-right font-bold">Qty</th>
            <th className="w-20 pb-2 text-right font-bold">Price</th>
            <th className="w-20 pb-2 text-right font-bold">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {lines.map((l) => (
            <tr key={l.id}>
              <td className="py-2.5 pr-3">{l.description}</td>
              <td className="tabular py-2.5 text-right">{l.quantity}</td>
              <td className="tabular py-2.5 text-right">{money(l.unitPrice, true)}</td>
              <td className="tabular py-2.5 text-right font-semibold">{money(l.unitPrice * l.quantity, true)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="ml-auto mt-4 w-full max-w-60 space-y-1.5">
        <div className="flex justify-between text-muted">
          <span>Subtotal</span>
          <span className="tabular">{money(t.subtotal, true)}</span>
        </div>
        {t.discount > 0 && (
          <div className="flex justify-between text-muted">
            <span>Discount</span>
            <span className="tabular">−{money(t.discount, true)}</span>
          </div>
        )}
        <div className="flex justify-between text-muted">
          <span>VAT {doc.vat ? '(20%)' : '(not registered)'}</span>
          <span className="tabular">{money(t.vatAmount, true)}</span>
        </div>
        <div className="flex justify-between border-t border-line pt-2 text-base font-extrabold text-primary-ink">
          <span>Total</span>
          <span className="tabular">{money(t.total, true)}</span>
        </div>
      </div>
      {kind === 'quote' && (doc as Quote).notes && <p className="mt-6 text-muted"><span className="font-semibold text-ink">Notes: </span>{(doc as Quote).notes}</p>}
      <p className="mt-6 border-t border-line pt-4 text-[11px] leading-relaxed text-muted">{kind === 'quote' ? (doc as Quote).terms : `Payment due within 14 days. Pay online from your customer portal. ${(doc as Invoice).paidAt ? `Paid ${dayMonthYear((doc as Invoice).paidAt)} — ${(doc as Invoice).method}.` : ''}`}</p>
      <p className="mt-2 text-[11px] text-muted">Demo document — fictional business, no real transaction.</p>
    </div>
  );
}
