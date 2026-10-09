import { CloudRain, Droplets, Hammer, House, Leaf, PanelsTopLeft, ShowerHead, Sparkles, SprayCan, Wrench, type LucideProps } from 'lucide-react';

const MAP = {
  wrench: Wrench,
  droplets: Droplets,
  'shower-head': ShowerHead,
  'cloud-rain': CloudRain,
  house: House,
  sparkles: Sparkles,
  'panels-top-left': PanelsTopLeft,
  'spray-can': SprayCan,
  leaf: Leaf,
  hammer: Hammer,
} as const;

export function ServiceIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = MAP[name as keyof typeof MAP] ?? Wrench;
  return <Icon aria-hidden {...props} />;
}
