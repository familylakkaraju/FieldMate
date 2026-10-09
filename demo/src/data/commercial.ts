import type { Invoice, Quote, QuoteLine } from '../types/domain';
import { QUOTE_TERMS } from './templates';

let lineSeq = 0;
const ln = (description: string, unitPrice: number, kind: QuoteLine['kind'] = 'service', quantity = 1): QuoteLine => ({
  id: `ql-${++lineSeq}`,
  description,
  quantity,
  unitPrice,
  kind,
});

const q = (x: Omit<Quote, 'discount' | 'vat' | 'notes' | 'terms'> & Partial<Pick<Quote, 'discount' | 'vat' | 'notes' | 'terms'>>): Quote => ({
  discount: 0,
  vat: false,
  notes: '',
  terms: QUOTE_TERMS,
  ...x,
});

export const QUOTES: Quote[] = [
  q({ id: 'q-2039', ref: 'Q-2039', customerId: 'cus-ellis', jobId: 'job-1038', service: 'plumbing', title: 'Radiator valve replacement', status: 'accepted', createdAt: '2026-10-01T16:00', validUntil: '2026-10-31', sentAt: '2026-10-01T16:05', acceptedAt: '2026-10-02T09:12',
    lineItems: [ln('Replace TRV & lockshield valve — labour', 95, 'labour'), ln('TRV & lockshield valve pair (15mm)', 35, 'material'), ln('Inhibitor top-up & system balance', 15, 'service')] }),
  q({ id: 'q-2041', ref: 'Q-2041', customerId: 'cus-evans', service: 'gutter', title: 'Gutter guard supply & fit', status: 'expired', createdAt: '2026-08-31T11:00', validUntil: '2026-09-30', sentAt: '2026-08-31T11:10', viewedAt: '2026-09-01T20:14',
    lineItems: [ln('Gutter guard mesh — supply (24m)', 168, 'material'), ln('Fitting — front & rear runs', 172, 'labour')] }),
  q({ id: 'q-2042', ref: 'Q-2042', customerId: 'cus-hall', service: 'window', title: 'Conservatory roof clean', status: 'declined', createdAt: '2026-09-15T10:00', validUntil: '2026-10-15', sentAt: '2026-09-15T10:05', declinedAt: '2026-09-18T08:40', declineReason: 'Going to leave it until spring',
    lineItems: [ln('Conservatory roof clean — polycarbonate', 95, 'service')] }),
  q({ id: 'q-2044', ref: 'Q-2044', customerId: 'cus-turner', jobId: 'job-1048', service: 'gutter', title: 'Gutter & fascia clean', status: 'viewed', createdAt: '2026-10-05T11:00', validUntil: '2026-11-04', sentAt: '2026-10-05T11:04', viewedAt: '2026-10-06T19:32',
    lineItems: [ln('Gutter vacuum — 4-bed detached, all runs', 120, 'service'), ln('Fascia & soffit wash', 65, 'service')] }),
  q({ id: 'q-2045', ref: 'Q-2045', customerId: 'cus-murphy', jobId: 'job-1050', service: 'window', title: 'Conservatory roof clean', status: 'draft', createdAt: '2026-10-07T14:00', validUntil: '2026-11-06',
    lineItems: [ln('Conservatory roof clean — polycarbonate', 110, 'service'), ln('Conservatory gutters & frames', 50, 'service')], notes: 'Roof is approx. 4m x 3.5m. Soft wash, no pressure washing.' }),
  q({ id: 'q-2046', ref: 'Q-2046', customerId: 'cus-morrison', jobId: 'job-1044', service: 'window', title: 'Full window clean incl. conservatory', status: 'accepted', createdAt: '2026-10-02T11:00', validUntil: '2026-11-01', sentAt: '2026-10-02T11:05', viewedAt: '2026-10-02T12:30', acceptedAt: '2026-10-02T12:31',
    lineItems: [ln('Full clean — all windows inside & out', 70, 'service'), ln('Frames & sills', 15, 'service'), ln('Conservatory roof & glass', 35, 'service')] }),
  q({ id: 'q-2047', ref: 'Q-2047', customerId: 'cus-okafor', jobId: 'job-1043', service: 'plumbing', title: 'Outside tap installation', status: 'accepted', createdAt: '2026-10-06T13:00', validUntil: '2026-11-05', sentAt: '2026-10-06T13:02', viewedAt: '2026-10-06T14:40', acceptedAt: '2026-10-06T15:20',
    lineItems: [ln('Outside tap installation — labour', 85, 'labour'), ln('Outside tap, wall plate & double check valve', 32, 'material'), ln('Pipework, tee & isolation valve', 18, 'material')] }),
  q({ id: 'q-2048', ref: 'Q-2048', customerId: 'cus-patel', jobId: 'job-1040', service: 'plumbing', title: 'Kitchen waste repair', status: 'accepted', createdAt: '2026-10-05T09:30', validUntil: '2026-11-04', sentAt: '2026-10-05T09:34', acceptedAt: '2026-10-05T10:20',
    lineItems: [ln('Kitchen waste & trap replacement — labour', 110, 'labour'), ln('40mm waste pipe, trap & fittings', 55, 'material')] }),
  q({ id: 'q-2049', ref: 'Q-2049', leadId: 'lead-john', service: 'plumbing', title: 'Toilet cistern repair', status: 'viewed', createdAt: '2026-10-07T09:10', validUntil: '2026-11-06', sentAt: '2026-10-07T09:15', viewedAt: '2026-10-08T19:02',
    lineItems: [ln('Call-out & labour (1 hour)', 85, 'labour'), ln('Fill valve (bottom entry)', 28, 'material'), ln('Flush valve & seal kit', 32, 'material'), ln('Sundries & disposal', 20, 'service')] }),
  q({ id: 'q-2050', ref: 'Q-2050', customerId: 'cus-thompson', jobId: 'job-1041', service: 'gutter', title: 'Annual gutter clean', status: 'accepted', createdAt: '2026-09-22T11:40', validUntil: '2026-10-22', sentAt: '2026-09-22T11:42', acceptedAt: '2026-09-22T11:58',
    lineItems: [ln('Gutter vacuum — 3-bed semi, front & rear', 90, 'service'), ln('Downpipe check & flush', 20, 'service')] }),
];

const inv = (x: Omit<Invoice, 'remindersSent' | 'vat'> & Partial<Pick<Invoice, 'remindersSent' | 'vat'>>): Invoice => ({ remindersSent: 0, vat: false, ...x });

/** Invoice lines from a past job's value. */
const single = (desc: string, value: number) => [ln(desc, value, 'service')];

export const INVOICES: Invoice[] = [
  inv({ id: 'inv-3009', ref: 'INV-3009', customerId: 'cus-green', jobId: 'job-1012', status: 'overdue', issuedAt: '2026-09-18T16:00', dueDate: '2026-10-02', remindersSent: 1, lineItems: [ln('Kitchen mixer tap replacement — labour', 110, 'labour'), ln('Mixer tap (customer choice)', 75, 'material')] }),
  inv({ id: 'inv-3013', ref: 'INV-3013', customerId: 'cus-nolan', jobId: 'job-1015', status: 'due', issuedAt: '2026-09-29T17:00', dueDate: '2026-10-13', lineItems: [ln('Toilet fill valve & seal replacement — labour', 150, 'labour'), ln('Fill valve, flush valve & doughnut seal', 90, 'material')] }),
  inv({ id: 'inv-3014', ref: 'INV-3014', customerId: 'cus-fisher', jobId: 'job-1017', status: 'paid', issuedAt: '2026-10-01T12:00', dueDate: '2026-10-15', paidAt: '2026-10-01T18:22', method: 'Card (online)', lineItems: single('Gutter clean — front & rear incl. downpipe', 95) }),
  inv({ id: 'inv-3015', ref: 'INV-3015', customerId: 'cus-ahmed', jobId: 'job-1018', status: 'paid', issuedAt: '2026-10-01T13:00', dueDate: '2026-10-15', paidAt: '2026-10-02T09:10', method: 'Bank transfer', lineItems: [ln('Shower mixer cartridge & diverter repair', 120, 'labour'), ln('Thermostatic cartridge', 40, 'material')] }),
  inv({ id: 'inv-3016', ref: 'INV-3016', customerId: 'cus-osei', jobId: 'job-1020', status: 'sent', issuedAt: '2026-10-02T16:00', dueDate: '2026-10-16', lineItems: [ln('Radiator replacement — labour', 160, 'labour'), ln('Double panel radiator 600x1000', 135, 'material'), ln('Valves & fittings', 25, 'material')] }),
  inv({ id: 'inv-3017', ref: 'INV-3017', customerId: 'cus-hall', jobId: 'job-1021', status: 'paid', issuedAt: '2026-10-02T15:00', dueDate: '2026-10-16', paidAt: '2026-10-03T10:41', method: 'Card (online)', lineItems: single('Autumn gutter clean — front & rear', 90) }),
  inv({ id: 'inv-3018', ref: 'INV-3018', customerId: 'cus-kelly', jobId: 'job-1022', status: 'paid', issuedAt: '2026-10-03T11:00', dueDate: '2026-10-17', paidAt: '2026-10-03T11:05', method: 'Card (on site)', lineItems: [ln('Emergency call-out (Saturday)', 110, 'labour'), ln('Compression fittings', 35, 'material')] }),
  inv({ id: 'inv-3019', ref: 'INV-3019', customerId: 'cus-chen', jobId: 'job-1024', status: 'paid', issuedAt: '2026-10-05T11:00', dueDate: '2026-10-19', paidAt: '2026-10-06T08:15', method: 'Card (online)', lineItems: [ln('Gutter vacuum — 4-bed detached', 110, 'service'), ln('Downpipe clearance', 25, 'labour')] }),
  inv({ id: 'inv-3020', ref: 'INV-3020', customerId: 'cus-lewis', jobId: 'job-1025', status: 'sent', issuedAt: '2026-10-05T16:00', dueDate: '2026-10-19', lineItems: [ln('Thermostatic radiator valves x3 — labour', 105, 'labour'), ln('TRV heads & bodies x3', 75, 'material')] }),
  inv({ id: 'inv-3021', ref: 'INV-3021', customerId: 'cus-roberts', jobId: 'job-1027', status: 'paid', issuedAt: '2026-10-06T11:00', dueDate: '2026-10-20', paidAt: '2026-10-06T19:30', method: 'Card (online)', lineItems: single('Gutter clean — front & rear', 85) }),
  inv({ id: 'inv-3022', ref: 'INV-3022', customerId: 'cus-singh', jobId: 'job-1028', status: 'sent', issuedAt: '2026-10-06T16:00', dueDate: '2026-10-20', lineItems: [ln('Shower tray reseal — labour', 100, 'labour'), ln('Sanitary silicone & primer', 20, 'material')] }),
  inv({ id: 'inv-3023', ref: 'INV-3023', customerId: 'cus-davies', jobId: 'job-1030', status: 'paid', issuedAt: '2026-10-07T12:00', dueDate: '2026-10-21', paidAt: '2026-10-07T20:05', method: 'Card (online)', lineItems: single('Gutter clean — front & rear incl. downpipe', 90) }),
  inv({ id: 'inv-3024', ref: 'INV-3024', customerId: 'cus-wright', jobId: 'job-1031', status: 'sent', issuedAt: '2026-10-07T16:00', dueDate: '2026-10-21', lineItems: [ln('Toilet siphon replacement — labour', 110, 'labour'), ln('Siphon unit (9")', 40, 'material')] }),
  inv({ id: 'inv-3025', ref: 'INV-3025', customerId: 'cus-kelly', jobId: 'job-1033', status: 'sent', issuedAt: '2026-10-08T12:00', dueDate: '2026-10-22', lineItems: single('Gutter clean — front & rear incl. downpipe', 90) }),
  inv({ id: 'inv-3026', ref: 'INV-3026', customerId: 'cus-fisher', jobId: 'job-1034', status: 'paid', issuedAt: '2026-10-08T13:00', dueDate: '2026-10-22', paidAt: '2026-10-08T17:48', method: 'Card (online)', lineItems: [ln('Stopcock replacement — labour', 95, 'labour'), ln('15mm stopcock & fittings', 40, 'material')] }),
];
