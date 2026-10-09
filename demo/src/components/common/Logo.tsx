import type { LogoMark } from '../../types/domain';
import { useConfig } from '../../app/DemoProvider';
import { cx } from '../../utils/cx';

/** Brand mark drawn with the live brand colours. */
export function BrandMark({ mark, primary, accent, size = 40, dataUrl, className }: { mark: LogoMark; primary: string; accent: string; size?: number; dataUrl?: string; className?: string }) {
  if (mark === 'custom' && dataUrl) {
    return <img src={dataUrl} alt="" width={size} height={size} className={cx('shrink-0 rounded-lg object-contain', className)} />;
  }
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={cx('shrink-0', className)} aria-hidden>
      <rect width="40" height="40" rx="11" fill={primary} />
      {mark === 'clearflow' && (
        <>
          <path d="M9 19.5 20 10l11 9.5" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M20 16.5c-3.3 4.2-5.2 7-5.2 9.4a5.2 5.2 0 0 0 10.4 0c0-2.4-1.9-5.2-5.2-9.4Z" fill={accent} />
          <path d="M17.6 26.4a2.6 2.6 0 0 0 2.4 1.9" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity=".85" />
        </>
      )}
      {mark === 'shield' && (
        <>
          <path d="M20 8.5 29.5 12v7.4c0 6-4 10.4-9.5 12.1-5.5-1.7-9.5-6.1-9.5-12.1V12L20 8.5Z" fill={accent} />
          <path d="m15.5 20.2 3.2 3.2 6.1-6.6" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {mark === 'leaf' && (
        <>
          <path d="M29 10.5C18 10.5 11 16 11 24.5c0 2 .5 3.6 1.3 4.9C14 22.8 19 18.6 24.5 17c-4.7 2.6-8.7 6.6-10.7 13 1.6.9 3.4 1.4 5.4 1.4 7.6 0 10.8-7 9.8-20.9Z" fill={accent} />
        </>
      )}
      {mark === 'spark' && (
        <>
          <path d="M20 8.5c.9 5.9 4.6 9.6 10.5 10.5-5.9.9-9.6 4.6-10.5 10.5-.9-5.9-4.6-9.6-10.5-10.5C15.4 18.1 19.1 14.4 20 8.5Z" fill={accent} />
          <circle cx="29" cy="29" r="2.4" fill="#fff" />
        </>
      )}
      {mark === 'custom' && <text x="20" y="25" textAnchor="middle" fontSize="13" fontWeight="800" fill="#fff">LOGO</text>}
    </svg>
  );
}

/** Logo lock-up: mark + company name, wired to white-label settings. */
export function Logo({ size = 40, light, compact, className, showTagline }: { size?: number; light?: boolean; compact?: boolean; className?: string; showTagline?: boolean }) {
  const cfg = useConfig();
  const { branding, company } = cfg;
  const words = company.companyName.split(' ');
  const first = words.slice(0, Math.min(2, Math.max(1, words.length - 2))).join(' ');
  const rest = words.slice(first.split(' ').length).join(' ');
  return (
    <span className={cx('inline-flex min-w-0 items-center gap-2.5', className)}>
      <BrandMark mark={branding.logoMark} primary={light ? 'rgba(255,255,255,0.14)' : branding.primaryColor} accent={branding.secondaryColor} dataUrl={branding.logoDataUrl} size={size} />
      {!compact && (
        <span className="min-w-0 leading-none">
          <span className={cx('block truncate font-display text-[17px] font-extrabold tracking-tight', light ? 'text-white' : 'text-primary-ink')}>{first}</span>
          {rest && <span className={cx('mt-0.5 block truncate text-[11px] font-bold uppercase tracking-[0.16em]', light ? 'text-white/70' : 'text-accent-ink')}>{rest}</span>}
          {showTagline && <span className={cx('mt-1 block truncate text-xs', light ? 'text-white/60' : 'text-muted')}>{company.tagline}</span>}
        </span>
      )}
    </span>
  );
}

export function FieldMateMark({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 font-semibold', light ? 'text-white/70' : 'text-muted', className)}>
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
        <rect width="16" height="16" rx="4.5" fill={light ? '#ffffff' : '#101828'} opacity={light ? 0.9 : 1} />
        <path d="M4.5 11.5V4.5h6M4.5 8h4.5" stroke={light ? '#101828' : '#fff'} strokeWidth="1.8" strokeLinecap="round" fill="none" />
      </svg>
      FieldMate
    </span>
  );
}
