import type { QuoteLine, ServiceType } from '../types/domain';

export interface TaskTemplate {
  title: string;
  minutes: number;
  outcome: string;
  worker?: 0 | 1; // index into the assigned crew
  checklist?: string[];
}

// Task breakdowns used when a lead is converted into a job.
export const TASK_TEMPLATES: Record<string, TaskTemplate[]> = {
  'shah-gutter': [
    { title: 'Inspect property', minutes: 10, outcome: 'Access confirmed, hazards checked, gutter runs identified', worker: 0, checklist: ['Side gate access', 'Check rear extension roof', 'Note downpipe positions'] },
    { title: 'Before photographs', minutes: 5, outcome: 'Front and rear gutters photographed before cleaning', worker: 1 },
    { title: 'Vacuum front gutter', minutes: 20, outcome: 'Front gutter run fully cleared with gutter vacuum', worker: 0, checklist: ['Clear debris', 'Check joints', 'Flush test'] },
    { title: 'Vacuum rear gutter', minutes: 20, outcome: 'Rear and extension gutters fully cleared', worker: 1, checklist: ['Main rear run', 'Rear extension gutter', 'Flush test'] },
    { title: 'Clear rear downpipe', minutes: 10, outcome: 'Rear downpipe flowing freely', worker: 1 },
    { title: 'After photographs', minutes: 5, outcome: 'After photos captured for the customer portal', worker: 1 },
    { title: 'Customer handover', minutes: 10, outcome: 'Customer shown before/after photos and findings', worker: 0 },
  ],
  gutter: [
    { title: 'Inspect property', minutes: 10, outcome: 'Access confirmed and gutter runs identified', worker: 0 },
    { title: 'Before photographs', minutes: 5, outcome: 'Gutters photographed before cleaning', worker: 0 },
    { title: 'Vacuum front gutter', minutes: 20, outcome: 'Front gutter cleared', worker: 0 },
    { title: 'Vacuum rear gutter', minutes: 20, outcome: 'Rear gutter cleared', worker: 1 },
    { title: 'Check & clear downpipes', minutes: 15, outcome: 'All downpipes flowing', worker: 1 },
    { title: 'After photographs & handover', minutes: 10, outcome: 'Customer shown before/after photos', worker: 0 },
  ],
  'sarah-tap': [
    { title: 'Diagnose leak', minutes: 10, outcome: 'Source of leak confirmed', worker: 0 },
    { title: 'Isolate supply', minutes: 10, outcome: 'Water isolated (replace stiff isolation valve if needed)', worker: 0 },
    { title: 'Replace tap cartridge', minutes: 25, outcome: 'Mixer tap cartridge replaced', worker: 0 },
    { title: 'Leak test', minutes: 10, outcome: 'No leaks after 10 minutes running', worker: 0 },
    { title: 'Customer handover', minutes: 5, outcome: 'Customer shown repair and advised', worker: 0 },
  ],
  plumbing: [
    { title: 'Diagnose issue', minutes: 15, outcome: 'Fault confirmed and explained to customer', worker: 0 },
    { title: 'Isolate supply', minutes: 5, outcome: 'Water isolated safely', worker: 0 },
    { title: 'Repair / replace parts', minutes: 45, outcome: 'Repair completed', worker: 0 },
    { title: 'Leak test', minutes: 10, outcome: 'System tested, no leaks', worker: 0 },
    { title: 'Customer handover', minutes: 5, outcome: 'Customer shown the repair', worker: 0 },
  ],
  window: [
    { title: 'Front elevation windows', minutes: 15, outcome: 'Front windows cleaned with water-fed pole', worker: 0 },
    { title: 'Rear elevation windows', minutes: 15, outcome: 'Rear windows cleaned', worker: 0 },
    { title: 'Frames & sills', minutes: 10, outcome: 'Frames and sills wiped down', worker: 0 },
    { title: 'Customer handover', minutes: 5, outcome: 'Customer notified clean is complete', worker: 0 },
  ],
  'window-recurring': [
    { title: 'First clean — all windows', minutes: 30, outcome: 'Deep first clean of all windows', worker: 0 },
    { title: 'Frames & sills', minutes: 15, outcome: 'Frames and sills cleaned', worker: 0 },
    { title: 'Add to round & confirm schedule', minutes: 5, outcome: 'Customer added to 4-weekly round', worker: 0 },
  ],
};

export const DEFAULT_CREW: Record<ServiceType, string[]> = {
  plumbing: ['w-daniel'],
  gutter: ['w-maya', 'w-owen'],
  window: ['w-owen'],
};

type L = Omit<QuoteLine, 'id'>;

// Quote line templates used by "Create quote" / conversion.
export const QUOTE_TEMPLATES: Record<string, L[]> = {
  'shah-gutter': [
    { description: 'Gutter vacuum — 3-bed semi, front & rear', quantity: 1, unitPrice: 80, kind: 'service' },
    { description: 'Downpipe clearance', quantity: 1, unitPrice: 25, kind: 'labour' },
    { description: 'Rear extension gutter', quantity: 1, unitPrice: 20, kind: 'service' },
  ],
  'sarah-tap': [
    { description: 'Same-day call-out & first 30 minutes labour', quantity: 1, unitPrice: 85, kind: 'labour' },
    { description: 'Ceramic mixer tap cartridge (35mm)', quantity: 1, unitPrice: 18, kind: 'material' },
    { description: 'Replacement isolation valve (15mm)', quantity: 1, unitPrice: 12, kind: 'material' },
    { description: 'Urgent same-day priority', quantity: 1, unitPrice: 25, kind: 'service' },
  ],
  gutter: [
    { description: 'Gutter vacuum — front & rear', quantity: 1, unitPrice: 90, kind: 'service' },
    { description: 'Downpipe clearance', quantity: 1, unitPrice: 25, kind: 'labour' },
  ],
  plumbing: [
    { description: 'Call-out & first hour labour', quantity: 1, unitPrice: 85, kind: 'labour' },
    { description: 'Parts & fittings (estimate)', quantity: 1, unitPrice: 30, kind: 'material' },
  ],
  window: [
    { description: 'Window clean — all windows, frames & sills', quantity: 1, unitPrice: 22, kind: 'service' },
  ],
  'window-recurring': [
    { description: 'First clean — all windows, frames & sills', quantity: 1, unitPrice: 40, kind: 'service' },
    { description: '4-weekly window clean (per visit)', quantity: 1, unitPrice: 26, kind: 'service' },
  ],
};

export const QUOTE_TERMS =
  'Prices include labour and standard materials. Quote valid for 30 days. Any additional work found on the day will be agreed with you before we start. Payment due within 14 days of invoice.';

export interface VoiceScript {
  transcript: string;
  completeTaskTitles: string[];
  timeTaskTitle?: string;
  extraMinutes: number;
  issue?: { title: string; detail: string };
  material?: { description: string; cost: number };
  evidence: { type: 'before' | 'after' | 'photo'; url: string; caption: string }[];
}

// The showcase voice update from the CR, plus service fallbacks for any other job.
export const VOICE_SCRIPTS: Record<string, VoiceScript> = {
  'shah-gutter': {
    transcript:
      'Finished clearing the front and rear gutters. The rear downpipe was blocked so it took another 25 minutes. I cleared it and added the before and after photos.',
    completeTaskTitles: ['Vacuum front gutter', 'Vacuum rear gutter', 'Clear rear downpipe'],
    timeTaskTitle: 'Clear rear downpipe',
    extraMinutes: 25,
    issue: { title: 'Blocked rear downpipe', detail: 'Compacted leaves and moss in rear downpipe — cleared on site with rods and flush.' },
    evidence: [
      { type: 'before', url: 'assets/gallery/gutter-spout-before.webp', caption: 'Rear downpipe outlet blocked — before' },
      { type: 'after', url: 'assets/gallery/downpipe-after.webp', caption: 'Rear downpipe cleared and flowing — after' },
    ],
  },
  gutter: {
    transcript:
      'Front and back gutters are done. One of the downpipes was packed with leaves so that added about 20 minutes. Photos are uploaded.',
    completeTaskTitles: ['Vacuum front gutter', 'Vacuum rear gutter', 'Check & clear downpipes'],
    timeTaskTitle: 'Check & clear downpipes',
    extraMinutes: 20,
    issue: { title: 'Downpipe packed with leaves', detail: 'Cleared on site.' },
    evidence: [
      { type: 'before', url: 'assets/gallery/gutter-leaves.webp', caption: 'Leaf debris — before' },
      { type: 'after', url: 'assets/gallery/gutter-after.webp', caption: 'Gutter clear — after' },
    ],
  },
  plumbing: {
    transcript:
      'Replaced the tap cartridge and the isolation valve, tested it for ten minutes and no leaks. Used one cartridge at eighteen pounds. The old valve was seized so it took fifteen minutes longer.',
    completeTaskTitles: ['Isolate supply', 'Replace tap cartridge', 'Repair / replace parts', 'Leak test'],
    timeTaskTitle: 'Isolate supply',
    extraMinutes: 15,
    issue: { title: 'Seized isolation valve', detail: 'Replaced with new 15mm isolation valve.' },
    material: { description: 'Ceramic tap cartridge (35mm)', cost: 18 },
    evidence: [
      { type: 'before', url: 'assets/gallery/plumbing-tap.webp', caption: 'Leaking tap — before' },
      { type: 'after', url: 'assets/gallery/plumbing-cabinet.webp', caption: 'New valve fitted under sink — after' },
    ],
  },
  window: {
    transcript:
      'All the windows are done front and back, frames and sills wiped. The conservatory roof took an extra fifteen minutes because of the moss. Photos added.',
    completeTaskTitles: ['Front elevation windows', 'Rear elevation windows', 'Frames & sills', 'Conservatory roof & glass'],
    timeTaskTitle: 'Conservatory roof & glass',
    extraMinutes: 15,
    issue: { title: 'Moss on conservatory roof', detail: 'Recommend a conservatory roof clean every 6 months.' },
    evidence: [
      { type: 'before', url: 'assets/gallery/window-sash-before.webp', caption: 'Windows — before' },
      { type: 'after', url: 'assets/gallery/window-sash-after.webp', caption: 'Windows — after' },
    ],
  },
};

// Demo photo library offered by the evidence-capture simulation.
export const PHOTO_LIBRARY: Record<ServiceType, { url: string; caption: string; type: 'before' | 'after' }[]> = {
  gutter: [
    { url: 'assets/services/gutter.webp', caption: 'Gutter run with moss — before', type: 'before' },
    { url: 'assets/gallery/gutter-spout-before.webp', caption: 'Blocked outlet — before', type: 'before' },
    { url: 'assets/gallery/gutter-leaves.webp', caption: 'Leaf debris removed', type: 'before' },
    { url: 'assets/gallery/gutter-after.webp', caption: 'Clean gutter & downpipe — after', type: 'after' },
    { url: 'assets/gallery/downpipe-after.webp', caption: 'Downpipe clear — after', type: 'after' },
  ],
  window: [
    { url: 'assets/gallery/window-sash-before.webp', caption: 'Grimy glass — before', type: 'before' },
    { url: 'assets/services/windows.webp', caption: 'Cleaning in progress', type: 'before' },
    { url: 'assets/gallery/window-sash-after.webp', caption: 'Crystal clear — after', type: 'after' },
    { url: 'assets/hero/hero-window-cleaner-sm.webp', caption: 'Water-fed pole clean', type: 'after' },
  ],
  plumbing: [
    { url: 'assets/gallery/plumbing-undersink.webp', caption: 'Leak under sink — before', type: 'before' },
    { url: 'assets/gallery/plumbing-tap.webp', caption: 'Dripping tap — before', type: 'before' },
    { url: 'assets/gallery/plumbing-cabinet.webp', caption: 'New fittings — after', type: 'after' },
    { url: 'assets/services/plumbing.webp', caption: 'Pipework repaired — after', type: 'after' },
    { url: 'assets/gallery/plumbing-tiles.webp', caption: 'Access panel refitted — after', type: 'after' },
  ],
};
