import type { ServiceConfig, ServiceType } from '../types/domain';

export const DEFAULT_SERVICES: ServiceConfig[] = [
  {
    id: 'plumbing',
    slug: 'plumbing',
    name: 'Plumbing',
    heroWord: 'Plumbing.',
    icon: 'wrench',
    color: '#1677FF',
    description: 'Leaks, taps, toilets, pipework, radiators',
    startingPrice: 85,
    priceUnit: 'visit',
    recurring: false,
    enabled: true,
    sortOrder: 1,
    image: 'assets/services/plumbing.webp',
    cta: 'Start Plumbing Request',
  },
  {
    id: 'gutter',
    slug: 'gutter-cleaning',
    name: 'Gutter Cleaning',
    heroWord: 'Gutters.',
    icon: 'cloud-rain',
    color: '#0F9D8A',
    description: 'Gutter vacuum, downpipes, before/after evidence',
    startingPrice: 70,
    priceUnit: 'clean',
    recurring: true,
    enabled: true,
    sortOrder: 2,
    image: 'assets/services/gutter.webp',
    cta: 'Start Gutter Quote',
  },
  {
    id: 'window',
    slug: 'window-cleaning',
    name: 'Window Cleaning',
    heroWord: 'Windows.',
    icon: 'sparkles',
    color: '#24A7C5',
    description: 'One-off or recurring residential cleaning',
    startingPrice: 22,
    priceUnit: 'clean',
    recurring: true,
    enabled: true,
    sortOrder: 3,
    image: 'assets/services/windows.webp',
    cta: 'Start Window Quote',
  },
];

export const SERVICE_SLUG: Record<ServiceType, string> = {
  plumbing: 'plumbing',
  gutter: 'gutter-cleaning',
  window: 'window-cleaning',
};

export function serviceFromSlug(slug?: string): ServiceType | undefined {
  if (!slug) return undefined;
  if (slug === 'plumbing') return 'plumbing';
  if (slug === 'gutter-cleaning' || slug === 'gutter' || slug === 'gutters') return 'gutter';
  if (slug === 'window-cleaning' || slug === 'window' || slug === 'windows') return 'window';
  return undefined;
}

export const SERVICE_ICON_OPTIONS = [
  'wrench',
  'droplets',
  'shower-head',
  'cloud-rain',
  'house',
  'sparkles',
  'panels-top-left',
  'spray-can',
  'leaf',
  'hammer',
] as const;
