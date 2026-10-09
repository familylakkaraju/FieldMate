import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ServiceType } from '../../types/domain';
import { useDemo } from '../../app/DemoProvider';
import { enabledServices, getCustomer, invoiceTotal, isOutstanding } from '../../app/selectors';
import { QUOTE_TEMPLATES } from '../../data/templates';
import { DEMO_DATE, addDays } from '../../data/demoClock';
import { money, shortDate } from '../../utils/format';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { SelectInput, TextInput, TextArea } from '../common/Form';
import { useToast } from '../common/Toast';
import { StatusBadge } from '../common/Badge';
import { cx } from '../../utils/cx';

type Kind = 'customer' | 'job' | 'quote' | 'payment';
interface Ctx {
  open: (k: Kind, opts?: { customerId?: string }) => void;
}
const QuickCtx = createContext<Ctx>({ open: () => undefined });
export const useQuickActions = () => useContext(QuickCtx);

export function QuickActionsProvider({ children }: { children: ReactNode }) {
  const [kind, setKind] = useState<Kind | null>(null);
  const [customerId, setCustomerId] = useState<string | undefined>();
  const open = useCallback((k: Kind, opts?: { customerId?: string }) => {
    setCustomerId(opts?.customerId);
    setKind(k);
  }, []);
  const close = () => setKind(null);
  const value = useMemo(() => ({ open }), [open]);
  return (
    <QuickCtx.Provider value={value}>
      {children}
      {kind === 'customer' && <NewCustomerModal onClose={close} />}
      {kind === 'job' && <NewJobModal onClose={close} presetCustomerId={customerId} />}
      {kind === 'quote' && <NewQuoteModal onClose={close} presetCustomerId={customerId} />}
      {kind === 'payment' && <RecordPaymentModal onClose={close} />}
    </QuickCtx.Provider>
  );
}

function NewCustomerModal({ onClose }: { onClose: () => void }) {
  const { actions } = useDemo();
  const navigate = useNavigate();
  const toast = useToast();
  const [f, setF] = useState({ name: '', email: '', phone: '', address: '', town: 'Chelmsford', postcode: '' });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const save = () => {
    const id = actions.createCustomer({ ...f, name: f.name.trim() || 'New customer' });
    toast({ title: 'Customer created', description: f.name || 'New customer' });
    onClose();
    navigate(`/app/customers/${id}`);
  };
  return (
    <Modal
      open
      onClose={onClose}
      title="New customer"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Create customer</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput label="Full name" value={f.name} onChange={set('name')} placeholder="e.g. Alex Morgan" data-autofocus />
        <TextInput label="Mobile" value={f.phone} onChange={set('phone')} placeholder="07700 900000" />
        <TextInput label="Email" type="email" value={f.email} onChange={set('email')} placeholder="name@example.com" className="sm:col-span-2" />
        <TextInput label="Address" value={f.address} onChange={set('address')} placeholder="House number and street" className="sm:col-span-2" />
        <TextInput label="Town" value={f.town} onChange={set('town')} />
        <TextInput label="Postcode" value={f.postcode} onChange={set('postcode')} placeholder="CM2 …" />
      </div>
    </Modal>
  );
}

function NewJobModal({ onClose, presetCustomerId }: { onClose: () => void; presetCustomerId?: string }) {
  const { state, actions } = useDemo();
  const navigate = useNavigate();
  const toast = useToast();
  const services = enabledServices(state.config);
  const customers = [...state.data.customers].sort((a, b) => a.name.localeCompare(b.name));
  const [customerId, setCustomerId] = useState(presetCustomerId ?? customers[0]?.id ?? '');
  const [service, setService] = useState<ServiceType>(services[0]?.id ?? 'gutter');
  const [date, setDate] = useState(addDays(DEMO_DATE, 3));
  const [start, setStart] = useState('10:00');
  const [workerId, setWorkerId] = useState('');
  const [notes, setNotes] = useState('');
  const workers = state.data.team.filter((m) => !m.isOffice && m.active);
  const save = () => {
    const id = actions.createJob({ customerId, service, date, start, workerIds: workerId ? [workerId] : undefined, instructions: notes || undefined });
    toast({ title: 'Job created', description: `${getCustomer(state.data, customerId)?.name ?? ''} · ${shortDate(date)} ${start}` });
    onClose();
    navigate(`/app/jobs/${id}`);
  };
  return (
    <Modal
      open
      onClose={onClose}
      title="New job"
      description="Tasks are created automatically from the service template."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!customerId}>
            Create job
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectInput label="Customer" value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="sm:col-span-2">
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} — {c.town}
            </option>
          ))}
        </SelectInput>
        <SelectInput label="Service" value={service} onChange={(e) => setService(e.target.value as ServiceType)}>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </SelectInput>
        <SelectInput label="Assign to" value={workerId} onChange={(e) => setWorkerId(e.target.value)}>
          <option value="">Default crew for service</option>
          {workers.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </SelectInput>
        <TextInput label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <TextInput label="Start time" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
        <TextArea label="Instructions (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} className="sm:col-span-2" rows={3} />
      </div>
    </Modal>
  );
}

function NewQuoteModal({ onClose, presetCustomerId }: { onClose: () => void; presetCustomerId?: string }) {
  const { state, actions } = useDemo();
  const navigate = useNavigate();
  const services = enabledServices(state.config);
  const customers = [...state.data.customers].sort((a, b) => a.name.localeCompare(b.name));
  const [customerId, setCustomerId] = useState(presetCustomerId ?? customers[0]?.id ?? '');
  const [service, setService] = useState<ServiceType>(services[0]?.id ?? 'gutter');
  const save = () => {
    const c = getCustomer(state.data, customerId);
    const svc = services.find((s) => s.id === service)!;
    const id = actions.createQuote({ service, title: `${svc.name} — ${c?.address ?? ''}`, customerId, lines: QUOTE_TEMPLATES[service] });
    onClose();
    navigate(`/app/quotes/${id}`);
  };
  return (
    <Modal
      open
      onClose={onClose}
      title="New quote"
      description="Starts from the service’s standard line items — edit everything in the quote builder."
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Open quote builder</Button>
        </>
      }
    >
      <div className="grid gap-4">
        <SelectInput label="Customer" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} — {c.town}
            </option>
          ))}
        </SelectInput>
        <SelectInput label="Service" value={service} onChange={(e) => setService(e.target.value as ServiceType)}>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </SelectInput>
      </div>
    </Modal>
  );
}

function RecordPaymentModal({ onClose }: { onClose: () => void }) {
  const { state, actions } = useDemo();
  const toast = useToast();
  const open = state.data.invoices.filter(isOutstanding);
  const [selected, setSelected] = useState(open[0]?.id ?? '');
  const [method, setMethod] = useState('Bank transfer');
  const save = () => {
    const inv = open.find((i) => i.id === selected);
    if (!inv) return;
    actions.markInvoicePaid(inv.id, method);
    toast({ title: 'Payment recorded', description: `${inv.ref} · ${money(invoiceTotal(inv))} · ${method}` });
    onClose();
  };
  return (
    <Modal
      open
      onClose={onClose}
      title="Record payment"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!selected}>
            Record payment
          </Button>
        </>
      }
    >
      {open.length === 0 ? (
        <p className="text-sm text-muted">No outstanding invoices — everything is paid.</p>
      ) : (
        <>
          <p className="mb-2 text-sm font-semibold text-ink-2">Outstanding invoice</p>
          <div className="space-y-2" role="radiogroup" aria-label="Outstanding invoices">
            {open.map((i) => (
              <button
                key={i.id}
                type="button"
                role="radio"
                aria-checked={selected === i.id}
                onClick={() => setSelected(i.id)}
                className={cx('flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left', selected === i.id ? 'border-secondary-solid bg-secondary-soft' : 'border-line hover:bg-subtle')}
              >
                <span>
                  <span className="block text-sm font-semibold text-ink">
                    {i.ref} · {getCustomer(state.data, i.customerId)?.name}
                  </span>
                  <span className="text-xs text-muted">Due {shortDate(i.dueDate)}</span>
                </span>
                <span className="flex items-center gap-2">
                  <StatusBadge kind="invoice" status={i.status} />
                  <span className="tabular font-bold text-ink">{money(invoiceTotal(i))}</span>
                </span>
              </button>
            ))}
          </div>
          <SelectInput label="Payment method" value={method} onChange={(e) => setMethod(e.target.value)} className="mt-4">
            <option>Bank transfer</option>
            <option>Card (on site)</option>
            <option>Card (online)</option>
            <option>Cash</option>
          </SelectInput>
        </>
      )}
    </Modal>
  );
}
