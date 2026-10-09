import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, CalendarCheck, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock, Info, Leaf, Lock, MapPin, Sun, Sunset } from 'lucide-react';
import type { ServiceType } from '../../types/domain';
import { useDemo } from '../../app/DemoProvider';
import { enabledServices } from '../../app/selectors';
import { bookingDays, crewFor, slotsFor, type Slot } from '../../utils/slots';
import { estimate } from '../../utils/estimate';
import { Button } from '../../components/common/Button';
import { Segmented, TextInput } from '../../components/common/Form';
import { DemoBadge } from '../../components/common/Badge';
import { ServiceIcon } from '../../components/common/ServiceIcon';
import { serviceTone } from '../../theme/branding';
import { cx } from '../../utils/cx';
import { longDate, money, relativeDay, shortDate } from '../../utils/format';
import { parseLocal } from '../../data/demoClock';

export default function Booking() {
  const { state, actions } = useDemo();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const services = enabledServices(state.config);
  const lead = state.data.leads.find((l) => l.id === params.get('lead'));
  const [service, setService] = useState<ServiceType>(lead?.service ?? (params.get('service') as ServiceType) ?? services[0]?.id ?? 'gutter');
  const [week, setWeek] = useState(0);
  const [period, setPeriod] = useState<'all' | 'morning' | 'afternoon'>('all');
  const [selected, setSelected] = useState<Slot | null>(null);
  const [contact, setContact] = useState({ name: '', phone: '' });
  const [touched, setTouched] = useState(false);

  const svc = services.find((s) => s.id === service) ?? services[0];
  const days = useMemo(() => bookingDays(week), [week]);
  const tone = serviceTone(svc.color);
  const needsContact = !lead;
  const contactOk = contact.name.trim().length > 1 && contact.phone.replace(/\D/g, '').length >= 10;

  const confirm = () => {
    if (!selected) return;
    setTouched(true);
    if (needsContact && !contactOk) return;
    let leadId = lead?.id;
    if (!leadId) {
      const est = estimate(service, {});
      leadId = actions.createLead({
        customerName: contact.name.trim(),
        phone: contact.phone.trim(),
        service,
        summary: `${svc.name} booking made online`,
        details: [{ label: 'Booked via', value: 'Online booking calendar' }],
        source: 'website',
        urgency: 'normal',
        estimateRange: est.range,
        estimatedValue: est.value,
        estimateLines: est.lines,
        preferredContact: 'sms',
      });
    }
    const label = `${shortDate(selected.date)} · ${selected.start}–${selected.end}`;
    actions.bookLeadSlot(leadId, { date: selected.date, start: selected.start, end: selected.end, label, workerIds: crewFor(service) });
    actions.setSession({ lastLeadId: leadId, bookingConfirmed: true });
    navigate(`/confirmation?lead=${leadId}`);
  };

  return (
    <div className="bg-canvas">
      <div className="mx-auto max-w-6xl px-4 pb-28 pt-8 sm:px-6 md:pb-16 md:pt-12">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-accent-ink">Book a service</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-primary-ink sm:text-4xl">Choose a time that suits you</h1>
          </div>
          <DemoBadge>Demo calendar — no real booking</DemoBadge>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="card p-4 sm:p-6">
            {!lead && (
              <div role="radiogroup" aria-label="Service" className="mb-5 flex flex-wrap gap-2">
                {services.map((s) => {
                  const t = serviceTone(s.color);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      role="radio"
                      aria-checked={service === s.id}
                      onClick={() => {
                        setService(s.id);
                        setSelected(null);
                      }}
                      className={cx('inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition', service === s.id ? 'border-transparent text-white' : 'border-line-2 text-ink-2 hover:bg-subtle')}
                      style={service === s.id ? { background: t.solid, color: t.on } : undefined}
                    >
                      <ServiceIcon name={s.icon} className="size-4" /> {s.name}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button type="button" aria-label="Previous week" disabled={week === 0} onClick={() => setWeek((w) => w - 1)} className="grid size-9 place-items-center rounded-lg border border-line-2 text-ink disabled:opacity-40">
                  <ChevronLeft className="size-4" />
                </button>
                <p className="min-w-40 text-center text-sm font-bold text-ink">
                  <CalendarDays className="mr-1.5 inline size-4 text-muted" aria-hidden />
                  {week === 0 ? 'This week' : week === 1 ? 'Next week' : `In ${week} weeks`} · {shortDate(days[0])} – {shortDate(days[days.length - 1])}
                </p>
                <button type="button" aria-label="Next week" disabled={week >= 3} onClick={() => setWeek((w) => w + 1)} className="grid size-9 place-items-center rounded-lg border border-line-2 text-ink disabled:opacity-40">
                  <ChevronRight className="size-4" />
                </button>
              </div>
              <Segmented
                label="Time of day"
                value={period}
                onChange={setPeriod}
                size="sm"
                options={[
                  { value: 'all', label: 'All day' },
                  { value: 'morning', label: <><Sun className="size-3.5" aria-hidden /> Morning</> },
                  { value: 'afternoon', label: <><Sunset className="size-3.5" aria-hidden /> Afternoon</> },
                ]}
              />
            </div>

            {service === 'gutter' && week === 0 && (
              <p className="mt-4 flex items-start gap-2 rounded-xl bg-warning-soft px-3.5 py-2.5 text-sm text-warning-ink">
                <Leaf className="mt-0.5 size-4 shrink-0" aria-hidden /> Autumn is our busiest gutter season — this week is full. Next available: Friday 10:00.
              </p>
            )}

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {days.map((d) => {
                const slots = slotsFor(service, d).filter((s) => period === 'all' || s.period === period);
                const any = slots.some((s) => s.available);
                return (
                  <div key={d} className={cx('rounded-xl border p-2.5', any ? 'border-line' : 'border-dashed border-line bg-canvas')}>
                    <p className="text-center text-xs font-bold uppercase tracking-wide text-muted">{parseLocal(d).toLocaleDateString('en-GB', { weekday: 'short' })}</p>
                    <p className="text-center font-display text-xl font-extrabold text-ink">{parseLocal(d).getDate()}</p>
                    <p className="mb-2 text-center text-[11px] text-muted">{relativeDay(d) === 'Today' ? 'Today' : parseLocal(d).toLocaleDateString('en-GB', { month: 'short' })}</p>
                    <div className="space-y-1.5">
                      {slots.map((s) => {
                        const on = selected?.date === s.date && selected.start === s.start;
                        return (
                          <button
                            key={s.start}
                            type="button"
                            disabled={!s.available}
                            aria-pressed={on}
                            aria-label={`${longDate(s.date)} ${s.start}${s.available ? '' : ' — booked'}`}
                            onClick={() => setSelected(s)}
                            className={cx(
                              'tabular h-9 w-full rounded-lg text-[13px] font-semibold transition',
                              on ? 'text-white shadow-sm' : s.available ? 'bg-secondary-soft text-secondary-ink hover:bg-secondary-tint' : 'cursor-not-allowed bg-transparent text-[#98A2B3] line-through',
                            )}
                            style={on ? { background: tone.solid, color: tone.on } : undefined}
                          >
                            {s.start}
                          </button>
                        );
                      })}
                      {!slots.length && <p className="py-2 text-center text-xs text-muted">—</p>}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 flex items-center gap-2 text-xs text-muted">
              <Info className="size-3.5" aria-hidden /> Times are arrival windows. Struck-through times are already booked.
            </p>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="card p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">Booking summary</p>
              <div className="mt-3 flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-xl" style={{ background: tone.soft, color: tone.ink }}>
                  <ServiceIcon name={svc.icon} className="size-5.5" />
                </span>
                <div>
                  <p className="font-bold text-ink">{svc.name}</p>
                  <p className="text-sm text-muted">{lead ? lead.customerName : 'New booking'}</p>
                </div>
              </div>
              {lead && (
                <div className="mt-4 rounded-xl bg-canvas p-3 text-sm">
                  <p className="text-ink-2">{lead.summary}</p>
                  {lead.estimateRange && (
                    <p className="mt-1.5 font-semibold text-ink">
                      Estimate {money(lead.estimateRange[0])}–{money(lead.estimateRange[1])}
                    </p>
                  )}
                  {lead.postcode && (
                    <p className="mt-1 flex items-center gap-1.5 text-muted">
                      <MapPin className="size-3.5" aria-hidden /> {lead.postcode}
                    </p>
                  )}
                </div>
              )}
              <div className={cx('mt-4 rounded-xl border-2 p-3.5', selected ? 'border-secondary-solid bg-secondary-soft' : 'border-dashed border-line-2')}>
                {selected ? (
                  <>
                    <p className="flex items-center gap-2 font-bold text-ink">
                      <CheckCircle2 className="size-4.5 text-secondary-ink" aria-hidden /> {longDate(selected.date)}
                    </p>
                    <p className="mt-0.5 flex items-center gap-2 text-sm text-ink-2">
                      <Clock className="size-4" aria-hidden /> Arrival {selected.start}–{selected.end}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted">Pick an available time from the calendar.</p>
                )}
              </div>
              {needsContact && (
                <div className="mt-4 grid gap-3">
                  <TextInput label="Your name" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} placeholder="e.g. Alex Morgan" />
                  <TextInput label="Mobile" inputMode="tel" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} placeholder="07700 900000" />
                  {touched && !contactOk && <p className="text-sm text-danger-ink">Please add your name and mobile number.</p>}
                  <Button variant="ghost" size="sm" onClick={() => setContact({ name: 'Alex Morgan', phone: '07700 900555' })}>
                    Fill demo details
                  </Button>
                </div>
              )}
              <Button size="lg" full className="mt-4" disabled={!selected} icon={<CalendarCheck className="size-4.5" />} onClick={confirm}>
                Confirm booking
              </Button>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
                <Lock className="size-3.5" aria-hidden /> No payment taken. Free to change or cancel.
              </p>
              {!lead && (
                <Link to={`/quote?service=${service}`} className="mt-4 flex items-center gap-1 text-sm font-semibold text-secondary-ink hover:underline">
                  Want a price first? Get an instant quote <ArrowRight className="size-4" aria-hidden />
                </Link>
              )}
            </div>
          </aside>
        </div>
      </div>
      {selected && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface p-3 shadow-float lg:hidden">
          <Button size="lg" full disabled={!selected} icon={<CalendarCheck className="size-4.5" />} onClick={confirm}>
            Confirm {shortDate(selected.date)} at {selected.start}
          </Button>
        </div>
      )}
    </div>
  );
}
