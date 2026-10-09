import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  Bot,
  BriefcaseBusiness,
  CalendarDays,
  Camera,
  ChartColumn,
  ChevronDown,
  ClipboardCheck,
  ExternalLink,
  FileText,
  Globe,
  HardHat,
  Inbox,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  PoundSterling,
  ReceiptText,
  Search,
  Settings,
  User,
  UserPlus,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useDemo } from '../app/DemoProvider';
import { openLeads } from '../app/selectors';
import { Logo, FieldMateMark } from '../components/common/Logo';
import { Avatar } from '../components/common/Avatar';
import { DemoButton } from '../components/demo/DemoControls';
import { QuickActionsProvider, useQuickActions } from '../components/owner/QuickActions';
import { cx } from '../utils/cx';

interface Item {
  to: string;
  label: string;
  icon: LucideIcon;
  count?: number;
  end?: boolean;
}

export function OwnerLayout() {
  return (
    <QuickActionsProvider>
      <OwnerShell />
    </QuickActionsProvider>
  );
}

function OwnerShell() {
  const { state, actions } = useDemo();
  const [mobileNav, setMobileNav] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setMobileNav(false), [pathname]);
  useEffect(() => {
    if (state.persona.persona !== 'owner') actions.setPersona({ persona: 'owner' });
  }, [state.persona.persona, actions]);
  useEffect(() => {
    document.getElementById('owner-main')?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
  }, [pathname]);

  const unread = state.data.notifications.filter((n) => !n.read).length;
  const primary: Item[] = [
    { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/app/leads', label: 'Inbox / Leads', icon: Inbox, count: openLeads(state.data).length },
    { to: '/app/customers', label: 'Customers', icon: Users },
    { to: '/app/jobs', label: 'Jobs', icon: BriefcaseBusiness },
    { to: '/app/tasks', label: 'Tasks', icon: ClipboardCheck },
    { to: '/app/schedule', label: 'Schedule', icon: CalendarDays },
    { to: '/app/quotes', label: 'Quotes', icon: FileText },
    { to: '/app/invoices', label: 'Invoices', icon: ReceiptText },
    { to: '/app/files', label: 'Files & Evidence', icon: Camera },
    { to: '/app/reports', label: 'Reports', icon: ChartColumn },
    { to: '/app/copilot', label: 'AI Copilot', icon: Bot },
  ];
  const secondary: Item[] = [
    { to: '/app/notifications', label: 'Notifications', icon: Bell, count: unread },
    { to: '/app/search', label: 'Search', icon: Search },
  ];
  const settings: Item[] = [{ to: '/app/settings', label: 'Settings', icon: Settings }];

  const nav = (mode: NavMode) => <SidebarNav groups={[primary, secondary, settings]} mode={mode} poweredBy={state.config.branding.showPoweredByFieldMate} />;

  return (
    <div className="min-h-dvh bg-canvas">
      <button type="button" onClick={() => document.getElementById('owner-content')?.focus()} className="sr-only z-[90] rounded-lg bg-surface px-4 py-2 font-semibold focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        Skip to content
      </button>
      {/* Desktop / tablet sidebar */}
      <aside className={cx('fixed inset-y-0 left-0 z-30 hidden flex-col bg-primary-deep text-white transition-[width] md:flex', collapsed ? 'w-[76px]' : 'w-[76px] lg:w-64')}>
        <div className={cx('flex h-16 shrink-0 items-center border-b border-white/10', collapsed ? 'justify-center' : 'justify-center px-4 lg:justify-start')}>
          <Link to="/app/dashboard" aria-label="Dashboard" className="min-w-0">
            <span className={cx(collapsed ? 'block' : 'block lg:hidden')}>
              <Logo light compact size={36} />
            </span>
            {!collapsed && (
              <span className="hidden lg:block">
                <Logo light size={36} />
              </span>
            )}
          </Link>
        </div>
        <div className={cx('min-h-0 flex-1 overflow-y-auto py-3', collapsed ? 'px-2' : 'px-2 lg:px-3')}>{nav(collapsed ? 'rail' : 'responsive')}</div>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="hidden h-11 shrink-0 items-center justify-center gap-2 border-t border-white/10 text-[13px] font-semibold text-white/60 hover:text-white lg:flex"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : (
            <>
              <PanelLeftClose className="size-4" /> Collapse
            </>
          )}
        </button>
      </aside>

      {/* Mobile drawer */}
      {mobileNav && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 animate-fade-in bg-black/40" onClick={() => setMobileNav(false)} aria-hidden />
          <aside role="dialog" aria-modal="true" aria-label="Navigation" className="absolute inset-y-0 left-0 flex w-72 animate-slide-left flex-col bg-primary-deep text-white">
            <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
              <Logo light size={34} />
              <button type="button" onClick={() => setMobileNav(false)} aria-label="Close navigation" className="rounded-lg p-1.5 text-white/70 hover:bg-white/10">
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3">{nav('full')}</div>
          </aside>
        </div>
      )}

      <div className={cx('flex min-h-dvh flex-col transition-[padding]', collapsed ? 'md:pl-[76px]' : 'md:pl-[76px] lg:pl-64')}>
        <OwnerHeader onMenu={() => setMobileNav(true)} />
        <main id="owner-content" tabIndex={-1} className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 outline-none sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

type NavMode = 'rail' | 'full' | 'responsive';

function SidebarNav({ groups, mode, poweredBy }: { groups: Item[][]; mode: NavMode; poweredBy: boolean }) {
  const linkLayout = { rail: 'justify-center px-0', full: 'justify-start px-3', responsive: 'justify-center px-0 lg:justify-start lg:px-3' }[mode];
  const labelCls = { rail: 'sr-only', full: '', responsive: 'sr-only lg:not-sr-only' }[mode];
  const countCls = {
    rail: 'absolute right-1 top-1 h-4 min-w-4 text-[10px]',
    full: 'ml-auto h-5 min-w-5 text-[11px]',
    responsive: 'absolute right-1 top-1 h-4 min-w-4 text-[10px] lg:static lg:ml-auto lg:h-5 lg:min-w-5 lg:text-[11px]',
  }[mode];
  return (
    <nav aria-label="Business portal" className="flex h-full flex-col">
      {groups.map((g, gi) => (
        <ul key={gi} className={cx('space-y-0.5', gi > 0 && 'mt-3 border-t border-white/10 pt-3')}>
          {g.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                title={item.label}
                className={({ isActive }) =>
                  cx('group relative flex h-10 items-center gap-3 rounded-lg text-[14px] font-semibold transition', linkLayout, isActive ? 'bg-white/12 text-white' : 'text-white/70 hover:bg-white/8 hover:text-white')
                }
              >
                <item.icon className="size-[18px] shrink-0" aria-hidden />
                <span className={labelCls}>{item.label}</span>
                {!!item.count && <span className={cx('grid place-items-center rounded-full bg-accent-solid px-1.5 font-bold text-accent-on', countCls)}>{item.count}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      ))}
      <div className={cx('mt-auto space-y-2 pt-6', { rail: 'hidden', full: '', responsive: 'hidden lg:block' }[mode])}>
        <Link to="/" className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-semibold text-white/70 hover:bg-white/8 hover:text-white">
          <Globe className="size-4" aria-hidden /> View public website <ExternalLink className="ml-auto size-3.5" aria-hidden />
        </Link>
        {poweredBy && (
          <div className="px-3 text-xs text-white/50">
            Business portal · <FieldMateMark light className="text-xs" />
          </div>
        )}
      </div>
    </nav>
  );
}

function OwnerHeader({ onMenu }: { onMenu: () => void }) {
  const { state, actions } = useDemo();
  const navigate = useNavigate();
  const quick = useQuickActions();
  const [q, setQ] = useState('');
  const [newOpen, setNewOpen] = useState(false);
  const [personaOpen, setPersonaOpen] = useState(false);
  const newRef = useRef<HTMLDivElement>(null);
  const personaRef = useRef<HTMLDivElement>(null);
  const unread = state.data.notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!newRef.current?.contains(e.target as Node)) setNewOpen(false);
      if (!personaRef.current?.contains(e.target as Node)) setPersonaOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setNewOpen(false);
        setPersonaOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    navigate(`/app/search?q=${encodeURIComponent(q)}`);
  };

  const newItems: { label: string; icon: LucideIcon; run: () => void }[] = [
    { label: 'New Customer', icon: UserPlus, run: () => quick.open('customer') },
    { label: 'New Job', icon: BriefcaseBusiness, run: () => quick.open('job') },
    { label: 'New Quote', icon: FileText, run: () => quick.open('quote') },
    { label: 'Record Payment', icon: PoundSterling, run: () => quick.open('payment') },
    { label: 'Ask Copilot', icon: Bot, run: () => navigate('/app/copilot') },
  ];

  const switchTo = (to: string, persona: 'owner' | 'worker' | 'customer' | 'public') => {
    actions.setPersona({ persona });
    navigate(to);
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-line bg-surface/95 px-3 backdrop-blur sm:gap-3 sm:px-6 lg:px-8">
      <button type="button" onClick={onMenu} aria-label="Open navigation" className="grid size-10 place-items-center rounded-lg text-ink md:hidden">
        <Menu className="size-5" />
      </button>
      <form onSubmit={submit} role="search" className="relative min-w-0 max-w-md flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          type="search"
          placeholder="Search customers, jobs, quotes…"
          aria-label="Global search"
          className="h-10 w-full rounded-control border border-line bg-canvas pl-9 pr-3 text-sm outline-none transition placeholder:text-[#98A2B3] focus:border-secondary focus:bg-surface focus:ring-4 focus:ring-secondary/15"
        />
      </form>
      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <div ref={newRef} className="relative">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={newOpen}
            onClick={() => setNewOpen((v) => !v)}
            className="inline-flex h-10 items-center gap-1.5 rounded-control bg-secondary-solid px-3 text-sm font-semibold text-secondary-on shadow-sm hover:brightness-110"
          >
            <Plus className="size-4" aria-hidden />
            <span className="hidden sm:inline">New</span>
          </button>
          {newOpen && (
            <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-56 animate-rise rounded-xl border border-line bg-surface p-1.5 shadow-float">
              {newItems.map((it) => (
                <button
                  key={it.label}
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    setNewOpen(false);
                    it.run();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-ink hover:bg-subtle"
                >
                  <it.icon className="size-4 text-muted" aria-hidden />
                  {it.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <Link to="/app/notifications" aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`} className="relative grid size-10 place-items-center rounded-lg text-ink-2 hover:bg-subtle">
          <Bell className="size-5" />
          {unread > 0 && <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">{unread}</span>}
        </Link>
        <DemoButton className="max-sm:hidden" />
        <div ref={personaRef} className="relative">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={personaOpen}
            onClick={() => setPersonaOpen((v) => !v)}
            className="flex items-center gap-2 rounded-full p-0.5 pr-1 hover:bg-subtle sm:pr-2"
            aria-label="Switch demo persona"
          >
            <Avatar name="Daniel Reed" color="#1D4ED8" size="sm" />
            <span className="hidden text-left leading-tight xl:block">
              <span className="block text-[13px] font-semibold text-ink">Daniel Reed</span>
              <span className="block text-[11px] text-muted">Owner / Office</span>
            </span>
            <ChevronDown className="hidden size-4 text-muted sm:block" aria-hidden />
          </button>
          {personaOpen && (
            <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-64 animate-rise rounded-xl border border-line bg-surface p-1.5 shadow-float">
              <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-muted">Demo persona</p>
              {[
                { label: 'Owner / Office', sub: 'You are here', icon: LayoutDashboard, run: () => setPersonaOpen(false) },
                { label: 'Field Worker', sub: 'Maya’s mobile app', icon: HardHat, run: () => switchTo('/worker/today', 'worker') },
                { label: 'Customer', sub: 'Priya’s portal', icon: User, run: () => switchTo('/portal', 'customer') },
                { label: 'Public Website', sub: 'Homeowner view', icon: Globe, run: () => switchTo('/', 'public') },
              ].map((p) => (
                <button key={p.label} role="menuitem" type="button" onClick={p.run} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-subtle">
                  <p.icon className="size-4 text-muted" aria-hidden />
                  <span>
                    <span className="block text-sm font-semibold text-ink">{p.label}</span>
                    <span className="block text-xs text-muted">{p.sub}</span>
                  </span>
                </button>
              ))}
              <div className="mt-1 border-t border-line pt-1 sm:hidden">
                <DemoButton className="m-2" />
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
