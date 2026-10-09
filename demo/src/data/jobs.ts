import type { Job, JobStatus, ServiceType, Task, TaskStatus, TimelineEntry } from '../types/domain';

type TaskSpec = [title: string, est: number, status: TaskStatus, actual?: number, worker?: string, outcome?: string];

const tasksFor = (jobId: string, specs: TaskSpec[], defaultWorker: string, due?: string): Task[] =>
  specs.map(([title, est, status, actual, worker, outcome], i) => ({
    id: `t-${jobId.replace('job-', '')}-${i + 1}`,
    jobId,
    title,
    outcome,
    status,
    order: i + 1,
    estimatedMinutes: est,
    actualMinutes: actual,
    assignedWorkerId: worker ?? defaultWorker,
    priority: 'normal',
    dueTime: due,
    timeline: status === 'completed' ? [{ id: `tl-${jobId}-${i}`, at: '', kind: 'task', text: 'Completed' }] : [],
  }));

let tlSeq = 0;
const tl = (at: string, kind: TimelineEntry['kind'], text: string, by?: string): TimelineEntry => ({ id: `jt-${++tlSeq}`, at, kind, text, by });

const base = (j: Partial<Job> & Pick<Job, 'id' | 'ref' | 'title' | 'service' | 'status' | 'assignedWorkerIds'>): Job => ({
  taskIds: [],
  materials: [],
  issues: [],
  timeline: [],
  messages: [],
  createdAt: '2026-10-01T09:00',
  ...j,
});

// ---------------------------------------------------------------- Today (Fri 9 Oct)
const ellisTasks = tasksFor('job-1038', [
  ['Isolate & drain down circuit', 20, 'completed', 18],
  ['Replace TRV & lockshield valve', 35, 'completed', 30],
  ['Refill, bleed & balance', 15, 'completed', 14],
  ['Leak test & customer handover', 5, 'completed', 5],
], 'w-daniel');

const patelTasks = tasksFor('job-1040', [
  ['Inspect leak under sink', 15, 'completed', 12],
  ['Remove damaged waste trap', 20, 'completed', 25],
  ['Fit new 40mm waste & trap', 30, 'blocked', undefined, 'w-daniel', 'Waiting for 40mm compression fitting'],
  ['Leak test & tidy', 15, 'ready'],
], 'w-daniel');

const thompsonTasks = tasksFor('job-1041', [
  ['Inspect property & set up', 10, 'completed', 10],
  ['Before photographs', 5, 'completed', 5],
  ['Vacuum front gutter', 20, 'completed', 24],
  ['Vacuum rear gutter', 25, 'in-progress', 38, 'w-maya', 'Heavy moss on the rear run'],
  ['After photographs & handover', 10, 'ready'],
], 'w-maya');

const roundTasks = tasksFor('job-1037', [
  ['Rhian Davies — 14 Maple Drive', 15, 'completed', 14],
  ['Lucy Baker — 16 Maple Drive', 15, 'completed', 13],
  ['Karen Walsh — 3 Linden Close', 15, 'completed', 16],
  ['R. Osborne — 9 Linden Close', 15, 'completed', 12],
  ['M. Patterson — 22 Linden Close', 15, 'completed', 15],
  ['J. & K. Holt — 5 Baddow Hall Crescent', 20, 'completed', 18],
  ['S. Ward — 11 Baddow Hall Crescent', 15, 'in-progress'],
  ['D. Greene — 2 Church Street', 15, 'ready'],
  ['T. Moore — 40 Church Street', 15, 'ready'],
], 'w-owen');

const okaforTasks = tasksFor('job-1043', [
  ['Survey supply route', 10, 'scheduled'],
  ['Fit tee & isolation valve', 25, 'scheduled'],
  ['Install outside tap & wall plate', 25, 'scheduled'],
  ['Fit double check valve & test', 10, 'scheduled'],
  ['Customer handover', 5, 'scheduled'],
], 'w-daniel');

const morrisonTasks = tasksFor('job-1044', [
  ['Front elevation windows', 15, 'scheduled'],
  ['Rear elevation windows', 15, 'scheduled'],
  ['Frames & sills', 10, 'scheduled'],
  ['Conservatory roof & glass', 15, 'scheduled'],
  ['Customer handover', 5, 'scheduled'],
], 'w-maya');

// ---------------------------------------------------------------- Upcoming
const bennettTasks = tasksFor('job-1045', [
  ['Inspect property', 10, 'scheduled'],
  ['Before photographs', 5, 'scheduled'],
  ['Vacuum front gutter', 25, 'scheduled'],
  ['Vacuum rear gutter', 25, 'scheduled'],
  ['Check & clear downpipes', 15, 'scheduled'],
  ['After photographs & handover', 10, 'scheduled'],
], 'w-maya');

const springfieldTasks = tasksFor('job-1046', [
  ['Fiona Hall — 27 Rainsford Avenue', 15, 'scheduled'],
  ['A. Lindqvist — 4 Springfield Park Road', 15, 'scheduled'],
  ['P. & J. Mensah — 18 Springfield Park Road', 20, 'scheduled'],
  ['C. Doyle — 2 Arbour Lane', 15, 'scheduled'],
  ['G. Fraser — 9 Arbour Lane', 15, 'scheduled'],
  ['H. Bird — 31 Arbour Lane', 15, 'scheduled'],
  ['R. Nair — 6 Pump Lane', 15, 'scheduled'],
  ['E. Watts — 14 Pump Lane', 15, 'scheduled'],
  ['L. Cooper — 1 Mayflower Close', 20, 'scheduled'],
  ['B. Harris — 7 Mayflower Close', 15, 'scheduled'],
  ['K. Young — 12 Mayflower Close', 15, 'scheduled'],
  ['M. Shaw — 3 Chelmer Road', 15, 'scheduled'],
], 'w-owen');

const ahmedTasks = tasksFor('job-1051', [
  ['Diagnose issue', 15, 'scheduled'],
  ['Remove old basin taps', 25, 'scheduled'],
  ['Fit new basin mixer', 35, 'scheduled'],
  ['Leak test & handover', 15, 'scheduled'],
], 'w-daniel');

export const JOBS: Job[] = [
  base({
    id: 'job-1038', ref: 'JOB-1038', customerId: 'cus-ellis', title: 'Ellis Radiator Valve Replacement', service: 'plumbing', status: 'completed',
    address: '12 Kings Chase, Brentwood CM14 4LD', area: 'Brentwood', scheduledStart: '2026-10-09T08:00', scheduledEnd: '2026-10-09T09:15',
    assignedWorkerIds: ['w-daniel'], quotedAmount: 145, quoteId: 'q-2039', taskIds: ellisTasks.map((t) => t.id), estimatedMinutes: 75,
    instructions: 'Replace weeping TRV and lockshield valve on the front bedroom radiator. Customer works from home — use the side entrance.',
    startedAt: '2026-10-09T08:02', completedAt: '2026-10-09T09:08', createdAt: '2026-10-02T14:10',
    materials: [
      { id: 'm-1038-1', description: 'TRV & lockshield valve pair (15mm)', cost: 28.5, at: '2026-10-09T08:25', by: 'w-daniel' },
      { id: 'm-1038-2', description: 'Central heating inhibitor top-up', cost: 9, at: '2026-10-09T08:50', by: 'w-daniel' },
    ],
    timeline: [
      tl('2026-10-02T14:10', 'created', 'Job created from accepted quote Q-2039', 'w-sophie'),
      tl('2026-10-09T08:02', 'status', 'Job started', 'w-daniel'),
      tl('2026-10-09T08:25', 'material', 'TRV & lockshield valve pair — £28.50', 'w-daniel'),
      tl('2026-10-09T09:08', 'status', 'Job completed — 67 min (8 min under estimate)', 'w-daniel'),
    ],
  }),
  base({
    id: 'job-1040', ref: 'JOB-1040', customerId: 'cus-patel', title: 'Patel Kitchen Waste Repair', service: 'plumbing', status: 'blocked',
    address: '31 Hamlet Court, Moulsham, Chelmsford CM2 0AH', area: 'Moulsham', scheduledStart: '2026-10-09T09:30', scheduledEnd: '2026-10-09T11:00',
    assignedWorkerIds: ['w-daniel'], quotedAmount: 165, quoteId: 'q-2048', taskIds: patelTasks.map((t) => t.id), estimatedMinutes: 80,
    instructions: 'Leak from kitchen sink waste. Replace trap and 40mm waste run if cracked.',
    startedAt: '2026-10-09T09:34', createdAt: '2026-10-05T10:22', travelMinutes: 24,
    atRisk: 'Blocked — waiting for a 40mm compression fitting',
    blockedReason: 'Waiting for 40mm waste compression fitting — merchant collection 11:15',
    issues: [{ id: 'i-1040-1', title: 'Cracked 40mm compression fitting', detail: 'Not carried on the van. Collecting from merchant at 11:15.', severity: 'medium', at: '2026-10-09T10:00', taskId: 't-1040-3', resolved: false, by: 'w-daniel' }],
    timeline: [
      tl('2026-10-05T10:22', 'created', 'Job created from accepted quote Q-2048', 'w-sophie'),
      tl('2026-10-09T09:34', 'status', 'Job started', 'w-daniel'),
      tl('2026-10-09T10:00', 'issue', 'Issue: cracked 40mm compression fitting — job blocked', 'w-daniel'),
    ],
    messages: [{ id: 'msg-1040-1', at: '2026-10-09T10:02', from: 'business', author: 'Daniel Reed', text: 'Hi Raj — one fitting is cracked so I am collecting a new one from the merchant. Back by 11:30 to finish.' }],
  }),
  base({
    id: 'job-1041', ref: 'JOB-1041', customerId: 'cus-thompson', title: 'Thompson Gutter Clean', service: 'gutter', status: 'in-progress',
    address: '42 Lodge Avenue, Moulsham Lodge, Chelmsford CM2 9PX', area: 'Moulsham Lodge', scheduledStart: '2026-10-09T08:15', scheduledEnd: '2026-10-09T09:30',
    assignedWorkerIds: ['w-maya'], quotedAmount: 110, quoteId: 'q-2050', taskIds: thompsonTasks.map((t) => t.id), estimatedMinutes: 70,
    instructions: 'Annual autumn clean, front and rear. Customer reports moss on the rear run.',
    startedAt: '2026-10-09T08:21', createdAt: '2026-09-22T12:00', travelMinutes: 15,
    atRisk: 'Running 35 min over — may delay the Shah job at 10:30',
    issues: [{ id: 'i-1041-1', title: 'Heavy moss on rear run', detail: 'Extra vacuum passes needed.', severity: 'low', at: '2026-10-09T09:20', taskId: 't-1041-4', resolved: false, by: 'w-maya' }],
    timeline: [
      tl('2026-09-22T12:00', 'created', 'Booked from autumn gutter reminder', 'w-sophie'),
      tl('2026-10-09T08:21', 'status', 'Job started', 'w-maya'),
      tl('2026-10-09T08:40', 'evidence', '2 before photos added', 'w-maya'),
      tl('2026-10-09T09:20', 'issue', 'Heavy moss on rear run — extra passes needed', 'w-maya'),
    ],
  }),
  base({
    id: 'job-1037', ref: 'JOB-1037', title: 'Great Baddow Window Round', service: 'window', status: 'in-progress', kind: 'round',
    address: 'Maple Drive, Linden Close, Baddow Hall Crescent, Church Street', area: 'Great Baddow CM2 7', scheduledStart: '2026-10-09T08:00', scheduledEnd: '2026-10-09T10:15',
    assignedWorkerIds: ['w-owen'], quotedAmount: 198, taskIds: roundTasks.map((t) => t.id), estimatedMinutes: 140,
    instructions: '4-weekly round, 9 homes. Water-fed pole. Leave a card if customer is out.',
    startedAt: '2026-10-09T08:04', createdAt: '2026-09-11T16:00',
    timeline: [
      tl('2026-09-11T16:00', 'created', 'Round auto-scheduled (4-weekly)', 'system'),
      tl('2026-10-09T08:04', 'status', 'Round started', 'w-owen'),
      tl('2026-10-09T09:58', 'task', '6 of 9 homes complete', 'w-owen'),
    ],
  }),
  base({
    id: 'job-1043', ref: 'JOB-1043', customerId: 'cus-okafor', title: 'Okafor Outside Tap Installation', service: 'plumbing', status: 'scheduled',
    address: '5 Marconi Gardens, Chelmsford CM1 2QE', area: 'Chelmsford CM1', scheduledStart: '2026-10-09T12:30', scheduledEnd: '2026-10-09T13:45',
    assignedWorkerIds: ['w-daniel'], quotedAmount: 135, quoteId: 'q-2047', taskIds: okaforTasks.map((t) => t.id), estimatedMinutes: 75,
    instructions: 'New outside tap on rear wall, tee off kitchen supply. Double check valve required.',
    createdAt: '2026-10-06T15:30', travelMinutes: 18,
    timeline: [tl('2026-10-06T15:30', 'created', 'Job created from accepted quote Q-2047', 'w-sophie')],
  }),
  base({
    id: 'job-1044', ref: 'JOB-1044', customerId: 'cus-morrison', title: 'Morrison Window Clean', service: 'window', status: 'scheduled',
    address: '7 Beech Rise, Galleywood, Chelmsford CM2 8RT', area: 'Galleywood CM2 8', scheduledStart: '2026-10-09T15:00', scheduledEnd: '2026-10-09T16:00',
    assignedWorkerIds: ['w-maya'], quotedAmount: 120, quoteId: 'q-2046', taskIds: morrisonTasks.map((t) => t.id), estimatedMinutes: 60,
    instructions: 'One-off full clean including conservatory roof, frames and sills before family visit.',
    createdAt: '2026-10-02T11:30', travelMinutes: 22,
    timeline: [tl('2026-10-02T11:30', 'created', 'Job created from accepted quote Q-2046', 'w-sophie')],
  }),
  base({
    id: 'job-1045', ref: 'JOB-1045', customerId: 'cus-bennett', title: 'Bennett Autumn Gutter Clean', service: 'gutter', status: 'scheduled',
    address: '8 Mill Road, Maldon CM9 5HP', area: 'Maldon', scheduledStart: '2026-10-12T09:00', scheduledEnd: '2026-10-12T10:30',
    assignedWorkerIds: ['w-maya'], quotedAmount: 120, taskIds: bennettTasks.map((t) => t.id), estimatedMinutes: 90,
    instructions: 'Annual autumn clean. 4-bed detached.', createdAt: '2026-09-25T10:00',
    timeline: [tl('2026-09-25T10:00', 'created', 'Booked from autumn gutter reminder', 'w-sophie')],
  }),
  base({
    id: 'job-1046', ref: 'JOB-1046', title: 'Springfield Window Round', service: 'window', status: 'scheduled', kind: 'round',
    address: 'Springfield Park Road, Arbour Lane, Pump Lane, Mayflower Close', area: 'Springfield CM1', scheduledStart: '2026-10-12T08:30', scheduledEnd: '2026-10-12T12:30',
    assignedWorkerIds: ['w-owen'], quotedAmount: 264, taskIds: springfieldTasks.map((t) => t.id), estimatedMinutes: 190,
    instructions: '4-weekly round, 12 homes.', createdAt: '2026-09-14T16:00',
    timeline: [tl('2026-09-14T16:00', 'created', 'Round auto-scheduled (4-weekly)', 'system')],
  }),
  base({
    id: 'job-1051', ref: 'JOB-1051', customerId: 'cus-ahmed', title: 'Ahmed Basin Mixer Replacement', service: 'plumbing', status: 'scheduled',
    address: '41 Cann Hall Road, Leytonstone, London E11 3HY', area: 'East London', scheduledStart: '2026-10-13T10:00', scheduledEnd: '2026-10-13T11:30',
    assignedWorkerIds: ['w-daniel'], quotedAmount: 150, taskIds: ahmedTasks.map((t) => t.id), estimatedMinutes: 90,
    instructions: 'Replace bathroom basin pillar taps with customer-supplied mixer.', createdAt: '2026-10-07T12:45',
    timeline: [tl('2026-10-07T12:45', 'created', 'Job booked by phone', 'w-sophie')],
  }),
  base({
    id: 'job-1048', ref: 'JOB-1048', customerId: 'cus-turner', title: 'Turner Gutter & Fascia Clean', service: 'gutter', status: 'quoted',
    address: '11 Collingwood Road, Witham CM8 2DY', area: 'Witham', assignedWorkerIds: [], quotedAmount: 185, quoteId: 'q-2044', estimatedMinutes: 120,
    instructions: 'Gutter vacuum plus fascia & soffit wash. Awaiting quote approval.', createdAt: '2026-10-05T11:00',
    timeline: [tl('2026-10-05T11:00', 'created', 'Job created — quote Q-2044 sent', 'w-sophie')],
  }),
  base({
    id: 'job-1049', ref: 'JOB-1049', customerId: 'cus-singh', title: 'Singh Gutter Guard Survey', service: 'gutter', status: 'new',
    address: '12 Trinity Road, Chelmsford CM2 6HS', area: 'Chelmsford CM2 6', assignedWorkerIds: [], estimatedMinutes: 45,
    instructions: 'Customer asked about gutter guards after seeing our autumn email. Survey and quote.', createdAt: '2026-10-08T09:40',
    timeline: [tl('2026-10-08T09:40', 'created', 'Job created from customer email', 'w-sophie')],
  }),
  base({
    id: 'job-1050', ref: 'JOB-1050', customerId: 'cus-murphy', title: 'Murphy Conservatory Roof Clean', service: 'window', status: 'quoted',
    address: '9 Mersea Road, Colchester CO2 7QS', area: 'Colchester', assignedWorkerIds: [], quotedAmount: 160, quoteId: 'q-2045', estimatedMinutes: 90,
    instructions: 'Conservatory roof clean, polycarbonate. Quote in draft.', createdAt: '2026-10-07T14:00',
    timeline: [tl('2026-10-07T14:00', 'created', 'Job created — quote in draft', 'w-sophie')],
  }),
];

// ---------------------------------------------------------------- Recent completed work (Sep / Oct)
type Past = [num: number, customerId: string | null, title: string, service: ServiceType, date: string, start: string, end: string, workers: string[], value: number, est: number, actual: number, status: JobStatus, invoiceId?: string];

const PAST: Past[] = [
  [1012, 'cus-green', 'Green Kitchen Mixer Tap Replacement', 'plumbing', '2026-09-18', '10:00', '11:30', ['w-daniel'], 185, 75, 80, 'invoiced', 'inv-3009'],
  [1015, 'cus-nolan', 'Nolan Toilet Fill Valve & Seal', 'plumbing', '2026-09-29', '13:00', '14:30', ['w-daniel'], 240, 80, 95, 'invoiced', 'inv-3013'],
  [1016, null, 'Maldon Window Round', 'window', '2026-10-01', '08:00', '12:00', ['w-owen'], 210, 240, 250, 'closed'],
  [1017, 'cus-fisher', 'Fisher Gutter Clean', 'gutter', '2026-10-01', '09:00', '10:15', ['w-maya'], 95, 75, 100, 'closed', 'inv-3014'],
  [1018, 'cus-ahmed', 'Ahmed Shower Mixer Repair', 'plumbing', '2026-10-01', '11:00', '12:30', ['w-daniel'], 160, 90, 95, 'closed', 'inv-3015'],
  [1019, null, 'Chelmsford West Window Round', 'window', '2026-10-02', '08:00', '13:00', ['w-owen'], 286, 300, 290, 'closed'],
  [1020, 'cus-osei', 'Osei Radiator Replacement', 'plumbing', '2026-10-02', '09:00', '11:30', ['w-daniel'], 320, 150, 185, 'invoiced', 'inv-3016'],
  [1021, 'cus-hall', 'Hall Autumn Gutter Clean', 'gutter', '2026-10-02', '13:00', '14:15', ['w-maya'], 90, 75, 80, 'closed', 'inv-3017'],
  [1022, 'cus-kelly', 'Kelly Emergency Leak Call-out', 'plumbing', '2026-10-03', '09:30', '10:30', ['w-daniel'], 145, 60, 70, 'closed', 'inv-3018'],
  [1023, null, 'Colchester Window Round', 'window', '2026-10-05', '08:00', '12:30', ['w-owen'], 330, 270, 285, 'closed'],
  [1024, 'cus-chen', 'Chen Gutter & Downpipe Clean', 'gutter', '2026-10-05', '09:00', '10:45', ['w-maya', 'w-owen'], 135, 90, 115, 'closed', 'inv-3019'],
  [1025, 'cus-lewis', 'Lewis Thermostatic Radiator Valves', 'plumbing', '2026-10-05', '13:00', '15:00', ['w-daniel'], 180, 120, 130, 'invoiced', 'inv-3020'],
  [1026, null, 'Shenfield Window Round', 'window', '2026-10-06', '08:00', '11:30', ['w-owen'], 216, 200, 210, 'closed'],
  [1027, 'cus-roberts', 'Roberts Gutter Clean', 'gutter', '2026-10-06', '09:30', '10:45', ['w-maya'], 85, 70, 90, 'closed', 'inv-3021'],
  [1028, 'cus-singh', 'Singh Shower Tray Reseal', 'plumbing', '2026-10-06', '14:00', '15:15', ['w-daniel'], 120, 75, 70, 'invoiced', 'inv-3022'],
  [1029, null, 'Witham Window Round', 'window', '2026-10-07', '08:00', '12:00', ['w-owen'], 242, 230, 240, 'closed'],
  [1030, 'cus-davies', 'Davies Gutter Clean', 'gutter', '2026-10-07', '10:00', '11:15', ['w-maya'], 90, 75, 95, 'closed', 'inv-3023'],
  [1031, 'cus-wright', 'Wright Toilet Siphon Repair', 'plumbing', '2026-10-07', '13:30', '15:00', ['w-daniel'], 150, 60, 90, 'invoiced', 'inv-3024'],
  [1032, null, 'Moulsham Window Round', 'window', '2026-10-08', '08:00', '11:00', ['w-owen'], 176, 180, 175, 'closed'],
  [1033, 'cus-kelly', 'Kelly Gutter Clean', 'gutter', '2026-10-08', '09:00', '10:15', ['w-maya'], 90, 75, 105, 'invoiced', 'inv-3025'],
  [1034, 'cus-fisher', 'Fisher Leaking Stopcock Replacement', 'plumbing', '2026-10-08', '11:00', '12:15', ['w-daniel'], 135, 60, 75, 'closed', 'inv-3026'],
];

const PAST_NOTES: Record<number, { issue?: string; reason?: string }> = {
  1017: { issue: 'Blocked downpipe', reason: 'Blocked downpipe (+25 min)' },
  1020: { issue: 'Seized radiator valve', reason: 'Seized valve (+35 min)' },
  1024: { issue: 'Two downpipes blocked', reason: 'Two blocked downpipes (+25 min)' },
  1027: { issue: 'Heavy moss build-up', reason: 'Moss build-up (+20 min)' },
  1030: { issue: 'Blocked downpipe', reason: 'Blocked downpipe (+20 min)' },
  1031: { issue: 'Wrong siphon size on van', reason: 'Return trip to merchant (+30 min)' },
  1033: { issue: 'Blocked downpipe', reason: 'Blocked downpipe (+30 min)' },
  1034: { issue: 'Stopcock seized in wall', reason: 'Seized stopcock (+15 min)' },
};

export const PAST_JOBS: Job[] = PAST.map(([num, customerId, title, service, date, start, end, workers, value, est, actual, status, invoiceId]) => {
  const note = PAST_NOTES[num];
  const startIso = `${date}T${start}`;
  const endIso = `${date}T${end}`;
  return base({
    id: `job-${num}`,
    ref: `JOB-${num}`,
    customerId: customerId ?? undefined,
    kind: customerId ? 'standard' : 'round',
    title,
    service,
    status,
    scheduledStart: startIso,
    scheduledEnd: endIso,
    startedAt: startIso,
    completedAt: endIso,
    assignedWorkerIds: workers,
    quotedAmount: value,
    invoiceId,
    estimatedMinutes: est,
    actualMinutesOverride: actual,
    createdAt: `${date}T08:00`,
    area: title.includes('Round') ? title.replace(' Window Round', '') : undefined,
    issues: note?.issue ? [{ id: `i-${num}`, title: note.issue, severity: 'low', at: `${date}T${start}`, resolved: true }] : [],
    timeline: [
      tl(`${date}T${start}`, 'status', 'Job started', workers[0]),
      ...(note?.reason ? [tl(`${date}T${start}`, 'issue', note.reason, workers[0])] : []),
      tl(`${date}T${end}`, 'status', `Job completed — ${actual} min (estimate ${est} min)`, workers[0]),
    ],
  });
});

export const PAST_JOB_REASONS = PAST_NOTES;

export const TASKS: Task[] = [
  ...ellisTasks,
  ...patelTasks,
  ...thompsonTasks,
  ...roundTasks,
  ...okaforTasks,
  ...morrisonTasks,
  ...bennettTasks,
  ...springfieldTasks,
  ...ahmedTasks,
].map((t) => ({ ...t, timeline: t.timeline.map((e) => ({ ...e, at: e.at || '2026-10-09T09:00' })) }));

// Due times for today's tasks (worker view shows these)
for (const t of TASKS) {
  if (t.jobId === 'job-1040' && t.order >= 3) t.priority = 'high';
  if (t.jobId === 'job-1041' && t.order === 4) t.priority = 'high';
}
