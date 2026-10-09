import { Link } from 'react-router-dom';
import { CheckCircle2, CreditCard, Eye, ReceiptText, Wallet } from 'lucide-react';
import type { Invoice } from '../../types/domain';
import { getJob, invoiceTotal, isOutstanding } from '../../app/selectors';
import { DEMO_DATE } from '../../data/demoClock';
import { dayMonthYear, money } from '../../utils/format';
import { cx } from '../../utils/cx';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/Card';
import { InvoiceStatusBadge, PortalHeading, PortalNoAccount, PortalPending, useInvoiceDialogs, usePortal } from '../../components/customer/PortalUi';

export default function PortalInvoices() {
  const { customer, lead, invoices } = usePortal();
  const { openPay, openView, dialogs } = useInvoiceDialogs();
  if (!customer) return lead ? <PortalPending what="Invoices" /> : <PortalNoAccount />;
  const outstanding = invoices.filter(isOutstanding);
  const toPay = outstanding.reduce((a, i) => a + invoiceTotal(i), 0);
  const paidThisYear = invoices.filter((i) => i.status === 'paid' && (i.paidAt ?? '').startsWith(DEMO_DATE.slice(0, 4))).reduce((a, i) => a + invoiceTotal(i), 0);

  return (
    <>
      <PortalHeading title="Invoices" subtitle="View, download and pay your invoices securely online." />

      <div className="mb-8 grid gap-3 sm:grid-cols-2">
        <div className={cx('card flex items-center gap-4 p-4 sm:p-5', toPay > 0 && 'ring-2 ring-secondary-tint')}>
          <span className={cx('grid size-12 shrink-0 place-items-center rounded-2xl', toPay > 0 ? 'bg-warning-soft text-warning-ink' : 'bg-success-soft text-success-ink')}>
            {toPay > 0 ? <Wallet className="size-6" aria-hidden /> : <CheckCircle2 className="size-6" aria-hidden />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-muted">To pay</p>
            <p className="tabular font-display text-2xl font-extrabold text-ink">{money(toPay, true)}</p>
            <p className="text-[13px] text-muted">{outstanding.length ? `${outstanding.length} ${outstanding.length === 1 ? 'invoice' : 'invoices'} outstanding` : 'You’re all paid up — thank you'}</p>
          </div>
          {outstanding.length === 1 && (
            <Button icon={<CreditCard className="size-4" />} onClick={() => openPay(outstanding[0].id)} className="max-sm:hidden">
              Pay now
            </Button>
          )}
        </div>
        <div className="card flex items-center gap-4 p-4 sm:p-5">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-secondary-soft text-secondary-ink">
            <ReceiptText className="size-6" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-muted">Paid in {DEMO_DATE.slice(0, 4)}</p>
            <p className="tabular font-display text-2xl font-extrabold text-ink">{money(paidThisYear, true)}</p>
            <p className="text-[13px] text-muted">Receipts are kept here for your records</p>
          </div>
        </div>
      </div>

      {invoices.length === 0 ? (
        <EmptyState icon={ReceiptText} title="No invoices yet" text="We’ll send your invoice here as soon as your work is complete — you can pay it online in seconds." />
      ) : (
        <ul className="grid gap-3" aria-label="Your invoices">
          {invoices.map((inv) => (
            <li key={inv.id}>
              <InvoiceRow invoice={inv} onPay={openPay} onView={openView} />
            </li>
          ))}
        </ul>
      )}
      <p className="mt-6 text-center text-xs text-muted">Demo portal — payments are simulated and no card is ever charged.</p>
      {dialogs}
    </>
  );
}

function InvoiceRow({ invoice, onPay, onView }: { invoice: Invoice; onPay: (id: string) => void; onView: (id: string) => void }) {
  const { data } = usePortal();
  const job = getJob(data, invoice.jobId);
  const total = invoiceTotal(invoice);
  const paid = invoice.status === 'paid';
  return (
    <article className={cx('card flex flex-col gap-4 p-4 transition sm:flex-row sm:items-center sm:p-5', !paid && 'border-secondary-tint')}>
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <span className={cx('grid size-12 shrink-0 place-items-center rounded-2xl', paid ? 'bg-success-soft text-success-ink' : 'bg-secondary-soft text-secondary-ink')}>
          {paid ? <CheckCircle2 className="size-6" aria-hidden /> : <ReceiptText className="size-6" aria-hidden />}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-base font-bold text-ink">{invoice.ref}</h2>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
          {job && (
            <Link to={`/portal/jobs/${job.id}`} className="block truncate text-sm text-ink-2 hover:text-secondary-ink hover:underline">
              {job.title} · {job.ref}
            </Link>
          )}
          <p className="mt-0.5 text-[13px] text-muted">
            Issued {dayMonthYear(invoice.issuedAt)} ·{' '}
            {paid ? (
              <span className="font-semibold text-success-ink">Paid on {dayMonthYear(invoice.paidAt)}</span>
            ) : (
              <span className={cx(invoice.status === 'overdue' && 'font-semibold text-danger-ink')}>Due {invoice.dueDate ? dayMonthYear(invoice.dueDate) : 'within 14 days'}</span>
            )}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 sm:flex-nowrap sm:justify-end sm:border-0 sm:pt-0">
        <p className="tabular font-display text-xl font-extrabold text-ink sm:mr-2">{money(total, true)}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" icon={<Eye className="size-3.5" />} onClick={() => onView(invoice.id)} aria-label={`${paid ? 'View receipt for' : 'View'} ${invoice.ref}`}>
            {paid ? 'Receipt' : 'View'}
          </Button>
          {!paid && (
            <Button size="sm" icon={<CreditCard className="size-3.5" />} onClick={() => onPay(invoice.id)} aria-label={`Pay ${invoice.ref} now, ${money(total, true)}`}>
              Pay now
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
