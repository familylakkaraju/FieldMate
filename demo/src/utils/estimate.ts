import type { QuoteLine, ServiceType } from '../types/domain';

// Deterministic demo pricing used by the instant quote wizard.

export type Answers = Record<string, string | boolean>;

export interface Estimate {
  range: [number, number];
  value: number;
  lines: Omit<QuoteLine, 'id'>[];
  includes: string[];
  propertyLabel: string;
  summary: string;
  details: { label: string; value: string }[];
  urgent: boolean;
  recurringNote?: string;
}

export const PROPERTY_TYPES = [
  { id: 'flat', label: 'Flat / maisonette' },
  { id: 'terrace', label: 'Terrace' },
  { id: 'semi', label: '3-bed semi-detached' },
  { id: 'detached', label: 'Detached' },
  { id: 'large', label: 'Large detached (5+ bed)' },
  { id: 'bungalow', label: 'Bungalow' },
] as const;

export const PLUMBING_ISSUES = ['Leak', 'Tap', 'Toilet', 'Radiator', 'Pipework', 'Sink / Waste', 'Something else'] as const;

const prop = (a: Answers) => PROPERTY_TYPES.find((p) => p.id === a.property)?.label ?? '3-bed semi-detached';
const str = (v: string | boolean | undefined) => (typeof v === 'string' ? v : '');

export function estimate(service: ServiceType, a: Answers): Estimate {
  if (service === 'gutter') {
    const base = { flat: 60, terrace: 70, semi: 90, detached: 120, large: 160, bungalow: 75 }[str(a.property) || 'semi'] ?? 90;
    const storeys = str(a.storeys) || '2';
    const sides = str(a.sides) || 'both';
    const sideFactor = sides === 'both' ? 1 : 0.65;
    const storeyExtra = storeys === '3' ? 35 : 0;
    const vacuum = Math.round((base - 10) * sideFactor + storeyExtra);
    const lines: Omit<QuoteLine, 'id'>[] = [{ description: `Gutter vacuum — ${prop(a).toLowerCase()}, ${sides === 'both' ? 'front & rear' : sides}`, quantity: 1, unitPrice: vacuum, kind: 'service' }];
    const downpipe = str(a.downpipe) === 'yes' || str(a.downpipe) === 'maybe';
    if (downpipe) lines.push({ description: 'Downpipe clearance', quantity: 1, unitPrice: 25, kind: 'labour' });
    if (a.extension) lines.push({ description: 'Rear extension / porch gutter', quantity: 1, unitPrice: 20, kind: 'service' });
    const low = Math.round(base * sideFactor + storeyExtra);
    const range: [number, number] = [low, low + 30];
    const value = lines.reduce((s, l) => s + l.unitPrice, 0);
    return {
      range,
      value,
      lines,
      urgent: false,
      propertyLabel: prop(a),
      includes: [sides === 'both' ? 'Front + rear gutters' : `${sides[0].toUpperCase()}${sides.slice(1)} gutters`, 'Downpipe inspection', 'Before / after evidence', ...(a.extension ? ['Extension / porch gutter'] : [])],
      summary: `${sides === 'both' ? 'Front and rear' : sides[0].toUpperCase() + sides.slice(1)} gutters on ${prop(a).toLowerCase()}.${downpipe ? ' Downpipe may be blocked.' : ''}`,
      details: [
        { label: 'Property', value: prop(a) },
        { label: 'Storeys', value: `${storeys} storeys` },
        { label: 'Gutters', value: sides === 'both' ? 'Front and rear' : sides },
        { label: 'Downpipes', value: str(a.downpipe) === 'yes' ? 'A downpipe is blocked / overflowing' : str(a.downpipe) === 'maybe' ? 'Not sure — may be blocked' : 'No known issues' },
        ...(a.extension ? [{ label: 'Extras', value: 'Extension / porch gutter' }] : []),
      ],
      recurringNote: 'Add autumn gutter care and we’ll remind you every year.',
    };
  }

  if (service === 'plumbing') {
    const issue = str(a.issue) || 'Leak';
    const base = { Leak: 85, Tap: 85, Toilet: 95, Radiator: 90, Pipework: 110, 'Sink / Waste': 95, 'Something else': 85 }[issue] ?? 85;
    const urgent = str(a.urgent) === 'yes';
    const lines: Omit<QuoteLine, 'id'>[] = [
      { description: 'Call-out & first 30 minutes labour', quantity: 1, unitPrice: 85, kind: 'labour' },
      { description: `${issue === 'Something else' ? 'Plumbing repair' : issue} — parts (estimate)`, quantity: 1, unitPrice: base - 60 > 0 ? base - 55 : 25, kind: 'material' },
    ];
    if (urgent) lines.push({ description: 'Urgent same-day priority', quantity: 1, unitPrice: 35, kind: 'service' });
    const low = base + (urgent ? 35 : 0);
    return {
      range: [low, low + 60],
      value: lines.reduce((s, l) => s + l.unitPrice, 0),
      lines,
      urgent,
      propertyLabel: prop(a),
      includes: ['Call-out & first 30 minutes', 'Fixed price agreed before work starts', 'Parts quoted on the day', ...(urgent ? ['Same-day priority slot'] : [])],
      summary: `${issue === 'Something else' ? 'Plumbing issue' : issue} ${urgent ? '(urgent)' : ''}${str(a.notes) ? ` — ${str(a.notes)}` : ''}`.trim(),
      details: [
        { label: 'Problem', value: issue },
        { label: 'Urgency', value: urgent ? 'Urgent — today if possible' : 'Not urgent' },
        { label: 'Property', value: prop(a) },
        ...(str(a.notes) ? [{ label: 'Notes', value: str(a.notes) }] : []),
      ],
    };
  }

  // windows
  const recurring = str(a.mode) !== 'oneoff';
  const freq = str(a.frequency) || '4';
  const perClean = { flat: 15, terrace: 18, semi: 22, detached: 28, large: 36, bungalow: 20 }[str(a.property) || 'semi'] ?? 22;
  const count = Number(str(a.windows) || '12');
  const extraWindows = Math.max(0, Math.round((count - 12) * 1.5));
  const freqAdj = freq === '8' ? 4 : freq === '6' ? 2 : 0;
  const clean = perClean + extraWindows + freqAdj;
  const lines: Omit<QuoteLine, 'id'>[] = recurring
    ? [{ description: `${freq}-weekly window clean — frames & sills (per visit)`, quantity: 1, unitPrice: clean, kind: 'service' }]
    : [{ description: 'One-off window clean — inside-out frames & sills', quantity: 1, unitPrice: Math.round(clean * 1.8), kind: 'service' }];
  if (a.conservatory) lines.push({ description: recurring ? 'Conservatory glass (per visit)' : 'Conservatory roof & glass', quantity: 1, unitPrice: recurring ? 12 : 35, kind: 'service' });
  const value = lines.reduce((s, l) => s + l.unitPrice, 0);
  return {
    range: [value, value + (recurring ? 4 : 15)],
    value,
    lines,
    urgent: false,
    propertyLabel: prop(a),
    includes: ['All windows, frames & sills', 'Purified water — streak free', recurring ? `Visit every ${freq} weeks with text reminders` : 'One-off clean', ...(a.conservatory ? ['Conservatory'] : [])],
    summary: `${recurring ? `Recurring ${freq}-weekly` : 'One-off'} window clean for a ${prop(a).toLowerCase()}, about ${count} windows${a.conservatory ? ' plus conservatory' : ''}.`,
    details: [
      { label: 'Property', value: prop(a) },
      { label: 'Type', value: recurring ? `Recurring — every ${freq} weeks` : 'One-off clean' },
      { label: 'Windows', value: `About ${count} windows` },
      { label: 'Conservatory', value: a.conservatory ? 'Yes' : 'No' },
    ],
    recurringNote: recurring ? `Price per visit. First clean is a deep clean at the same price.` : 'Join the round any time for regular visits.',
  };
}
