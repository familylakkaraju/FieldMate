// Pre-aggregated history for months before the live demo data (Nov 2025 – Sep 2026).
// The current month (October to date) is always calculated live from demo state.

export interface MonthAggregate {
  month: string; // YYYY-MM
  label: string;
  plumbing: number;
  gutter: number;
  window: number;
  jobs: { plumbing: number; gutter: number; window: number };
  recurring: number; // recurring (round) revenue included above
  labourHours: { plumbing: number; gutter: number; window: number };
}

export const MONTHLY_HISTORY: MonthAggregate[] = [
  { month: '2025-11', label: 'Nov', plumbing: 6840, gutter: 5920, window: 3960, jobs: { plumbing: 44, gutter: 58, window: 41 }, recurring: 3480, labourHours: { plumbing: 112, gutter: 86, window: 78 } },
  { month: '2025-12', label: 'Dec', plumbing: 5980, gutter: 2140, window: 3120, jobs: { plumbing: 39, gutter: 22, window: 33 }, recurring: 2860, labourHours: { plumbing: 98, gutter: 31, window: 61 } },
  { month: '2026-01', label: 'Jan', plumbing: 7420, gutter: 980, window: 2860, jobs: { plumbing: 47, gutter: 10, window: 30 }, recurring: 2640, labourHours: { plumbing: 121, gutter: 14, window: 57 } },
  { month: '2026-02', label: 'Feb', plumbing: 6910, gutter: 1420, window: 3240, jobs: { plumbing: 45, gutter: 15, window: 34 }, recurring: 2980, labourHours: { plumbing: 114, gutter: 21, window: 63 } },
  { month: '2026-03', label: 'Mar', plumbing: 7180, gutter: 3360, window: 4410, jobs: { plumbing: 46, gutter: 35, window: 45 }, recurring: 3720, labourHours: { plumbing: 117, gutter: 49, window: 84 } },
  { month: '2026-04', label: 'Apr', plumbing: 6620, gutter: 3980, window: 4880, jobs: { plumbing: 43, gutter: 41, window: 49 }, recurring: 4160, labourHours: { plumbing: 108, gutter: 58, window: 92 } },
  { month: '2026-05', label: 'May', plumbing: 6240, gutter: 2760, window: 5320, jobs: { plumbing: 41, gutter: 29, window: 53 }, recurring: 4590, labourHours: { plumbing: 103, gutter: 41, window: 99 } },
  { month: '2026-06', label: 'Jun', plumbing: 5880, gutter: 1940, window: 5610, jobs: { plumbing: 38, gutter: 20, window: 55 }, recurring: 4870, labourHours: { plumbing: 96, gutter: 28, window: 104 } },
  { month: '2026-07', label: 'Jul', plumbing: 6120, gutter: 1620, window: 5740, jobs: { plumbing: 40, gutter: 17, window: 56 }, recurring: 5010, labourHours: { plumbing: 101, gutter: 24, window: 107 } },
  { month: '2026-08', label: 'Aug', plumbing: 5460, gutter: 1780, window: 5380, jobs: { plumbing: 36, gutter: 19, window: 53 }, recurring: 4720, labourHours: { plumbing: 92, gutter: 26, window: 101 } },
  { month: '2026-09', label: 'Sep', plumbing: 7060, gutter: 4640, window: 5520, jobs: { plumbing: 46, gutter: 47, window: 54 }, recurring: 4810, labourHours: { plumbing: 116, gutter: 68, window: 103 } },
];

// Rolling 90-day lead funnel (fictional) — the live leads list is added on top.
export const LEAD_FUNNEL_90D = { leads: 142, contacted: 128, quoted: 96, converted: 71, lost: 18 };

export const LEAD_SOURCES_90D = [
  { source: 'Website quote', leads: 78, converted: 41 },
  { source: 'Phone', leads: 37, converted: 19 },
  { source: 'Referral', leads: 19, converted: 9 },
  { source: 'Google Business Profile', leads: 8, converted: 2 },
];

// Rolling 4-week utilisation (booked hours / available hours).
export const UTILISATION_4W = [
  { workerId: 'w-daniel', booked: 138, available: 160 },
  { workerId: 'w-maya', booked: 146, available: 160 },
  { workerId: 'w-owen', booked: 124, available: 160 },
];

export const CUSTOMER_MIX = [
  { name: 'Recurring window', value: 186 },
  { name: 'Annual gutter care', value: 74 },
  { name: 'One-off plumbing', value: 118 },
  { name: 'One-off exterior', value: 52 },
];
