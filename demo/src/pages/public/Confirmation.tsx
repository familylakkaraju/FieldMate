import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, BellRing, CalendarCheck, CheckCircle2, ClipboardList, Home as HomeIcon, LayoutDashboard, MessageSquare, Smartphone, UserRound } from 'lucide-react';
import { useDemo } from '../../app/DemoProvider';
import { Button, LinkButton } from '../../components/common/Button';
import { DemoBadge } from '../../components/common/Badge';
import { ServiceIcon } from '../../components/common/ServiceIcon';
import { longDate } from '../../utils/format';

export default function Confirmation() {
  const { state, actions } = useDemo();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const lead = state.data.leads.find((l) => l.id === (params.get('lead') ?? state.data.session.lastLeadId));
  const svc = state.config.services.find((s) => s.id === lead?.service);
  const { company } = state.config;

  if (!lead || !svc) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-2xl font-bold text-ink">No booking to show</h1>
        <p className="mt-2 text-muted">Start a quote to make a booking.</p>
        <LinkButton to="/quote" className="mt-6">
          Get a quote
        </LinkButton>
      </div>
    );
  }

  const booked = !!lead.preferredSlot;
  const steps = [
    { icon: MessageSquare, title: 'Confirmation by text', text: `We’ve sent a confirmation to ${lead.phone ?? lead.email ?? 'you'} (demo — nothing is actually sent).` },
    { icon: UserRound, title: 'Your technician is assigned', text: `${company.companyName} confirms your quote and assigns your technician.` },
    { icon: BellRing, title: '“On my way” alert', text: 'You’ll get a text when your technician is on the way.' },
    { icon: Smartphone, title: 'Track it online', text: 'Photos, quote, invoice and payment in your customer portal.' },
  ];

  const openPortal = () => {
    if (lead.email) actions.setPersona({ persona: 'customer', portalCustomerKey: lead.email });
    else actions.setPersona({ persona: 'customer' });
    navigate('/portal');
  };

  return (
    <div className="bg-canvas">
      <div className="mx-auto max-w-3xl px-4 pb-28 pt-10 sm:px-6 md:pb-20 md:pt-16">
        <div className="card overflow-hidden">
          <div className="bg-primary-solid px-6 py-10 text-center text-primary-on sm:px-10">
            <span className="mx-auto grid size-20 animate-pop place-items-center rounded-full bg-white/12 ring-8 ring-white/5">
              <CheckCircle2 className="size-11 text-accent-tint" aria-hidden />
            </span>
            <h1 className="mt-5 font-display text-3xl font-extrabold text-white sm:text-4xl">{booked ? 'You’re booked in!' : 'Request received'}</h1>
            <p className="mt-2 text-white/80">Thanks {lead.customerName.split(' ')[0]} — we’ve got everything we need.</p>
            <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm">
              Reference <span className="font-bold tracking-wide text-white">{lead.ref}</span>
            </p>
          </div>
          <dl className="grid gap-px bg-line sm:grid-cols-3">
            <div className="bg-surface p-5">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Customer</dt>
              <dd className="mt-1 font-semibold text-ink">{lead.customerName}</dd>
              <dd className="text-sm text-muted">{lead.postcode}</dd>
            </div>
            <div className="bg-surface p-5">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Service</dt>
              <dd className="mt-1 flex items-center gap-2 font-semibold text-ink">
                <ServiceIcon name={svc.icon} className="size-4.5 text-accent-ink" /> {svc.name}
              </dd>
              <dd className="line-clamp-2 text-sm text-muted">{lead.summary}</dd>
            </div>
            <div className="bg-surface p-5">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Appointment</dt>
              {lead.preferredSlot ? (
                <>
                  <dd className="mt-1 font-semibold text-ink">{longDate(lead.preferredSlot.date)}</dd>
                  <dd className="text-sm text-muted">
                    Arrival {lead.preferredSlot.start}–{lead.preferredSlot.end}
                  </dd>
                </>
              ) : (
                <dd className="mt-1 text-sm text-ink-2">We’ll call you to arrange a time.</dd>
              )}
            </div>
          </dl>
          <div className="p-6 sm:p-8">
            <h2 className="text-lg font-bold text-ink">What happens next</h2>
            <ol className="mt-4 grid gap-4 sm:grid-cols-2">
              {steps.map((s, i) => (
                <li key={s.title} className="flex gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-ink">
                    <s.icon className="size-5" aria-hidden />
                  </span>
                  <div>
                    <p className="font-semibold text-ink">
                      {i + 1}. {s.title}
                    </p>
                    <p className="text-sm text-muted">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" icon={<Smartphone className="size-4.5" />} onClick={openPortal}>
                Open customer portal
              </Button>
              {!booked && (
                <LinkButton to={`/booking?lead=${lead.id}`} size="lg" variant="outline" icon={<CalendarCheck className="size-4.5" />}>
                  Choose a time
                </LinkButton>
              )}
              <LinkButton to="/" size="lg" variant="ghost" icon={<HomeIcon className="size-4.5" />}>
                Back to home
              </LinkButton>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4 rounded-card border border-dashed border-warning bg-warning-soft/60 p-5 sm:flex-row sm:items-center">
          <ClipboardList className="size-8 shrink-0 text-warning-ink" aria-hidden />
          <div className="flex-1">
            <DemoBadge>Presenter</DemoBadge>
            <p className="mt-1.5 text-sm text-ink-2">
              This request is now lead <span className="font-bold">{lead.ref}</span> in the office portal{booked ? ', with the chosen slot attached' : ''}. Switch to the owner view to convert it into a customer and job.
            </p>
          </div>
          <Button
            variant="dark"
            icon={<LayoutDashboard className="size-4" />}
            iconRight={<ArrowRight className="size-4" />}
            onClick={() => {
              actions.setPersona({ persona: 'owner' });
              navigate(`/app/leads/${lead.id}`);
            }}
          >
            Open in office portal
          </Button>
        </div>
        <p className="mt-6 text-center text-sm text-muted">
          Questions? <Link to="/contact" className="font-semibold text-secondary-ink hover:underline">Contact {company.companyName}</Link>
        </p>
      </div>
    </div>
  );
}
