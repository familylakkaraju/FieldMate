import type { ServiceType } from '../types/domain';

// Public-site content: fictional reviews, gallery and service page copy.

export interface Review {
  id: string;
  name: string;
  area: string;
  service: ServiceType;
  rating: number;
  text: string;
  when: string;
}

export const REVIEWS: Review[] = [
  { id: 'r1', name: 'Rachel', area: 'Great Baddow', service: 'gutter', rating: 5, when: '2 weeks ago', text: 'Maya and Owen vacuumed the gutters front and back and I had before-and-after photos in my portal the same afternoon. Really reassuring.' },
  { id: 'r2', name: 'Tom', area: 'Moulsham', service: 'plumbing', rating: 5, when: '3 weeks ago', text: 'Daniel fixed our leaking kitchen tap a couple of hours after I called. Clear price up front and no mess left behind.' },
  { id: 'r3', name: 'Anita', area: 'Springfield', service: 'window', rating: 5, when: '1 month ago', text: 'We have been on the 4-week window round for over a year. Never missed, and the frames and sills are always done.' },
  { id: 'r4', name: 'James', area: 'Maldon', service: 'gutter', rating: 5, when: '1 month ago', text: 'Loved being able to follow the job online and pay the invoice from my phone. The blocked downpipe was sorted on the spot.' },
  { id: 'r5', name: 'Margaret', area: 'Brentwood', service: 'plumbing', rating: 5, when: '2 months ago', text: 'Radiator valves replaced, the system rebalanced and everything explained. Very professional and tidy.' },
  { id: 'r6', name: 'Lucy', area: 'Colchester', service: 'window', rating: 5, when: '2 months ago', text: 'Booked a one-off clean before selling the house — the windows and conservatory looked brand new.' },
  { id: 'r7', name: 'Paul', area: 'Maldon', service: 'gutter', rating: 5, when: '3 months ago', text: 'The final invoice matched the quote exactly, even though the downpipe needed extra work. That honesty is why I keep coming back.' },
  { id: 'r8', name: 'Hannah', area: 'Braintree', service: 'plumbing', rating: 4, when: '3 months ago', text: 'Friendly, on time and they texted when they were on the way. Would use again.' },
  { id: 'r9', name: 'Sean', area: 'Colchester', service: 'window', rating: 5, when: '4 months ago', text: 'Easy online booking and a proper reminder before each clean. Exactly what you want.' },
];

export interface GalleryItem {
  id: string;
  service: ServiceType;
  title: string;
  location: string;
  outcome: string;
  image: string;
  before?: string;
}

export const GALLERY: GalleryItem[] = [
  { id: 'g1', service: 'gutter', title: 'Rear gutter run cleared', location: 'Great Baddow', outcome: 'Moss and silt removed, water flowing freely to the downpipe.', before: 'assets/services/gutter.webp', image: 'assets/gallery/gutter-after.webp' },
  { id: 'g2', service: 'window', title: 'Sash windows restored to sparkle', location: 'Chelmsford', outcome: 'Grime and water spots removed with purified water.', before: 'assets/gallery/window-sash-before.webp', image: 'assets/gallery/window-sash-after.webp' },
  { id: 'g3', service: 'gutter', title: 'Blocked downpipe cleared', location: 'Maldon', outcome: 'Compacted leaves removed — overflow stopped.', before: 'assets/gallery/gutter-spout-before.webp', image: 'assets/gallery/downpipe-after.webp' },
  { id: 'g4', service: 'plumbing', title: 'Bathroom pipework repair', location: 'Brentwood', outcome: 'Leaking joints remade and pipework re-clipped.', image: 'assets/services/plumbing.webp' },
  { id: 'g5', service: 'window', title: 'Water-fed pole clean', location: 'Moulsham', outcome: 'First-floor windows cleaned safely from the ground.', image: 'assets/hero/hero-window-cleaner-sm.webp' },
  { id: 'g6', service: 'plumbing', title: 'Under-sink waste replacement', location: 'Chelmsford', outcome: 'Cracked trap replaced and leak tested.', image: 'assets/gallery/plumbing-undersink.webp' },
  { id: 'g7', service: 'gutter', title: 'Autumn leaf clearance', location: 'Writtle', outcome: 'Leaf guards cleared before the winter rain.', image: 'assets/gallery/gutter-leaves.webp' },
  { id: 'g8', service: 'window', title: 'Frames & sills included', location: 'Springfield', outcome: 'Glass, frames and sills done on every visit.', image: 'assets/services/windows.webp' },
  { id: 'g9', service: 'plumbing', title: 'Kitchen mixer tap fitted', location: 'Braintree', outcome: 'Dripping tap replaced with a new mixer.', image: 'assets/gallery/plumbing-tap.webp' },
  { id: 'g10', service: 'plumbing', title: 'Boxing & access panel refit', location: 'Colchester', outcome: 'Concealed cistern repaired and panel refitted neatly.', image: 'assets/gallery/plumbing-tiles.webp' },
  { id: 'g11', service: 'gutter', title: 'Semi-detached — full gutter clean', location: 'Chelmsford', outcome: 'Front, rear and extension gutters cleared.', image: 'assets/homes/home-semi.webp' },
  { id: 'g12', service: 'window', title: 'New-build window round', location: 'Great Baddow', outcome: 'Added to the 4-weekly round with reminders.', image: 'assets/homes/home-detached.webp' },
];

export interface ServiceContent {
  heroTitle: string;
  heroText: string;
  bullets: string[];
  problems: { title: string; text: string }[];
  pricing: { label: string; price: string; note: string }[];
  faqs: { q: string; a: string }[];
  extraImage: string;
}

export const SERVICE_CONTENT: Record<ServiceType, ServiceContent> = {
  plumbing: {
    heroTitle: 'Local plumbers who turn up when they say they will',
    heroText: 'From dripping taps to leaking pipework, our plumbers fix it properly first time — with a clear price before we start.',
    bullets: ['Leaks & drips', 'Taps & mixers', 'Toilets & cisterns', 'Sinks & wastes', 'Pipework', 'Radiators & valves', 'Minor installations'],
    problems: [
      { title: 'Dripping or leaking tap', text: 'Usually a worn cartridge or washer — most are fixed in under an hour.' },
      { title: 'Toilet keeps running', text: 'Fill and flush valves replaced with quality parts.' },
      { title: 'Leak under the sink', text: 'Traps, wastes and compression fittings repaired or replaced.' },
      { title: 'Cold radiators', text: 'Bleeding, balancing and valve replacements.' },
    ],
    pricing: [
      { label: 'Minor plumbing visit', price: 'from £85', note: 'Call-out & first 30 minutes' },
      { label: 'Tap or cartridge replacement', price: 'from £110', note: 'Parts quoted on the day' },
      { label: 'Same-day urgent call', price: 'from £120', note: 'Subject to availability' },
    ],
    faqs: [
      { q: 'Do you charge a call-out fee?', a: 'Our minor plumbing visit includes the call-out and the first 30 minutes of labour. We always confirm the price before starting work.' },
      { q: 'Can you come today?', a: 'We keep a same-day slot for urgent leaks most weekdays. Start a request and choose “urgent” to see today’s availability.' },
      { q: 'Do you work on boilers?', a: 'We focus on plumbing repairs and installations. For gas work we can recommend a registered engineer.' },
    ],
    extraImage: 'assets/gallery/plumbing-undersink.webp',
  },
  gutter: {
    heroTitle: 'Gutter cleaning with proof it’s done',
    heroText: 'We vacuum your gutters from the ground with a high-reach gutter vac, check every downpipe and send you before-and-after photos.',
    bullets: ['Gutter vacuum system', 'No ladders on your roof', 'Downpipe checks', 'Before & after photos', 'Extension & porch gutters', 'Autumn reminders'],
    problems: [
      { title: 'Overflowing gutters', text: 'Leaves, moss and silt stop water reaching the downpipe.' },
      { title: 'Blocked downpipes', text: 'Cleared with rods and a flush test — we show you it’s flowing.' },
      { title: 'Damp patches on walls', text: 'Often caused by blocked or leaking gutters above.' },
      { title: 'Plants growing in gutters', text: 'Removed at the root so they don’t come back.' },
    ],
    pricing: [
      { label: 'Terrace', price: 'from £70', note: 'Front & rear' },
      { label: 'Semi-detached', price: 'from £90', note: 'Front & rear' },
      { label: 'Detached', price: 'from £120', note: 'Front & rear' },
    ],
    faqs: [
      { q: 'How often should gutters be cleaned?', a: 'Once a year for most homes, ideally in autumn once the leaves have dropped. Homes near trees may need two cleans.' },
      { q: 'Do I need to be home?', a: 'No — as long as we can reach the rear garden. You’ll get photos in your customer portal when we finish.' },
      { q: 'What if a downpipe is blocked?', a: 'We’ll clear it on the spot where possible. Downpipe clearance is £25 and we’ll always tell you first.' },
    ],
    extraImage: 'assets/homes/street-autumn.webp',
  },
  window: {
    heroTitle: 'Sparkling windows, on a schedule that suits you',
    heroText: 'Purified-water window cleaning with frames and sills included. Join our regular round or book a one-off clean.',
    bullets: ['Water-fed pole system', 'Frames & sills included', '4, 6 or 8-weekly rounds', 'Conservatory add-on', 'Text reminder before each visit', 'Pay online after each clean'],
    problems: [
      { title: 'Streaks and water spots', text: 'Purified water dries spot-free — no chemicals, no smears.' },
      { title: 'Hard-to-reach upstairs windows', text: 'Our poles reach up to three storeys from the ground.' },
      { title: 'Grimy frames and sills', text: 'Always cleaned as part of the service, not an extra.' },
      { title: 'Conservatory roofs', text: 'Soft-washed with brushes designed for polycarbonate and glass.' },
    ],
    pricing: [
      { label: '2–3 bed terrace / semi', price: 'from £18', note: 'Per regular clean' },
      { label: '3–4 bed semi / detached', price: 'from £22', note: 'Per regular clean' },
      { label: 'Large detached', price: 'from £32', note: 'Per regular clean' },
    ],
    faqs: [
      { q: 'What if it rains?', a: 'Purified water leaves no residue, so light rain won’t spoil the result. We only reschedule in heavy rain or high winds.' },
      { q: 'Do I need to be in?', a: 'No — we just need access to the back garden. We text you the day before and when we’re done.' },
      { q: 'Can I pause my round?', a: 'Yes, pause or change frequency at any time from your customer portal.' },
    ],
    extraImage: 'assets/homes/home-detached-garage.webp',
  },
};

// Static, fictional availability shown on the public site.
export const AVAILABILITY: Record<ServiceType, { label: string; when: string; detail: string }> = {
  plumbing: { label: 'Next plumbing slot', when: 'Today 16:00', detail: 'Urgent leaks prioritised' },
  gutter: { label: 'Next gutter slot', when: 'Friday 10:00', detail: 'Autumn is our busiest season' },
  window: { label: 'Next window round', when: 'Monday', detail: 'Springfield & Chelmsford CM1' },
};
