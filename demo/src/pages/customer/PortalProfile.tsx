import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellRing, House, LogOut, Mail, MapPin, Pencil, Phone, Repeat, UserRound } from 'lucide-react';
import { dayMonthYear } from '../../utils/format';
import { Avatar } from '../../components/common/Avatar';
import { Button, LinkButton } from '../../components/common/Button';
import { Card, CardHeader, KeyValue } from '../../components/common/Card';
import { Toggle } from '../../components/common/Form';
import { useToast } from '../../components/common/Toast';
import { PortalHeading, PortalNoAccount, RecurringPlanCard, usePortal } from '../../components/customer/PortalUi';

type PrefKey = 'reminders' | 'onTheWay' | 'documents' | 'offers';

const PREFS: { key: PrefKey; label: string; description: string }[] = [
  { key: 'reminders', label: 'Appointment reminders', description: 'A text the day before each visit' },
  { key: 'onTheWay', label: '“On my way” alerts', description: 'A text when your technician sets off' },
  { key: 'documents', label: 'Quotes, invoices & receipts', description: 'By email, with a link to this portal' },
  { key: 'offers', label: 'Seasonal reminders & offers', description: 'Occasional emails, e.g. autumn gutter cleans' },
];

const CONTACT_LABEL = { phone: 'Phone call', email: 'Email', sms: 'Text message' } as const;

export default function PortalProfile() {
  const { customer, lead, name, email, company, config } = usePortal();
  const navigate = useNavigate();
  const toast = useToast();
  const [prefs, setPrefs] = useState<Record<PrefKey, boolean>>({ reminders: true, onTheWay: true, documents: true, offers: false });
  if (!customer && !lead) return <PortalNoAccount />;

  const phone = customer?.phone || lead?.phone || '—';
  const mail = customer?.email || lead?.email || email;
  const preferred = customer?.preferredContact ?? lead?.preferredContact;
  const street = customer?.address ?? lead?.address;
  const town = customer?.town ?? lead?.town;
  const postcode = customer?.postcode ?? lead?.postcode;
  const property = customer?.propertyType ?? lead?.propertyType;
  const access = lead?.details.find((d) => d.label === 'Access')?.value;
  const plans = customer?.recurring ?? [];

  const editToast = () => toast({ title: 'Need to update your details?', description: `Send us a message and ${company.companyName} will update them for you (demo).`, tone: 'info', action: { label: 'Open messages', to: '/portal/messages' } });

  const setPref = (key: PrefKey, label: string, value: boolean) => {
    setPrefs((p) => ({ ...p, [key]: value }));
    toast({ title: `${label} ${value ? 'on' : 'off'}`, description: 'Preference saved (demo).' });
  };

  const signOut = () => {
    toast({ title: 'Signed out', description: `Thanks for visiting ${company.companyName}.`, tone: 'info' });
    navigate('/');
  };

  return (
    <>
      <PortalHeading
        title="Your profile"
        subtitle={customer ? `Customer since ${dayMonthYear(customer.customerSince)}` : `Request ${lead?.ref} — your account is being set up`}
        actions={
          <Button variant="outline" icon={<LogOut className="size-4" />} onClick={signOut}>
            Sign out
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Contact details" icon={UserRound} action={<Button variant="ghost" size="sm" icon={<Pencil className="size-3.5" />} onClick={editToast} aria-label="Edit contact details">Edit</Button>} />
          <div className="mb-5 flex items-center gap-3">
            <Avatar name={name} color={config.branding.primaryColor} size="lg" />
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-bold text-ink">{name}</p>
              <p className="truncate text-sm text-muted">{mail}</p>
            </div>
          </div>
          <dl className="grid gap-4 sm:grid-cols-2">
            <KeyValue label="Mobile">
              <span className="inline-flex items-center gap-1.5">
                <Phone className="size-3.5 text-muted" aria-hidden /> {phone}
              </span>
            </KeyValue>
            <KeyValue label="Email">
              <span className="inline-flex min-w-0 items-center gap-1.5 break-all">
                <Mail className="size-3.5 shrink-0 text-muted" aria-hidden /> {mail}
              </span>
            </KeyValue>
            <KeyValue label="Preferred contact">{preferred ? CONTACT_LABEL[preferred] : 'No preference'}</KeyValue>
            <KeyValue label="Account">{customer ? 'Active customer' : 'Request in progress'}</KeyValue>
          </dl>
        </Card>

        <Card>
          <CardHeader title="Property" icon={House}action={<Button variant="ghost" size="sm" icon={<Pencil className="size-3.5" />} onClick={editToast} aria-label="Edit property details">Edit</Button>} />
          <div className="flex items-start gap-3 rounded-xl bg-canvas p-4">
            <MapPin className="mt-0.5 size-5 shrink-0 text-secondary-ink" aria-hidden />
            <p className="text-sm text-ink">
              {street ?? 'Address to be confirmed'}
              {town && (
                <>
                  <br />
                  {town}
                </>
              )}
              {postcode && (
                <>
                  <br />
                  {postcode}
                </>
              )}
            </p>
          </div>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <KeyValue label="Property type">{property ?? '—'}</KeyValue>
            <KeyValue label="Access notes">{access ?? 'None recorded'}</KeyValue>
          </dl>
        </Card>

        <Card>
          <CardHeader title="Notifications" subtitle="Choose how we keep you updated" icon={BellRing} />
          <div className="space-y-4">
            {PREFS.map((p) => (
              <Toggle key={p.key} checked={prefs[p.key]} onChange={(v) => setPref(p.key, p.label, v)} label={p.label} description={p.description} />
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Recurring plans" subtitle="Skip a visit or pause any time" icon={Repeat} />
          {plans.length ? (
            <div className="space-y-3">
              {plans.map((p) => (
                <RecurringPlanCard key={`${p.service}-${p.label}`} plan={p} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-line-2 p-4">
              <p className="text-sm text-muted">You don’t have a recurring plan. Regular window and gutter cleans are cheaper per visit and booked automatically.</p>
              <LinkButton to="/quote?service=window" variant="soft" size="sm" className="mt-3">
                Explore plans
              </LinkButton>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-8 flex flex-col items-center gap-2 text-center">
        <Button variant="ghost" icon={<LogOut className="size-4" />} onClick={signOut}>
          Sign out of the portal
        </Button>
        <p className="text-xs text-muted">Your data is fictional and stored only in this browser for the demo.</p>
      </div>
    </>
  );
}
