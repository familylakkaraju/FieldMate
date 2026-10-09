import type { BrandingSettings, CompanySettings, FontPreset, RadiusPreset, LogoMark } from '../types/domain';

export const DEFAULT_COMPANY: CompanySettings = {
  companyName: 'ClearFlow Home Services',
  tagline: 'Plumbing. Gutters. Windows. One trusted local team.',
  phone: '01245 000 000',
  email: 'hello@clearflow.example',
  address: 'Unit 4, Riverside Yard, Chelmsford, Essex CM2 0XX',
  serviceAreas: ['Chelmsford', 'Maldon', 'Colchester', 'Brentwood', 'Braintree', 'East London', 'Surrounding Essex'],
  openingHours: 'Mon–Fri 7:30–18:00 · Sat 8:00–13:00 · Emergency plumbing 7 days',
  region: 'Essex',
};

export const DEFAULT_BRANDING: BrandingSettings = {
  presetId: 'clearflow',
  logoMark: 'clearflow',
  primaryColor: '#123B5D',
  secondaryColor: '#1677FF',
  accentColor: '#0F9D8A',
  fontPreset: 'modern',
  borderRadiusPreset: 'rounded',
  heroStyle: 'image',
  showPoweredByFieldMate: true,
};

export interface BrandPreset {
  id: string;
  name: string;
  description: string;
  branding: Omit<BrandingSettings, 'showPoweredByFieldMate' | 'heroStyle' | 'logoDataUrl'>;
}

export const BRAND_PRESETS: BrandPreset[] = [
  {
    id: 'clearflow',
    name: 'ClearFlow Blue',
    description: 'Navy, bright blue and teal. Calm and trustworthy.',
    branding: { presetId: 'clearflow', logoMark: 'clearflow', primaryColor: '#123B5D', secondaryColor: '#1677FF', accentColor: '#0F9D8A', fontPreset: 'modern', borderRadiusPreset: 'rounded' },
  },
  {
    id: 'trade-navy',
    name: 'Trade Navy',
    description: 'Deep navy with a safety-amber call to action.',
    branding: { presetId: 'trade-navy', logoMark: 'shield', primaryColor: '#0B1F3A', secondaryColor: '#E8590C', accentColor: '#F5A524', fontPreset: 'clean', borderRadiusPreset: 'sharp' },
  },
  {
    id: 'fresh-green',
    name: 'Fresh Green',
    description: 'Fresh, eco-friendly greens for exterior cleaning brands.',
    branding: { presetId: 'fresh-green', logoMark: 'leaf', primaryColor: '#14422D', secondaryColor: '#16A34A', accentColor: '#65A30D', fontPreset: 'friendly', borderRadiusPreset: 'soft' },
  },
  {
    id: 'premium-charcoal',
    name: 'Premium Charcoal',
    description: 'Charcoal and brass for a premium, boutique feel.',
    branding: { presetId: 'premium-charcoal', logoMark: 'spark', primaryColor: '#1F2328', secondaryColor: '#9A7442', accentColor: '#5B6B7A', fontPreset: 'clean', borderRadiusPreset: 'rounded' },
  },
];

export const FONT_PRESETS: Record<FontPreset, { label: string; display: string; body: string; sample: string }> = {
  modern: {
    label: 'Modern — Manrope + Inter',
    display: "'Manrope Variable', 'Inter Variable', ui-sans-serif, system-ui, sans-serif",
    body: "'Inter Variable', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
    sample: 'Manrope',
  },
  clean: {
    label: 'Clean — Inter',
    display: "'Inter Variable', ui-sans-serif, system-ui, sans-serif",
    body: "'Inter Variable', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
    sample: 'Inter',
  },
  friendly: {
    label: 'Friendly — Plus Jakarta Sans',
    display: "'Plus Jakarta Sans Variable', ui-sans-serif, system-ui, sans-serif",
    body: "'Plus Jakarta Sans Variable', ui-sans-serif, system-ui, sans-serif",
    sample: 'Plus Jakarta Sans',
  },
  system: {
    label: 'System — device default',
    display: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    body: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    sample: 'System UI',
  },
};

export const RADIUS_PRESETS: Record<RadiusPreset, { label: string; card: string; control: string; pill: string }> = {
  sharp: { label: 'Sharp', card: '6px', control: '6px', pill: '6px' },
  rounded: { label: 'Rounded', card: '16px', control: '10px', pill: '999px' },
  soft: { label: 'Soft', card: '24px', control: '999px', pill: '999px' },
};

export const LOGO_MARKS: { id: LogoMark; label: string }[] = [
  { id: 'clearflow', label: 'Droplet house' },
  { id: 'shield', label: 'Shield' },
  { id: 'leaf', label: 'Leaf' },
  { id: 'spark', label: 'Spark' },
];

export const EXAMPLE_REBRAND = {
  companyName: 'ABC Plumbing & Exterior Cleaning',
  tagline: 'Plumbing and exterior cleaning you can rely on.',
  phone: '01632 960 000',
  email: 'office@abc-exterior.example',
  presetId: 'trade-navy',
};
