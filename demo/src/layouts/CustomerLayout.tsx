import { useEffect, useId, useMemo } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Briefcase, ChevronDown, FileText, Globe, House, Lock, Mail, MessageSquare, Phone, ReceiptText, UserRound, type LucideIcon } from 'lucide-react';
import { useDemo } from '../app/DemoProvider';
import { isOutstanding } from '../app/selectors';
import { FieldMateMark, Logo } from '../components/common/Logo';
import { Avatar } from '../components/common/Avatar';
import { DemoButton } from '../components/demo/DemoControls';
import { isQuotePending, portalPeople, useCallBusiness, usePortal } from '../components/customer/PortalUi';
import { cx } from '../utils/cx';

interface NavItem {
  to: string;
  label: string;
  short: string;
  icon: LucideIcon;
  end?: boolean;
  badge?: 'quotes' | 'invoices';
}

const NAV: NavItem[] = [
  { to: '/portal', label: 'Home', short: 'Home', icon: House, end: true },
  { to: '/portal/jobs', label: 'My Jobs', short: 'Jobs', icon: Briefcase },
  { to: '/portal/quotes', label: 'Quotes', short: 'Quotes', icon: FileText, badge: 'quotes' },
  { to: '/portal/invoices', label: 'Invoices', short: 'Invoices', icon: ReceiptText, badge: 'invoices' },
  { to: '/portal/messages', label: 'Messages', short: 'Messages', icon: MessageSquare },
  { to: '/portal/profile', label: 'Profile', short: 'Profile', icon: UserRound },
];

/** Things that need the customer's attention, shown as small counts in the navigation. */
function useNavCounts() {
  const { quotes, invoices } = usePortal();
  return {
    quotes: quotes.filter((q) => isQuotePending(q.status)).length,
    invoices: invoices.filter(isOutstanding).length,
  };
}

export function CustomerLayout() {
  const { pathname } = useLocation();
  const { actions } = useDemo();
  useEffect(() => {
    actions.setPersona({ persona: 'customer' });
  }, [actions]);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <button
        type="button"
        onClick={() => document.getElementById('portal-main')?.focus()}
        className="sr-only z-[90] rounded-lg bg-surface px-4 py-2 font-semibold shadow-float focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </button>
      <PortalTopBar />
      <PortalHeader />
      <main id="portal-main" tabIndex={-1} className="flex-1 outline-none">
        <div className="mx-auto w-full max-w-[1100px] px-4 pb-12 pt-6 sm:px-6 md:pb-16 md:pt-8">
          <Outlet />
        </div>
      </main>
      <PortalFooter />
      <MobileTabBar />
    </div>
  );
}

/** Slim brand strip: secure-portal reassurance + presenter controls ("viewing as" and Demo). */
function PortalTopBar() {
  const { state, actions } = useDemo();
  const people = useMemo(() => portalPeople(state), [state]);
  const key = state.persona.portalCustomerKey.toLowerCase();
  const id = useId();
  return (
    <div className="bg-primary-solid text-primary-on">
      <div className="mx-auto flex h-11 max-w-[1100px] items-center justify-between gap-3 px-4 text-[13px] sm:px-6">
        <p className="hidden items-center gap-1.5 opacity-85 sm:flex">
          <Lock className="size-3.5" aria-hidden /> Secure customer portal
        </p>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:flex-none">
          <label htmlFor={id} className="shrink-0 opacity-80">
            Viewing as
          </label>
          <span className="relative min-w-0">
            <select
              id={id}
              value={key}
              onChange={(e) => actions.setPersona({ portalCustomerKey: e.target.value })}
              className="h-8 w-full max-w-[12rem] cursor-pointer appearance-none truncate rounded-full border border-primary-on/30 bg-primary-on/10 pl-3 pr-8 text-[13px] font-semibold text-primary-on outline-none transition hover:bg-primary-on/15 focus-visible:ring-2 focus-visible:ring-primary-on/60"
            >
              {people.map((p) => (
                <option key={p.email} value={p.email} className="bg-surface text-ink">
                  {p.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 opacity-80" aria-hidden />
          </span>
          <DemoButton light className="h-8 shrink-0" />
        </div>
      </div>
    </div>
  );
}

function CountDot({ count, className }: { count: number; className?: string }) {
  if (!count) return null;
  return (
    <span className={cx('grid h-[18px] min-w-[18px] place-items-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-white', className)} aria-hidden>
      {count}
    </span>
  );
}

function srCount(count: number) {
  return count ? <span className="sr-only">{`, ${count} need${count === 1 ? 's' : ''} your attention`}</span> : null;
}

function PortalHeader() {
  const { config, name, firstName } = usePortal();
  const counts = useNavCounts();
  const linkCls = ({ isActive }: { isActive: boolean }) =>
    cx('inline-flex shrink-0 items-center gap-1.5 rounded-control px-3 py-2 text-sm font-semibold transition', isActive ? 'bg-secondary-soft text-secondary-ink' : 'text-ink-2 hover:bg-subtle hover:text-ink');
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85">
      <div className="mx-auto flex h-16 max-w-[1100px] items-center gap-4 px-4 sm:px-6 lg:h-[72px]">
        <Link to="/portal" aria-label={`${config.company.companyName} customer portal — home`} className="flex min-w-0 items-center gap-3">
          <Logo size={38} />
          <span className="hidden rounded-full bg-subtle px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-muted xl:inline">Customer portal</span>
        </Link>
        <nav aria-label="Customer portal" className="ml-auto hidden items-center gap-0.5 lg:flex">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={linkCls}>
              {n.label}
              {n.badge && <CountDot count={counts[n.badge]} />}
              {n.badge && srCount(counts[n.badge])}
            </NavLink>
          ))}
        </nav>
        <Link
          to="/portal/profile"
          aria-label={`Your profile — ${name}`}
          className="ml-auto flex shrink-0 items-center gap-2 rounded-full p-0.5 transition hover:bg-subtle lg:ml-2 xl:pr-3"
        >
          <Avatar name={name} color={config.branding.primaryColor} size="sm" />
          <span className="hidden max-w-[8rem] truncate text-sm font-semibold text-ink xl:inline">{firstName}</span>
        </Link>
      </div>
      {/* Tablet: a scrollable nav row under the header */}
      <nav aria-label="Customer portal sections" className="no-scrollbar hidden gap-1 overflow-x-auto border-t border-line px-4 py-2 sm:px-6 md:flex lg:hidden">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={linkCls}>
            <n.icon className="size-4" aria-hidden />
            {n.label}
            {n.badge && <CountDot count={counts[n.badge]} />}
            {n.badge && srCount(counts[n.badge])}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}

function MobileTabBar() {
  const counts = useNavCounts();
  return (
    <nav
      aria-label="Customer portal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-12px_rgb(16_24_40/0.25)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {NAV.slice(0, 5).map((n) => (
          <li key={n.to}>
            <NavLink
              to={n.to}
              end={n.end}
              className={({ isActive }) => cx('relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition', isActive ? 'text-secondary-ink' : 'text-muted hover:text-ink')}
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute inset-x-4 top-0 h-[3px] rounded-b-full bg-secondary-solid" aria-hidden />}
                  <span className="relative">
                    <n.icon className={cx('size-[22px] transition', isActive && 'scale-110')} aria-hidden />
                    {n.badge && <CountDot count={counts[n.badge]} className="absolute -right-2.5 -top-1.5 ring-2 ring-surface" />}
                  </span>
                  {n.short}
                  {n.badge && srCount(counts[n.badge])}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function PortalFooter() {
  const { company, branding } = useDemo().state.config;
  const call = useCallBusiness();
  return (
    <footer className="border-t border-line bg-surface pb-20 md:pb-0">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <Logo size={34} />
          <p className="mt-2 text-[13px] text-muted">{company.openingHours}</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
          <button type="button" onClick={call} className="inline-flex items-center gap-1.5 font-semibold text-ink-2 transition hover:text-ink">
            <Phone className="size-4" aria-hidden /> {company.phone}
          </button>
          <span className="inline-flex min-w-0 items-center gap-1.5 text-ink-2">
            <Mail className="size-4 shrink-0" aria-hidden /> <span className="break-all">{company.email}</span>
          </span>
          <Link to="/" className="inline-flex items-center gap-1.5 font-semibold text-secondary-ink hover:underline">
            <Globe className="size-4" aria-hidden /> Back to website
          </Link>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-[1100px] flex-col gap-2 px-4 py-4 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© 2026 {company.companyName} · Fictional demo business — no real payments, emails or texts.</p>
          {branding.showPoweredByFieldMate && (
            <span className="inline-flex items-center gap-1.5">
              Powered by <FieldMateMark />
            </span>
          )}
        </div>
      </div>
    </footer>
  );
}
