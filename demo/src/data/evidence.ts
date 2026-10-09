import type { EvidenceItem, NotificationItem } from '../types/domain';

export const EVIDENCE: EvidenceItem[] = [
  { id: 'ev-1', jobId: 'job-1041', taskId: 't-1041-2', customerId: 'cus-thompson', type: 'before', url: 'assets/services/gutter.webp', caption: 'Rear run — heavy moss before cleaning', at: '2026-10-09T08:38', by: 'w-maya', service: 'gutter' },
  { id: 'ev-2', jobId: 'job-1041', taskId: 't-1041-3', customerId: 'cus-thompson', type: 'photo', url: 'assets/gallery/gutter-leaves.webp', caption: 'Debris removed from front gutter', at: '2026-10-09T09:05', by: 'w-maya', service: 'gutter' },
  { id: 'ev-3', jobId: 'job-1040', taskId: 't-1040-1', customerId: 'cus-patel', type: 'before', url: 'assets/gallery/plumbing-undersink.webp', caption: 'Leak at waste trap joint', at: '2026-10-09T09:40', by: 'w-daniel', service: 'plumbing' },
  { id: 'ev-4', jobId: 'job-1038', taskId: 't-1038-4', customerId: 'cus-ellis', type: 'after', url: 'assets/gallery/plumbing-cabinet.webp', caption: 'New valves fitted and leak tested', at: '2026-10-09T09:05', by: 'w-daniel', service: 'plumbing' },
  { id: 'ev-5', jobId: 'job-1037', taskId: 't-1037-1', type: 'after', url: 'assets/services/windows.webp', caption: 'Maple Drive — frames & sills done', at: '2026-10-09T08:20', by: 'w-owen', service: 'window' },
  { id: 'ev-6', jobId: 'job-1024', customerId: 'cus-chen', type: 'before', url: 'assets/gallery/gutter-spout-before.webp', caption: 'Blocked outlet on rear downpipe', at: '2026-10-05T09:20', by: 'w-maya', service: 'gutter' },
  { id: 'ev-7', jobId: 'job-1024', customerId: 'cus-chen', type: 'after', url: 'assets/gallery/downpipe-after.webp', caption: 'Downpipe cleared and flowing', at: '2026-10-05T10:30', by: 'w-owen', service: 'gutter' },
  { id: 'ev-8', jobId: 'job-1033', customerId: 'cus-kelly', type: 'after', url: 'assets/gallery/gutter-after.webp', caption: 'Front gutter and downpipe — after', at: '2026-10-08T10:10', by: 'w-maya', service: 'gutter' },
  { id: 'ev-9', jobId: 'job-1020', customerId: 'cus-osei', type: 'after', url: 'assets/services/plumbing.webp', caption: 'New radiator pipework', at: '2026-10-02T11:20', by: 'w-daniel', service: 'plumbing' },
  { id: 'ev-10', jobId: 'job-1030', customerId: 'cus-davies', type: 'before', url: 'assets/gallery/gutter-leaves.webp', caption: 'Leaves blocking front gutter', at: '2026-10-07T10:05', by: 'w-maya', service: 'gutter' },
  { id: 'ev-11', jobId: 'job-1030', customerId: 'cus-davies', type: 'after', url: 'assets/gallery/gutter-after.webp', caption: 'Gutter clear — after', at: '2026-10-07T11:05', by: 'w-maya', service: 'gutter' },
  { id: 'ev-12', jobId: 'job-1040', customerId: 'cus-patel', type: 'receipt', url: 'assets/demo/receipt-merchant.svg', caption: 'Merchant receipt — 40mm fittings £14.60', at: '2026-10-09T10:02', by: 'w-daniel', service: 'plumbing' },
  { id: 'ev-13', jobId: 'job-1038', customerId: 'cus-ellis', type: 'receipt', url: 'assets/demo/receipt-valves.svg', caption: 'Merchant receipt — TRV valve pair £28.50', at: '2026-10-09T08:25', by: 'w-daniel', service: 'plumbing' },
  { id: 'ev-14', jobId: 'job-1044', customerId: 'cus-morrison', type: 'document', url: 'assets/demo/document.svg', caption: 'Signed quote Q-2046.pdf', at: '2026-10-02T12:31', by: 'customer', service: 'window' },
  { id: 'ev-15', jobId: 'job-1031', customerId: 'cus-wright', type: 'after', url: 'assets/gallery/plumbing-tiles.webp', caption: 'Boxing panel refitted after siphon repair', at: '2026-10-07T14:50', by: 'w-daniel', service: 'plumbing' },
];

export const NOTIFICATIONS: NotificationItem[] = [
  { id: 'nt-1', kind: 'job', title: 'Job blocked', body: 'Patel Kitchen Waste Repair — waiting for a 40mm fitting (Daniel)', at: '2026-10-09T10:00', read: false, link: '/app/jobs/job-1040' },
  { id: 'nt-2', kind: 'task', title: 'Round progress', body: 'Owen completed 6 of 9 homes on the Great Baddow round', at: '2026-10-09T09:58', read: false, link: '/app/jobs/job-1037' },
  { id: 'nt-3', kind: 'job', title: 'Job running over', body: 'Thompson Gutter Clean is 35 min over — Shah job starts 10:30', at: '2026-10-09T09:52', read: false, link: '/app/jobs/job-1041' },
  { id: 'nt-4', kind: 'lead', title: 'Urgent plumbing enquiry', body: 'Sarah Williams — leaking kitchen tap (phone)', at: '2026-10-09T08:12', read: false, link: '/app/leads/lead-sarah' },
  { id: 'nt-5', kind: 'lead', title: 'New gutter quote request', body: 'Priya Shah, 18 Willow Close — booked today 10:30', at: '2026-10-09T07:42', read: false, link: '/app/leads/lead-priya' },
  { id: 'nt-6', kind: 'quote', title: 'Quote viewed', body: 'John Carter viewed Q-2049 (£165)', at: '2026-10-08T19:02', read: true, link: '/app/quotes/q-2049' },
  { id: 'nt-7', kind: 'invoice', title: 'Invoice overdue', body: 'INV-3009 · Hannah Green · £185 · 7 days overdue', at: '2026-10-09T07:00', read: false, link: '/app/invoices' },
  { id: 'nt-8', kind: 'recurring', title: 'Recurring window cleans due', body: '6 customers are due a window clean in the next 7 days', at: '2026-10-09T07:00', read: true, link: '/app/customers' },
  { id: 'nt-9', kind: 'recurring', title: 'Autumn gutter reminder', body: '3 customers cleaned last autumn have not booked yet', at: '2026-10-08T07:00', read: true, link: '/app/copilot' },
  { id: 'nt-10', kind: 'quote', title: 'Quote accepted', body: 'Chidi Okafor accepted Q-2047 (£135)', at: '2026-10-06T15:20', read: true, link: '/app/quotes/q-2047' },
  { id: 'nt-11', kind: 'payment', title: 'Payment received', body: 'James Fisher paid INV-3026 (£135) by card', at: '2026-10-08T17:48', read: true, link: '/app/invoices' },
];
