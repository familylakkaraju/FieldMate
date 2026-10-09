import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { Building2, CheckCircle2, Clock, ExternalLink, FileText, Globe, Info, Mail, MapPin, MessagesSquare, Phone, Plus, Smartphone, X } from 'lucide-react';
import type { CompanySettings } from '../../types/domain';
import { useDemo } from '../../app/DemoProvider';
import { SettingsShell, usePublicPreview } from '../../components/settings/SettingsShell';
import { Card, CardHeader } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { inputClass, TextArea, TextInput } from '../../components/common/Form';
import { BrandMark } from '../../components/common/Logo';
import { useToast } from '../../components/common/Toast';
import { cx } from '../../utils/cx';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const KEYS: (keyof CompanySettings)[] = ['companyName', 'tagline', 'phone', 'email', 'address', 'serviceAreas', 'openingHours', 'region'];
const same = (a: CompanySettings, b: CompanySettings) => KEYS.every((k) => (k === 'serviceAreas' ? a.serviceAreas.join('|') === b.serviceAreas.join('|') : a[k] === b[k]));

function validate(f: CompanySettings) {
  const e: Partial<Record<keyof CompanySettings, string>> = {};
  if (!f.companyName.trim()) e.companyName = 'Enter your company name';
  if (!f.phone.trim()) e.phone = 'Enter a phone number customers can call';
  if (!EMAIL.test(f.email.trim())) e.email = 'Enter a valid email address, e.g. hello@yourbusiness.co.uk';
  if (!f.serviceAreas.length) e.serviceAreas = 'Add at least one area so customers know where you work';
  return e;
}

export default function Company() {
  const { state, actions } = useDemo();
  const company = state.config.company;
  const branding = state.config.branding;
  const toast = useToast();
  const site = usePublicPreview();

  const [form, setForm] = useState<CompanySettings>(company);
  const [base, setBase] = useState<CompanySettings>(company);
  const [tried, setTried] = useState(false);
  const [area, setArea] = useState('');
  const [areaMsg, setAreaMsg] = useState('');

  // Adopt outside changes (demo reset, example rebrand in another tab) unless there are unsaved edits.
  if (base !== company) {
    setBase(company);
    if (same(form, base)) setForm(company);
  }

  const dirty = !same(form, company);
  const errors = validate(form);
  const hasErrors = Object.keys(errors).length > 0;
  const err = (k: keyof CompanySettings) => (tried ? errors[k] : undefined);
  const set = <K extends keyof CompanySettings>(k: K, v: CompanySettings[K]) => setForm((f) => ({ ...f, [k]: v }));

  const addArea = () => {
    const v = area.trim().replace(/\s+/g, ' ');
    if (!v) return;
    if (form.serviceAreas.some((a) => a.toLowerCase() === v.toLowerCase())) {
      setAreaMsg(`${v} is already in your list`);
      return;
    }
    set('serviceAreas', [...form.serviceAreas, v]);
    setArea('');
    setAreaMsg(`${v} added`);
  };
  const removeArea = (a: string) => {
    set(
      'serviceAreas',
      form.serviceAreas.filter((x) => x !== a),
    );
    setAreaMsg(`${a} removed`);
  };
  const onAreaKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addArea();
    }
  };

  const save = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (hasErrors) {
      toast({ title: 'Check the highlighted fields', description: 'A few details need fixing before saving.', tone: 'warning' });
      return;
    }
    const clean: CompanySettings = {
      ...form,
      companyName: form.companyName.trim(),
      tagline: form.tagline.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      region: form.region.trim(),
      openingHours: form.openingHours.trim(),
    };
    actions.updateCompany(clean);
    setForm(clean);
    setTried(false);
    toast({ title: 'Company details saved', description: 'Updated on your website, quotes, invoices and customer portal.', action: { label: 'View contact page', to: '/contact' } });
  };

  const discard = () => {
    setForm(company);
    setTried(false);
    setAreaMsg('');
  };

  return (
    <SettingsShell
      title="Company details"
      subtitle="The business information customers see everywhere you appear."
      actions={
        <Button variant="outline" icon={<ExternalLink className="size-4" />} onClick={() => site.view('/contact')}>
          View contact page
        </Button>
      }
    >
      <div className="flex items-start gap-2.5 rounded-card border border-info/30 bg-info-soft p-4 text-sm text-info-ink">
        <Info className="mt-0.5 size-4.5 shrink-0" aria-hidden />
        <p>
          <span className="font-semibold">These details appear on your website, quotes, invoices and customer portal.</span> Branding (logo, colours and fonts) lives in the Branding tab.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <form onSubmit={save} noValidate className="card" aria-label="Company details">
          <div className="space-y-8 p-5 sm:p-6">
            <fieldset className="space-y-4">
              <legend className="mb-1 text-[15px] font-bold text-ink">Business identity</legend>
              <TextInput
                label="Company name"
                required
                value={form.companyName}
                onChange={(e) => set('companyName', e.target.value)}
                autoComplete="organization"
                aria-invalid={!!err('companyName')}
                hint={err('companyName') ? <span className="font-medium text-danger-ink">{err('companyName')}</span> : 'Appears in your header, browser tab, emails and documents.'}
              />
              <TextInput
                label="Tagline"
                value={form.tagline}
                maxLength={90}
                onChange={(e) => set('tagline', e.target.value)}
                hint={`${form.tagline.length}/90 · A short line under your name, e.g. on quotes and the website footer.`}
              />
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="mb-1 text-[15px] font-bold text-ink">Contact details</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextInput
                  label="Phone"
                  required
                  type="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  aria-invalid={!!err('phone')}
                  hint={err('phone') ? <span className="font-medium text-danger-ink">{err('phone')}</span> : 'Used for the Call buttons on your website.'}
                />
                <TextInput
                  label="Email"
                  required
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  aria-invalid={!!err('email')}
                  hint={err('email') ? <span className="font-medium text-danger-ink">{err('email')}</span> : 'Quotes and invoices are sent from this address.'}
                />
              </div>
              <TextArea label="Business address" rows={2} value={form.address} onChange={(e) => set('address', e.target.value)} autoComplete="street-address" hint="Printed on quotes and invoices." />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextInput label="Region" value={form.region} onChange={(e) => set('region', e.target.value)} hint="Used in headlines, e.g. “Trusted home services across Essex”." />
                <TextInput label="Opening hours" value={form.openingHours} onChange={(e) => set('openingHours', e.target.value)} hint="Shown on the contact page and in the footer." />
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-1 text-[15px] font-bold text-ink">Service areas</legend>
              <p className="mb-3 text-[13px] text-muted">Towns and districts you cover. Shown on your website and used by the postcode checker.</p>
              {form.serviceAreas.length > 0 ? (
                <ul className="flex flex-wrap gap-2" aria-label="Service areas">
                  {form.serviceAreas.map((a) => (
                    <li key={a} className="inline-flex h-8 items-center gap-1 rounded-full bg-secondary-soft pl-3 pr-1 text-[13px] font-semibold text-secondary-ink">
                      <MapPin className="size-3.5" aria-hidden />
                      {a}
                      <button type="button" onClick={() => removeArea(a)} aria-label={`Remove ${a}`} className="grid size-6 place-items-center rounded-full transition hover:bg-secondary-tint">
                        <X className="size-3.5" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-xl border border-dashed border-line-2 px-4 py-3 text-sm text-muted">No areas yet — add the towns you cover.</p>
              )}
              <div className="mt-3 flex gap-2">
                <input
                  value={area}
                  onChange={(e) => {
                    setArea(e.target.value);
                    setAreaMsg('');
                  }}
                  onKeyDown={onAreaKey}
                  placeholder="Add an area, e.g. Witham"
                  aria-label="Add a service area"
                  className={cx(inputClass, 'max-w-sm')}
                />
                <Button variant="outline" icon={<Plus className="size-4" />} onClick={addArea} disabled={!area.trim()} className="h-11">
                  Add
                </Button>
              </div>
              <p className={cx('mt-1.5 min-h-5 text-[13px]', err('serviceAreas') ? 'font-medium text-danger-ink' : 'text-muted')} aria-live="polite">
                {err('serviceAreas') ?? areaMsg ?? ''}
              </p>
            </fieldset>
          </div>

          <div className="sticky bottom-0 z-10 flex flex-col gap-3 rounded-b-card border-t border-line bg-surface/95 px-5 py-3.5 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="flex items-center gap-2 text-[13px] font-semibold" role="status">
              {dirty ? (
                <>
                  <span className="size-2 rounded-full bg-warning" aria-hidden />
                  <span className="text-warning-ink">Unsaved changes</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4 text-success-ink" aria-hidden />
                  <span className="text-success-ink">All changes saved</span>
                </>
              )}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={discard} disabled={!dirty}>
                Discard
              </Button>
              <Button type="submit" disabled={!dirty} icon={<CheckCircle2 className="size-4" />}>
                Save changes
              </Button>
            </div>
          </div>
        </form>

        {/* preview + where it appears */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="Contact card" subtitle={dirty ? 'Preview of your unsaved changes' : 'As customers see it'} icon={Building2} />
            <div className="overflow-hidden rounded-xl border border-line">
              <div className="flex items-center gap-3 bg-primary-solid px-4 py-3.5 text-primary-on">
                <BrandMark mark={branding.logoMark} primary="rgba(255,255,255,0.16)" accent={branding.secondaryColor} dataUrl={branding.logoDataUrl} size={38} />
                <div className="min-w-0">
                  <p className="truncate font-display text-[15px] font-extrabold">{form.companyName || 'Your company name'}</p>
                  <p className="truncate text-[12px] opacity-80">{form.tagline || 'Your tagline'}</p>
                </div>
              </div>
              <ul className="space-y-2.5 p-4 text-[13px] text-ink-2">
                <li className="flex items-start gap-2.5">
                  <Phone className="mt-0.5 size-4 shrink-0 text-accent-ink" aria-hidden /> <span className="font-semibold text-ink">{form.phone || '—'}</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Mail className="mt-0.5 size-4 shrink-0 text-accent-ink" aria-hidden /> <span className="break-all">{form.email || '—'}</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-accent-ink" aria-hidden /> <span>{form.address || '—'}</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Clock className="mt-0.5 size-4 shrink-0 text-accent-ink" aria-hidden /> <span>{form.openingHours || '—'}</span>
                </li>
              </ul>
              {form.serviceAreas.length > 0 && (
                <div className="border-t border-line bg-canvas px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Covering {form.region || 'your region'}</p>
                  <p className="mt-1 text-[13px] text-ink-2">{form.serviceAreas.join(' · ')}</p>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Where these details appear" icon={Globe} />
            <ul className="space-y-3">
              {[
                { icon: Globe, title: 'Website', text: 'Header, footer, contact page and Call buttons' },
                { icon: FileText, title: 'Quotes & invoices', text: 'Letterhead, contact block and payment details' },
                { icon: MessagesSquare, title: 'Customer portal', text: 'Booking updates, messages and receipts' },
                { icon: Smartphone, title: 'Worker app', text: 'Job sheets and the office contact number' },
              ].map((x) => (
                <li key={x.title} className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary-soft text-secondary-ink">
                    <x.icon className="size-4.5" aria-hidden />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-ink">{x.title}</span>
                    <span className="block text-[13px] text-muted">{x.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </SettingsShell>
  );
}
