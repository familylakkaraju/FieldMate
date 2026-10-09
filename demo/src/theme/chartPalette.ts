import type { ServiceType } from '../types/domain';

// Validated categorical chart palette (dataviz reference slots 1/3/2 — passes all-pairs
// CVD + normal-vision checks on white). Service badges keep their brand accents; charts
// use these so the three services stay distinguishable for every reader.
export const SERVICE_CHART: Record<ServiceType, string> = {
  plumbing: '#2a78d6',
  gutter: '#1baf7a',
  window: '#eb6834',
};

export const CHART = {
  ink: '#17212b',
  secondary: '#52514e',
  muted: '#898781',
  grid: '#e1e0d9',
  axis: '#c3c2b7',
  single: '#2a78d6',
  quoted: '#86b6ef',
  actual: '#1c5cab',
  good: '#0ca30c',
  warning: '#fab219',
  critical: '#d03b3b',
};
