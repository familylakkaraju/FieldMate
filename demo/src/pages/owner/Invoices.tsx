import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlarmClock, BellRing, CheckCircle2, Eye, PoundSterling, ReceiptText, Send, Timer } from 'lucide-react';
import type { Invoice, InvoiceStatus } from '../../types/domain';
import { useDemo } from '../../app/DemoProvider';
import { getCustomer, getJob, invoiceTotal, isOutstanding } from '../../app/selectors';
import { DEMO_DATE } from '../../data/demoClock';
import { EmptyState, PageHeader, StatCard } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { FilterChips } from '../../components/common/Form';
import { StatusBadge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../components/common/Toast';
import { DocumentPreview } from '../../components/shared/DocumentPreview';
import { money, shortDate } from '../../utils/format';

export default function Invoices() {
  const { state, actions } = useDemo();
  const d = state.data;
  const toast = useToast();
  const [f, setF] = useState<'all' | 'outstanding' | InvoiceStatus>('all');
  const [view, setView] = useState<Invoice | null>(null);
  const open = d.invoices.filter(isOutstanding);
  const overdue = open.filter((i) => i.status === 'overdue');
  const paidMonth = d.invoices.filter((i) => i.status === 'paid' && i.paidAt?.startsWith(DEMO_DATE.slice(0, 7)));
  const list = d.invoices.filter((i) => (f === 'all' ? true : f === 'outstanding' ? isOutstanding(i) : i.status === f)).sort((a, b) => (a.issuedAt < b.issuedAt ? 1 : -1));
  const count = (s: InvoiceStatus) => d.invoices.filter((i) => i.status === s).length;

  const remind = (i: Invoice) => {
    actions.sendReminder(i.id);
    toast({ title: 'Reminder sent', description: `${i.ref} · ${getCustomer(d, i.customerId)?.name} (demo — nothing is sent)` });
  };
  const pay = (i: Invoice) => {
    actions.markInvoicePaid(i.id, 'Bank transfer');
    toast({ title: 'Marked paid', description: `${i.ref} · ${money(invoiceTotal(i))}` });
  };
  const send = (i: Invoice) => {
    actions.sendInvoice(i.id);
    toast({ title: 'Invoice sent', description: i.ref });
  };

  const actionsFor = (i: Invoice) => (
    <div className="flex flex-wrap justify-end gap-1.5">
      <Button size="sm" variant="ghost" icon={<Eye className="size-4" />} onClick={() => setView(i)}>
        View
      </Button>
      {i.status === 'draft' && (
        <Button size="sm" variant="soft" icon={<Send className="size-4" />} onClick={() => send(i)}>
          Send
        </Button>
      )}
      {isOutstanding(i) && (
        <>
          <Button size="sm" variant="outline" icon={<BellRing className="size-4" />} onClick={() => remind(i)}>
            Remind
          </Button>
          <Button size="sm" icon={<CheckCircle2 className="size-4" />} onClick={() => pay(i)}>
            Mark Paid
          </Button>
        </>
      )}
    </div>
  );

  return (
    <div>
      <PageHeader title="Invoices" subtitle="Invoices are created from accepted quotes — customers pay online in their portal." />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total due" value={money(open.reduce((a, i) => a + invoiceTotal(i), 0))} icon={ReceiptText} tone="amber" sub={`${open.length} invoices`} />
        <StatCard label="Overdue" value={money(overdue.reduce((a, i) => a + invoiceTotal(i), 0))} icon={AlarmClock} tone="red" sub={`${overdue.length} invoice${overdue.length === 1 ? '' : 's'}`} />
        <StatCard label="Paid this month" value={money(paidMonth.reduce((a, i) => a + invoiceTotal(i), 0))} icon={PoundSterling} tone="green" sub={`${paidMonth.length} payments`} />
        <StatCard label="Avg. days to pay" value="4.2" icon={Timer} tone="violet" sub="Last 90 days" />
      </div>
      <div className="mb-4">
        <FilterChips
          label="Invoice status"
          value={f}
          onChange={setF}
          options={[
            { value: 'all', label: 'All', count: d.invoices.length },
            { value: 'outstanding', label: 'Outstanding', count: open.length },
            ...(['draft', 'sent', 'due', 'overdue', 'paid'] as InvoiceStatus[]).map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1), count: count(s) })),
          ]}
        />
      </div>
      {!list.length ? (
        <EmptyState icon={ReceiptText} title="No invoices with this status" />
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {list.map((i) => (
              <div key={i.id} className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink">{getCustomer(d, i.customerId)?.name}</p>
                    <p className="text-xs text-muted">
                      {i.ref} · due {shortDate(i.dueDate) || '—'}
                    </p>
                  </div>
                  <StatusBadge kind="invoice" status={i.status} />
                </div>
                <p className="tabular mt-2 text-lg font-bold">{money(invoiceTotal(i))}</p>
                <div className="mt-2">{actionsFor(i)}</div>
              </div>
            ))}
          </div>
          <div className="card hidden overflow-hidden md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-canvas text-xs font-semibold uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Job</th>
                  <th className="px-4 py-3">Issued</th>
                  <th className="px-4 py-3">Due</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {list.map((i) => {
                  const job = getJob(d, i.jobId);
                  return (
                    <tr key={i.id} className="hover:bg-canvas">
                      <td className="px-4 py-3 font-semibold text-ink">
                        {i.ref}
                        {i.remindersSent > 0 && <p className="text-xs font-normal text-muted">{i.remindersSent} reminder{i.remindersSent > 1 ? 's' : ''} sent</p>}
                      </td>
                      <td className="px-4 py-3">
                        <Link to={`/app/customers/${i.customerId}`} className="text-ink-2 hover:text-secondary-ink">
                          {getCustomer(d, i.customerId)?.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {job && (
                          <Link to={`/app/jobs/${job.id}?tab=invoice`} className="text-ink-2 hover:text-secondary-ink">
                            {job.ref}
                          </Link>
                        )}
                      </td>
                      <td className="px-4 py-3 text-ink-2">{shortDate(i.issuedAt)}</td>
                      <td className="px-4 py-3 text-ink-2">{i.status === 'paid' ? `Paid ${shortDate(i.paidAt)}` : shortDate(i.dueDate) || '—'}</td>
                      <td className="px-4 py-3">
                        <StatusBadge kind="invoice" status={i.status} />
                      </td>
                      <td className="tabular px-4 py-3 text-right font-semibold">{money(invoiceTotal(i))}</td>
                      <td className="px-4 py-3">{actionsFor(i)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      <Modal open={!!view} onClose={() => setView(null)} title={view ? `Invoice ${view.ref}` : ''} size="lg" footer={view && isOutstanding(view) ? <Button onClick={() => { pay(view); setView(null); }}>Mark Paid</Button> : undefined}>
        {view && <DocumentPreview kind="invoice" doc={d.invoices.find((x) => x.id === view.id) ?? view} customer={getCustomer(d, view.customerId)} />}
      </Modal>
    </div>
  );
}
