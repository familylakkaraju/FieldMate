import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  ImagePlus,
  Lock,
  Mail,
  MessageSquare,
  Phone,
  ShieldCheck,
  Sparkles,
  Wand2,
} from 'lucide-react';
import type { ServiceType } from '../../types/domain';
import { useDemo } from '../../app/DemoProvider';
import { enabledServices } from '../../app/selectors';
import { estimate, PLUMBING_ISSUES, PROPERTY_TYPES, type Answers } from '../../utils/estimate';
import { postcodeArea } from '../../components/public/PublicBits';
import { Button } from '../../components/common/Button';
import { DemoBadge } from '../../components/common/Badge';
import { ServiceIcon } from '../../components/common/ServiceIcon';
import { TextInput, TextArea } from '../../components/common/Form';
import { serviceTone } from '../../theme/branding';
import { asset, cx } from '../../utils/cx';
import { money } from '../../utils/format';

const STEPS = ['Service', 'Details', 'Your info', 'Estimate'];

const DEFAULTS: Record<ServiceType, Answers> = {
  gutter: { property: 'semi', storeys: '2', sides: 'both', downpipe: 'maybe', extension: true },
  plumbing: { issue: 'Leak', urgent: 'no', property: 'semi', notes: '' },
  window: { property: 'semi', mode: 'recurring', windows: '12', frequency: '4', conservatory: false },
};

export default function Quote() {
  const { state, actions } = useDemo();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const services = enabledServices(state.config);
  const pre = params.get('service') as ServiceType | null;
  const preValid = pre && services.some((s) => s.id === pre) ? pre : undefined;

  const [service, setService] = useState<ServiceType | undefined>(preValid);
  const [step, setStep] = useState(preValid ? 1 : 0);
  const [answers, setAnswers] = useState<Answers>(() => ({ ...(preValid ? DEFAULTS[preValid] : {}), ...(params.get('frequency') ? { frequency: params.get('frequency')! } : {}) }));
  const [info, setInfo] = useState({ name: '', email: '', phone: '', postcode: '', address: '', contact: 'sms' as 'phone' | 'email' | 'sms' });
  const [touched, setTouched] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [photo, setPhoto] = useState(false);

  useEffect(() => {
    if (preValid && preValid !== service) {
      setService(preValid);
      setAnswers(DEFAULTS[preValid]);
      setStep(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preValid]);

  const svc = services.find((s) => s.id === service);
  const est = useMemo(() => (service ? estimate(service, answers) : undefined), [service, answers]);
  const set = (k: string, v: string | boolean) => setAnswers((a) => ({ ...a, [k]: v }));

  const infoValid = info.name.trim().length > 1 && (info.email.includes('@') || info.phone.replace(/\D/g, '').length >= 10) && info.postcode.trim().length >= 3;
  const area = postcodeArea(info.postcode);

  const pickService = (id: ServiceType) => {
    setService(id);
    setAnswers(DEFAULTS[id]);
    setStep(1);
  };

  const fillDemo = () =>
    setInfo({ name: 'Alex Morgan', email: 'alex.morgan@example.com', phone: '07700 900555', postcode: 'CM2 7QR', address: '24 Orchard Way, Great Baddow, Chelmsford', contact: 'sms' });

  const submit = () => {
    if (!service || !est) return;
    const [line1, ...rest] = info.address.split(',');
    const id = actions.createLead({
      customerName: info.name.trim(),
      email: info.email.trim() || undefined,
      phone: info.phone.trim() || undefined,
      address: line1?.trim() || undefined,
      town: rest.join(',').trim() || area.area || undefined,
      postcode: info.postcode.toUpperCase().trim(),
      service,
      summary: est.summary,
      details: [...est.details, ...(photo ? [{ label: 'Photo', value: '1 photo attached' }] : [])],
      source: 'website',
      urgency: est.urgent ? 'urgent' : 'normal',
      estimateRange: est.range,
      estimatedValue: est.value,
      estimateLines: est.lines,
      propertyType: est.propertyLabel,
      preferredContact: info.contact,
      photo: photo ? (service === 'gutter' ? 'assets/gallery/gutter-spout-before.webp' : service === 'plumbing' ? 'assets/gallery/plumbing-undersink.webp' : 'assets/gallery/window-sash-before.webp') : undefined,
    });
    actions.setSession({ lastLeadId: id, bookingConfirmed: false });
    setSubmittedId(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submittedLead = state.data.leads.find((l) => l.id === submittedId);

  return (
    <div className="bg-canvas">
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6 md:pb-16 md:pt-12">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-accent-ink">Instant quote</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-primary-ink sm:text-4xl">{submittedLead ? 'Your request is in' : svc ? `Get your ${svc.name.toLowerCase()} estimate` : 'What can we help with?'}</h1>
          </div>
          <p className="flex items-center gap-2 text-sm text-muted">
            <Clock className="size-4" aria-hidden /> Takes about 60 seconds · no obligation
          </p>
        </div>

        {!submittedLead && <Stepper step={step} onJump={(i) => i < step && (i > 0 ? service && setStep(i) : setStep(0))} />}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="card p-5 sm:p-8">
            {submittedLead ? (
              <Submitted leadRef={submittedLead.ref} name={submittedLead.customerName} onBook={() => navigate(`/booking?lead=${submittedLead.id}`)} onSkip={() => navigate(`/confirmation?lead=${submittedLead.id}`)} />
            ) : step === 0 ? (
              <StepService services={services} selected={service} onPick={pickService} />
            ) : step === 1 && service ? (
              <>
                {service === 'gutter' && <GutterQuestions a={answers} set={set} />}
                {service === 'plumbing' && <PlumbingQuestions a={answers} set={set} />}
                {service === 'window' && <WindowQuestions a={answers} set={set} />}
                <PhotoPicker attached={photo} onToggle={() => setPhoto((p) => !p)} service={service} />
                <Nav back={() => setStep(0)} next={() => setStep(2)} nextLabel="Continue to your details" />
              </>
            ) : step === 2 ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-bold text-ink">Where should we send your quote?</h2>
                  <Button variant="soft" size="sm" icon={<Wand2 className="size-4" />} onClick={fillDemo}>
                    Fill demo details
                  </Button>
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <TextInput label="Full name" required autoComplete="name" value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} placeholder="e.g. Alex Morgan" />
                  <TextInput label="Mobile" required autoComplete="tel" inputMode="tel" value={info.phone} onChange={(e) => setInfo({ ...info, phone: e.target.value })} placeholder="07700 900000" />
                  <TextInput label="Email" type="email" autoComplete="email" value={info.email} onChange={(e) => setInfo({ ...info, email: e.target.value })} placeholder="name@example.com" className="sm:col-span-2" />
                  <TextInput
                    label="Postcode"
                    required
                    autoComplete="postal-code"
                    value={info.postcode}
                    onChange={(e) => setInfo({ ...info, postcode: e.target.value })}
                    placeholder="CM2 …"
                    hint={info.postcode.length >= 3 ? (area.ok ? <span className="font-semibold text-success-ink">✓ We cover {area.area}</span> : <span className="text-warning-ink">Outside our usual area — we’ll check for you</span>) : undefined}
                  />
                  <TextInput label="Address" autoComplete="street-address" value={info.address} onChange={(e) => setInfo({ ...info, address: e.target.value })} placeholder="House number, street, town" />
                </div>
                <fieldset className="mt-5">
                  <legend className="mb-2 text-sm font-semibold text-ink-2">Preferred contact</legend>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        ['sms', 'Text', MessageSquare],
                        ['phone', 'Call', Phone],
                        ['email', 'Email', Mail],
                      ] as const
                    ).map(([id, label, Icon]) => (
                      <Choice key={id} selected={info.contact === id} onClick={() => setInfo({ ...info, contact: id })}>
                        <Icon className="size-4.5" aria-hidden /> {label}
                      </Choice>
                    ))}
                  </div>
                </fieldset>
                {touched && !infoValid && <p className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger-ink">Please add your name, a mobile number or email, and your postcode.</p>}
                <p className="mt-5 flex items-center gap-2 text-xs text-muted">
                  <Lock className="size-3.5" aria-hidden /> Demo only — details stay in this browser and are never sent anywhere.
                </p>
                <Nav
                  back={() => setStep(1)}
                  next={() => {
                    setTouched(true);
                    if (infoValid) setStep(3);
                  }}
                  nextLabel="See my estimate"
                />
              </>
            ) : step === 3 && est && svc ? (
              <EstimateStep est={est} serviceName={svc.name} onBack={() => setStep(2)} onSubmit={submit} name={info.name} />
            ) : null}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="card overflow-hidden">
              {svc ? (
                <>
                  <div className="relative h-32">
                    <img src={asset(svc.image)} alt="" className="size-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/0" aria-hidden />
                    <p className="absolute bottom-3 left-4 flex items-center gap-2 text-lg font-bold text-white">
                      <ServiceIcon name={svc.icon} className="size-5" /> {svc.name}
                    </p>
                  </div>
                  <div className="p-5">
                    <p className="text-[13px] font-semibold text-muted">Live estimate</p>
                    {est ? (
                      <p className="tabular font-display text-3xl font-extrabold text-primary-ink">
                        {money(est.range[0])}–{money(est.range[1])}
                        {service === 'window' && answers.mode !== 'oneoff' && <span className="text-base font-semibold text-muted"> / visit</span>}
                      </p>
                    ) : (
                      <p className="text-muted">Answer a few questions</p>
                    )}
                    <DemoBadge className="mt-2">Demo estimate only</DemoBadge>
                    {est && (
                      <ul className="mt-4 space-y-1.5 text-sm text-ink-2">
                        {est.includes.map((i) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden /> {i}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              ) : (
                <div className="p-5">
                  <p className="font-semibold text-ink">Choose a service to see a live estimate.</p>
                  <p className="mt-1 text-sm text-muted">Prices update as you answer.</p>
                </div>
              )}
            </div>
            <ul className="card space-y-3 p-5 text-sm text-ink-2">
              <li className="flex items-center gap-2.5">
                <ShieldCheck className="size-5 text-accent-ink" aria-hidden /> Fully insured local technicians
              </li>
              <li className="flex items-center gap-2.5">
                <ClipboardCheck className="size-5 text-accent-ink" aria-hidden /> Fixed written quote before we start
              </li>
              <li className="flex items-center gap-2.5">
                <Camera className="size-5 text-accent-ink" aria-hidden /> Before/after photos in your portal
              </li>
            </ul>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Stepper({ step, onJump }: { step: number; onJump: (i: number) => void }) {
  return (
    <ol className="grid grid-cols-4 gap-2" aria-label="Quote progress">
      {STEPS.map((label, i) => (
        <li key={label}>
          <button type="button" onClick={() => onJump(i)} disabled={i >= step} aria-current={i === step ? 'step' : undefined} className="group w-full text-left disabled:cursor-default">
            <span className={cx('block h-1.5 rounded-full transition', i <= step ? 'bg-secondary-solid' : 'bg-line')} />
            <span className={cx('mt-2 flex items-center gap-1.5 text-xs font-semibold sm:text-[13px]', i === step ? 'text-ink' : i < step ? 'text-secondary-ink group-hover:underline' : 'text-muted')}>
              {i < step ? <CheckCircle2 className="size-3.5" aria-hidden /> : <span className="hidden sm:inline">{i + 1}.</span>}
              {label}
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}

function Choice({ selected, onClick, children, className }: { selected: boolean; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cx(
        'flex min-h-12 items-center justify-center gap-2 rounded-control border px-3 py-2.5 text-sm font-semibold transition',
        selected ? 'border-secondary-solid bg-secondary-soft text-secondary-ink ring-2 ring-secondary/20' : 'border-line-2 bg-surface text-ink-2 hover:border-muted',
        className,
      )}
    >
      {children}
    </button>
  );
}

function Group({ label, children, cols = 'grid-cols-2 sm:grid-cols-3' }: { label: string; children: ReactNode; cols?: string }) {
  return (
    <fieldset className="mt-6 first:mt-0">
      <legend className="mb-2.5 text-[15px] font-bold text-ink">{label}</legend>
      <div role="radiogroup" aria-label={label} className={cx('grid gap-2', cols)}>
        {children}
      </div>
    </fieldset>
  );
}

function StepService({ services, selected, onPick }: { services: ReturnType<typeof enabledServices>; selected?: ServiceType; onPick: (id: ServiceType) => void }) {
  return (
    <>
      <h2 className="text-xl font-bold text-ink">Which service do you need?</h2>
      <div role="radiogroup" aria-label="Service" className="mt-5 grid gap-3 sm:grid-cols-3">
        {services.map((s) => {
          const tone = serviceTone(s.color);
          const on = selected === s.id;
          return (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onPick(s.id)}
              className={cx('group overflow-hidden rounded-card border text-left transition hover:shadow-raised', on ? 'border-secondary-solid ring-2 ring-secondary/25' : 'border-line')}
            >
              <img src={asset(s.image)} alt="" className="h-28 w-full object-cover" />
              <span className="block p-4">
                <span className="flex items-center gap-2 font-bold text-ink">
                  <span className="grid size-8 place-items-center rounded-lg" style={{ background: tone.soft, color: tone.ink }}>
                    <ServiceIcon name={s.icon} className="size-4.5" />
                  </span>
                  {s.name}
                </span>
                <span className="mt-1.5 block text-[13px] text-muted">{s.description}</span>
                <span className="mt-2 block text-[13px] font-semibold text-ink-2">from £{s.startingPrice}</span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-6 text-sm text-muted">
        Not sure which?{' '}
        <Link to="/contact" className="font-semibold text-secondary-ink hover:underline">
          Describe the problem
        </Link>{' '}
        and we’ll take it from there.
      </p>
    </>
  );
}

type QProps = { a: Answers; set: (k: string, v: string | boolean) => void };

function PropertyGroup({ a, set }: QProps) {
  return (
    <Group label="Property type">
      {PROPERTY_TYPES.map((p) => (
        <Choice key={p.id} selected={a.property === p.id} onClick={() => set('property', p.id)}>
          {p.label}
        </Choice>
      ))}
    </Group>
  );
}

function GutterQuestions({ a, set }: QProps) {
  return (
    <>
      <h2 className="mb-5 text-xl font-bold text-ink">Tell us about your gutters</h2>
      <PropertyGroup a={a} set={set} />
      <Group label="How many storeys?" cols="grid-cols-3">
        {['1', '2', '3'].map((n) => (
          <Choice key={n} selected={a.storeys === n} onClick={() => set('storeys', n)}>
            {n} {n === '1' ? 'storey' : 'storeys'}
          </Choice>
        ))}
      </Group>
      <Group label="Which gutters?" cols="grid-cols-3">
        {[
          ['front', 'Front'],
          ['rear', 'Rear'],
          ['both', 'Front & rear'],
        ].map(([id, label]) => (
          <Choice key={id} selected={a.sides === id} onClick={() => set('sides', id)}>
            {label}
          </Choice>
        ))}
      </Group>
      <Group label="Any downpipe issues?" cols="grid-cols-3">
        {[
          ['no', 'No'],
          ['maybe', 'Not sure'],
          ['yes', 'Yes — overflowing'],
        ].map(([id, label]) => (
          <Choice key={id} selected={a.downpipe === id} onClick={() => set('downpipe', id)}>
            {label}
          </Choice>
        ))}
      </Group>
      <Group label="Extras" cols="grid-cols-1 sm:grid-cols-2">
        <Choice selected={!!a.extension} onClick={() => set('extension', !a.extension)} className="justify-start">
          <CheckBoxMark on={!!a.extension} /> Rear extension / porch gutter
        </Choice>
      </Group>
    </>
  );
}

function PlumbingQuestions({ a, set }: QProps) {
  return (
    <>
      <h2 className="mb-5 text-xl font-bold text-ink">What do you need help with?</h2>
      <Group label="The problem" cols="grid-cols-2 sm:grid-cols-4">
        {PLUMBING_ISSUES.map((p) => (
          <Choice key={p} selected={a.issue === p} onClick={() => set('issue', p)}>
            {p}
          </Choice>
        ))}
      </Group>
      <Group label="Is it urgent?" cols="grid-cols-2">
        <Choice selected={a.urgent === 'yes'} onClick={() => set('urgent', 'yes')}>
          Yes — today if possible
        </Choice>
        <Choice selected={a.urgent !== 'yes'} onClick={() => set('urgent', 'no')}>
          No — this week is fine
        </Choice>
      </Group>
      <PropertyGroup a={a} set={set} />
      <div className="mt-6">
        <TextArea label="Anything else we should know? (optional)" value={String(a.notes ?? '')} onChange={(e) => set('notes', e.target.value)} rows={3} placeholder="e.g. dripping from under the kitchen sink, stopcock is stiff" />
      </div>
    </>
  );
}

function WindowQuestions({ a, set }: QProps) {
  const recurring = a.mode !== 'oneoff';
  return (
    <>
      <h2 className="mb-5 text-xl font-bold text-ink">Tell us about your windows</h2>
      <PropertyGroup a={a} set={set} />
      <Group label="One-off or regular?" cols="grid-cols-2">
        <Choice selected={recurring} onClick={() => set('mode', 'recurring')}>
          Regular clean
        </Choice>
        <Choice selected={!recurring} onClick={() => set('mode', 'oneoff')}>
          One-off clean
        </Choice>
      </Group>
      {recurring && (
        <Group label="How often?" cols="grid-cols-3">
          {['4', '6', '8'].map((n) => (
            <Choice key={n} selected={a.frequency === n} onClick={() => set('frequency', n)}>
              Every {n} weeks
            </Choice>
          ))}
        </Group>
      )}
      <fieldset className="mt-6">
        <legend className="mb-2.5 text-[15px] font-bold text-ink">Roughly how many windows?</legend>
        <div className="flex items-center gap-4">
          <input type="range" min={4} max={30} value={Number(a.windows ?? 12)} onChange={(e) => set('windows', e.target.value)} className="flex-1 accent-[var(--brand-secondary-solid)]" aria-label="Number of windows" />
          <span className="tabular w-24 rounded-control border border-line-2 px-3 py-2 text-center font-bold text-ink">{String(a.windows ?? 12)}</span>
        </div>
      </fieldset>
      <Group label="Extras" cols="grid-cols-1 sm:grid-cols-2">
        <Choice selected={!!a.conservatory} onClick={() => set('conservatory', !a.conservatory)} className="justify-start">
          <CheckBoxMark on={!!a.conservatory} /> Include conservatory
        </Choice>
      </Group>
    </>
  );
}

function CheckBoxMark({ on }: { on: boolean }) {
  return <span className={cx('grid size-5 place-items-center rounded-md border', on ? 'border-secondary-solid bg-secondary-solid text-secondary-on' : 'border-line-2')}>{on && <CheckCircle2 className="size-3.5" aria-hidden />}</span>;
}

function PhotoPicker({ attached, onToggle, service }: { attached: boolean; onToggle: () => void; service: ServiceType }) {
  const sample = service === 'gutter' ? 'assets/gallery/gutter-spout-before.webp' : service === 'plumbing' ? 'assets/gallery/plumbing-undersink.webp' : 'assets/gallery/window-sash-before.webp';
  return (
    <div className="mt-6">
      <p className="mb-2.5 text-[15px] font-bold text-ink">
        Add a photo <span className="font-normal text-muted">(optional)</span>
      </p>
      {attached ? (
        <div className="flex items-center gap-3 rounded-control border border-line p-2.5">
          <img src={asset(sample)} alt="Your attached photo (demo)" className="size-16 rounded-lg object-cover" />
          <div className="flex-1 text-sm">
            <p className="font-semibold text-ink">photo_0142.jpg</p>
            <p className="text-muted">Demo photo attached</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onToggle}>
            Remove
          </Button>
        </div>
      ) : (
        <button type="button" onClick={onToggle} className="flex w-full items-center justify-center gap-2 rounded-control border-2 border-dashed border-line-2 px-4 py-5 text-sm font-semibold text-muted transition hover:border-secondary hover:text-secondary-ink">
          <ImagePlus className="size-5" aria-hidden /> Attach a photo (simulated — no upload)
        </button>
      )}
    </div>
  );
}

function Nav({ back, next, nextLabel }: { back: () => void; next: () => void; nextLabel: string }) {
  return (
    <div className="mt-8 flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:justify-between">
      <Button variant="ghost" size="lg" icon={<ArrowLeft className="size-4" />} onClick={back}>
        Back
      </Button>
      <Button size="lg" iconRight={<ArrowRight className="size-4.5" />} onClick={next}>
        {nextLabel}
      </Button>
    </div>
  );
}

function EstimateStep({ est, serviceName, onBack, onSubmit, name }: { est: ReturnType<typeof estimate>; serviceName: string; onBack: () => void; onSubmit: () => void; name: string }) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold text-ink">{name ? `${name.split(' ')[0]}, here’s your estimate` : 'Your estimate'}</h2>
        <DemoBadge>Demo estimate only</DemoBadge>
      </div>
      <div className="mt-5 overflow-hidden rounded-card border border-line">
        <div className="bg-primary-solid p-6 text-primary-on">
          <p className="text-sm text-white/75">Estimated range</p>
          <p className="tabular font-display text-4xl font-extrabold sm:text-5xl">
            {money(est.range[0])}–{money(est.range[1])}
          </p>
          {est.recurringNote && <p className="mt-2 text-sm text-white/75">{est.recurringNote}</p>}
        </div>
        <dl className="grid gap-4 p-6 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Service</dt>
            <dd className="mt-1 font-semibold text-ink">{serviceName}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Property</dt>
            <dd className="mt-1 font-semibold text-ink">{est.propertyLabel}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Includes</dt>
            <dd className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {est.includes.map((i) => (
                <span key={i} className="flex items-center gap-2 text-sm text-ink-2">
                  <CheckCircle2 className="size-4 text-success" aria-hidden /> {i}
                </span>
              ))}
            </dd>
          </div>
        </dl>
        <div className="border-t border-line bg-canvas px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Likely breakdown</p>
          <ul className="mt-2 space-y-1 text-sm">
            {est.lines.map((l) => (
              <li key={l.description} className="flex justify-between gap-4">
                <span className="text-ink-2">{l.description}</span>
                <span className="tabular font-semibold text-ink">{money(l.unitPrice)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mt-4 text-sm text-muted">We’ll confirm a fixed written quote before any work starts. Nothing is charged today.</p>
      <div className="mt-6 flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:justify-between">
        <Button variant="ghost" size="lg" icon={<ArrowLeft className="size-4" />} onClick={onBack}>
          Back
        </Button>
        <Button size="lg" icon={<Sparkles className="size-4.5" />} onClick={onSubmit}>
          Submit my request
        </Button>
      </div>
    </>
  );
}

function Submitted({ leadRef, name, onBook, onSkip }: { leadRef: string; name: string; onBook: () => void; onSkip: () => void }) {
  return (
    <div className="py-4 text-center">
      <span className="mx-auto grid size-16 animate-pop place-items-center rounded-full bg-success-soft text-success-ink">
        <CheckCircle2 className="size-9" aria-hidden />
      </span>
      <h2 className="mt-5 text-2xl font-extrabold text-ink">Thanks {name.split(' ')[0]} — request received</h2>
      <p className="mt-2 text-muted">
        Reference <span className="font-bold text-ink">{leadRef}</span>. Choose a time now and we’ll hold it for you.
      </p>
      <div className="mx-auto mt-7 flex max-w-md flex-col gap-3">
        <Button size="xl" icon={<Clock className="size-5" />} onClick={onBook}>
          Choose a time
        </Button>
        <Button variant="ghost" onClick={onSkip}>
          Skip — just call me back
        </Button>
      </div>
      <p className="mx-auto mt-6 max-w-md rounded-xl bg-subtle px-4 py-3 text-xs text-muted">
        <span className="font-semibold text-ink-2">Presenter note:</span> this request is now a <span className="font-semibold">New</span> lead in the office portal.
      </p>
    </div>
  );
}

