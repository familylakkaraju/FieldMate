import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { CalendarCheck, ChevronDown, Clock, FileText, Mail, MapPin, Menu, Phone, PhoneCall, ShieldCheck, Star, UserRound, Users, X } from 'lucide-react';
import { useConfig, useDemo } from '../app/DemoProvider';
import { enabledServices } from '../app/selectors';
import { Logo, FieldMateMark } from '../components/common/Logo';
import { Button, LinkButton } from '../components/common/Button';
import { ServiceIcon } from '../components/common/ServiceIcon';
import { Modal, Drawer } from '../components/common/Modal';
import { TextInput } from '../components/common/Form';
import { DemoButton } from '../components/demo/DemoControls';
import { useToast } from '../components/common/Toast';
import { serviceTone } from '../theme/branding';
import { cx } from '../utils/cx';

const CallCtx = createContext<() => void>(() => undefined);
export const useCallModal = () => useContext(CallCtx);

export function PublicLayout() {
  const [callOpen, setCallOpen] = useState(false);
  const { pathname } = useLocation();
  const { actions } = useDemo();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  useEffect(() => {
    actions.setPersona({ persona: 'public' });
  }, [actions]);
  return (
    <CallCtx.Provider value={() => setCallOpen(true)}>
      <div className="flex min-h-dvh flex-col bg-surface">
        <button type="button" onClick={() => document.getElementById('main')?.focus()} className="sr-only z-[90] rounded-lg bg-surface px-4 py-2 font-semibold focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
          Skip to content
        </button>
        <UtilityBar />
        <PublicHeader />
        <main id="main" tabIndex={-1} className="flex-1 outline-none">
          <Outlet />
        </main>
        <PublicFooter />
        {!['/quote', '/booking', '/confirmation'].includes(pathname) && <MobileCtaBar />}
        <CallModal open={callOpen} onClose={() => setCallOpen(false)} />
      </div>
    </CallCtx.Provider>
  );
}

function UtilityBar() {
  const { company } = useConfig();
  const call = useCallModal();
  return (
    <div className="bg-primary-solid text-primary-on">
      <div className="mx-auto flex h-10 max-w-7xl items-center justify-between gap-4 px-4 text-[13px] sm:px-6">
        <ul className="flex items-center gap-5 text-white/85">
          <li className="hidden items-center gap-1.5 sm:flex">
            <ShieldCheck className="size-4 text-accent-tint" aria-hidden /> Fully insured
          </li>
          <li className="hidden items-center gap-1.5 md:flex">
            <Users className="size-4 text-accent-tint" aria-hidden /> Local {company.region} team
          </li>
          <li className="flex items-center gap-1.5">
            <Star className="size-4 fill-warning text-warning" aria-hidden /> 4.9 rating<span className="hidden sm:inline"> · demo reviews</span>
          </li>
        </ul>
        <div className="flex items-center gap-3">
          <button type="button" onClick={call} className="hidden items-center gap-1.5 font-semibold text-white hover:underline sm:inline-flex">
            <Phone className="size-4" aria-hidden /> {company.phone}
          </button>
          <Link to="/portal" className="hidden items-center gap-1.5 text-white/85 hover:text-white lg:inline-flex">
            <UserRound className="size-4" aria-hidden /> Customer portal
          </Link>
          <DemoButton light className="h-7" />
        </div>
      </div>
    </div>
  );
}

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/how-it-works', label: 'How It Works' },
  { to: '/our-work', label: 'Our Work' },
  { to: '/reviews', label: 'Reviews' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

function PublicHeader() {
  const cfg = useConfig();
  const services = enabledServices(cfg);
  const call = useCallModal();
  const [menu, setMenu] = useState(false);
  const [svcOpen, setSvcOpen] = useState(false);
  const svcRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  useEffect(() => {
    setMenu(false);
    setSvcOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (!svcOpen) return;
    const close = (e: MouseEvent) => !svcRef.current?.contains(e.target as Node) && setSvcOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setSvcOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [svcOpen]);

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    cx('rounded-lg px-3 py-2 text-[15px] font-semibold transition', isActive ? 'text-primary-ink' : 'text-ink-2 hover:bg-subtle hover:text-ink');

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" aria-label={`${cfg.company.companyName} — home`} className="min-w-0">
          <Logo size={42} />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-0.5 lg:flex">
          <NavLink to="/" end className={linkCls}>
            Home
          </NavLink>
          <div ref={svcRef} className="relative">
            <button type="button" aria-expanded={svcOpen} aria-haspopup="true" onClick={() => setSvcOpen((v) => !v)} className={cx(linkCls({ isActive: pathname.startsWith('/services') }), 'inline-flex items-center gap-1')}>
              Services <ChevronDown className={cx('size-4 transition', svcOpen && 'rotate-180')} aria-hidden />
            </button>
            {svcOpen && (
              <div className="absolute left-1/2 top-full z-50 mt-2 w-[380px] -translate-x-1/2 animate-rise rounded-card border border-line bg-surface p-2 shadow-float">
                {services.map((s) => {
                  const tone = serviceTone(s.color);
                  return (
                    <Link key={s.id} to={`/services/${s.slug}`} className="flex items-start gap-3 rounded-xl p-3 hover:bg-subtle">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl" style={{ background: tone.soft, color: tone.ink }}>
                        <ServiceIcon name={s.icon} className="size-5" />
                      </span>
                      <span>
                        <span className="block font-semibold text-ink">{s.name}</span>
                        <span className="block text-[13px] text-muted">{s.description}</span>
                      </span>
                    </Link>
                  );
                })}
                <Link to="/services" className="mt-1 block rounded-xl bg-subtle px-3 py-2.5 text-center text-sm font-semibold text-secondary-ink hover:bg-secondary-soft">
                  All services & pricing
                </Link>
              </div>
            )}
          </div>
          {NAV.slice(1).map((n) => (
            <NavLink key={n.to} to={n.to} className={linkCls}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="max-md:hidden" icon={<Phone className="size-4" />} onClick={call}>
            Call
          </Button>
          <button type="button" onClick={call} aria-label={`Call ${cfg.company.companyName}`} className="grid size-10 place-items-center rounded-control border border-line-2 text-primary-ink md:hidden">
            <Phone className="size-4.5" />
          </button>
          <LinkButton to="/quote" variant="primary" className="max-sm:h-10 max-sm:px-3.5">
            <span className="sm:hidden">Quote</span>
            <span className="max-sm:hidden">Get a Quote</span>
          </LinkButton>
          <button type="button" onClick={() => setMenu(true)} aria-label="Open menu" className="grid size-10 place-items-center rounded-control text-ink lg:hidden">
            <Menu className="size-6" />
          </button>
        </div>
      </div>
      <Drawer open={menu} onClose={() => setMenu(false)} side="right" width="max-w-sm" label="Menu">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <Logo size={36} />
          <button type="button" onClick={() => setMenu(false)} aria-label="Close menu" className="rounded-lg p-1.5 text-muted hover:bg-subtle">
            <X className="size-5" />
          </button>
        </div>
        <div className="space-y-6 px-5 py-5">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Start a request</p>
            <div className="grid gap-2">
              {services.map((s) => {
                const tone = serviceTone(s.color);
                return (
                  <Link key={s.id} to={`/quote?service=${s.id}`} className="flex items-center gap-3 rounded-xl border border-line p-3">
                    <span className="grid size-9 place-items-center rounded-lg" style={{ background: tone.soft, color: tone.ink }}>
                      <ServiceIcon name={s.icon} className="size-5" />
                    </span>
                    <span className="font-semibold text-ink">{s.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
          <nav aria-label="Mobile" className="grid">
            {[...NAV, { to: '/services', label: 'All services' }, { to: '/portal', label: 'Customer portal' }].map((n) => (
              <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => cx('rounded-lg px-3 py-3 text-base font-semibold', isActive ? 'bg-secondary-soft text-secondary-ink' : 'text-ink hover:bg-subtle')}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" icon={<Phone className="size-4" />} onClick={call}>
              Call
            </Button>
            <LinkButton to="/booking" variant="dark" icon={<CalendarCheck className="size-4" />}>
              Book
            </LinkButton>
          </div>
          <DemoButton />
        </div>
      </Drawer>
    </header>
  );
}

function PublicFooter() {
  const cfg = useConfig();
  const { company, branding } = cfg;
  const services = enabledServices(cfg);
  const call = useCallModal();
  const col = (title: string, children: ReactNode) => (
    <div>
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">{title}</h2>
      <ul className="space-y-2.5 text-[15px] text-white/70">{children}</ul>
    </div>
  );
  const li = (to: string, label: string) => (
    <li>
      <Link to={to} className="hover:text-white">
        {label}
      </Link>
    </li>
  );
  return (
    <footer className="bg-primary-deep pb-24 text-white md:pb-0">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.4fr_repeat(5,1fr)]">
          <div className="max-w-xs">
            <Logo light size={42} />
            <p className="mt-4 text-[15px] text-white/70">{company.tagline}</p>
            <p className="mt-4 text-sm text-white/60">Serving {company.serviceAreas.slice(0, 5).join(', ')} and surrounding areas.</p>
          </div>
          {col('Services', <>{services.map((s) => li(`/services/${s.slug}`, s.name))}{li('/services', 'Pricing')}</>)}
          {col('Company', <>{li('/about', 'About us')}{li('/our-work', 'Our work')}{li('/reviews', 'Reviews')}{li('/how-it-works', 'How it works')}</>)}
          {col('Help', <>{li('/quote', 'Get a quote')}{li('/booking', 'Book a service')}{li('/contact', 'Contact & FAQs')}{li('/contact', 'Emergency plumbing')}</>)}
          {col('Customer Portal', <>{li('/portal', 'Sign in')}{li('/portal/jobs', 'Track your job')}{li('/portal/invoices', 'Pay an invoice')}{li('/portal', 'Manage your round')}</>)}
          {col(
            'Contact',
            <>
              <li>
                <button type="button" onClick={call} className="inline-flex items-center gap-2 hover:text-white">
                  <Phone className="size-4" aria-hidden /> {company.phone}
                </button>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="size-4 shrink-0" aria-hidden /> <span className="break-all">{company.email}</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden /> {company.address}
              </li>
            </>,
          )}
        </div>
        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-[13px] text-white/55 md:flex-row md:items-center md:justify-between">
          <p>
            © 2026 {company.companyName}. Fictional demonstration business — all customers, prices and reviews are illustrative.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link to="/app" className="hover:text-white">
              Staff login
            </Link>
            {branding.showPoweredByFieldMate && (
              <span className="inline-flex items-center gap-1.5">
                Powered by <FieldMateMark light />
              </span>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}

function MobileCtaBar() {
  const call = useCallModal();
  return (
    <nav aria-label="Quick actions" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-3 pb-[max(env(safe-area-inset-bottom),10px)] pt-2.5 shadow-[0_-8px_24px_-12px_rgb(16_24_40/0.25)] backdrop-blur md:hidden">
      <div className="grid grid-cols-3 gap-2">
        <Button variant="outline" size="lg" className="h-12 px-2" icon={<Phone className="size-4.5" />} onClick={call}>
          Call
        </Button>
        <LinkButton to="/quote" variant="primary" size="lg" className="h-12 px-2" icon={<FileText className="size-4.5" />}>
          Quote
        </LinkButton>
        <LinkButton to="/booking" variant="dark" size="lg" className="h-12 px-2" icon={<CalendarCheck className="size-4.5" />}>
          Book
        </LinkButton>
      </div>
    </nav>
  );
}

function CallModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { company } = useConfig();
  const { actions } = useDemo();
  const toast = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const submit = () => {
    actions.createLead({
      customerName: name.trim() || 'Callback request',
      phone,
      service: 'plumbing',
      summary: 'Callback requested from the website',
      details: [{ label: 'Request', value: 'Please call me back' }],
      source: 'phone',
      urgency: 'normal',
      preferredContact: 'phone',
    });
    onClose();
    setName('');
    setPhone('');
    toast({ title: 'Callback requested', description: 'The office will call you back shortly. (Demo: a lead was created.)', action: { label: 'See it in the office portal', to: '/app/leads' } });
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Call ${company.companyName}`}
      description="Demo number — no real call is placed."
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={() => { onClose(); navigate('/quote'); }}>
            Get a quote instead
          </Button>
          <Button onClick={submit} icon={<PhoneCall className="size-4" />}>
            Request a callback
          </Button>
        </>
      }
    >
      <div className="rounded-xl bg-secondary-soft p-4 text-center">
        <p className="font-display text-3xl font-extrabold tracking-tight text-primary-ink">{company.phone}</p>
        <p className="mt-1 flex items-center justify-center gap-1.5 text-[13px] text-muted">
          <Clock className="size-3.5" aria-hidden /> {company.openingHours}
        </p>
      </div>
      <p className="mt-4 text-sm font-semibold text-ink">Prefer a callback?</p>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <TextInput label="Your name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Alex Morgan" />
        <TextInput label="Mobile" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07700 900000" inputMode="tel" />
      </div>
    </Modal>
  );
}
