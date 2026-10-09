import type { BrandingSettings } from '../types/domain';
import { FONT_PRESETS, RADIUS_PRESETS } from '../data/brand';

// ---------------------------------------------------------------- colour maths
type RGB = [number, number, number];

export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '').trim();
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.padEnd(6, '0').slice(0, 6);
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: RGB): string {
  return `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

export function mix(a: string, b: string, t: number): string {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return rgbToHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}

/** Darken `color` towards black until it reaches `ratio` against white. */
export function inkOnWhite(color: string, ratio = 4.5): string {
  let c = color;
  for (let i = 0; i < 40 && contrast(c, '#ffffff') < ratio; i++) c = mix(c, '#000000', 0.05);
  return c;
}

const DARK_TEXT = '#0B1320';

/** Solid background + readable foreground for a brand colour used as a button/badge fill. */
export function solidPair(color: string): { solid: string; on: string } {
  if (contrast(color, '#ffffff') >= 4.5) return { solid: color, on: '#ffffff' };
  if (contrast(color, '#ffffff') >= 2.6) return { solid: inkOnWhite(color), on: '#ffffff' };
  return { solid: color, on: DARK_TEXT };
}

export function isValidHex(v: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.trim());
}

// ---------------------------------------------------------------- CSS variables
export function brandVariables(b: BrandingSettings): Record<string, string> {
  const vars: Record<string, string> = {};
  const set = (name: string, color: string) => {
    const { solid, on } = solidPair(color);
    vars[`--brand-${name}`] = color;
    vars[`--brand-${name}-solid`] = solid;
    vars[`--brand-${name}-on`] = on;
    vars[`--brand-${name}-ink`] = inkOnWhite(color);
    vars[`--brand-${name}-soft`] = mix(color, '#ffffff', 0.9);
    vars[`--brand-${name}-tint`] = mix(color, '#ffffff', 0.8);
    vars[`--brand-${name}-deep`] = mix(color, '#000000', 0.35);
  };
  set('primary', b.primaryColor);
  set('secondary', b.secondaryColor);
  set('accent', b.accentColor);
  const font = FONT_PRESETS[b.fontPreset] ?? FONT_PRESETS.modern;
  vars['--brand-font-display'] = font.display;
  vars['--brand-font-body'] = font.body;
  const r = RADIUS_PRESETS[b.borderRadiusPreset] ?? RADIUS_PRESETS.rounded;
  vars['--brand-radius-card'] = r.card;
  vars['--brand-radius-control'] = r.control;
  vars['--brand-radius-pill'] = r.pill;
  return vars;
}

export function applyBrandVariables(b: BrandingSettings, el: HTMLElement = document.documentElement): void {
  const vars = brandVariables(b);
  Object.entries(vars).forEach(([k, v]) => el.style.setProperty(k, v));
}

/** Tints for service accent colours (used for chips, icons and calendar blocks). */
export function serviceTone(color: string) {
  return {
    color,
    ink: inkOnWhite(color),
    soft: mix(color, '#ffffff', 0.9),
    tint: mix(color, '#ffffff', 0.78),
    border: mix(color, '#ffffff', 0.6),
    solid: solidPair(color).solid,
    on: solidPair(color).on,
  };
}
