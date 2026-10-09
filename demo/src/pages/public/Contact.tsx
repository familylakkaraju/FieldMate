import { useState, type FormEvent } from 'react';
import { Clock, Mail, MapPin, Phone, Send, Siren } from 'lucide-react';
import type { ServiceType } from '../../types/domain';
import { useDemo } from '../../app/DemoProvider';
import { enabledServices } from '../../app/selectors';
import { useCallModal } from '../../layouts/PublicLayout';
import { Button } from '../../components/common/Button';
import { SelectInput, TextArea, TextInput } from '../../components/common/Form';
import { useToast } from '../../components/common/Toast';

export default function Contact() {
  const { state, actions } = useDemo();
  const toast = useToast();
  const call = useCallModal();
  const { company } = state.config;
  const services = enabledServices(state.config);
  const [f, setF] = useState({ name: '', email: '', phone: '', postcode: '', service: services[0]?.id ?? 'gutter', message: '' });
  const [sent, setSent] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const id = actions.createLead({
      customerName: f.name.trim() || 'Website enquiry',
      email: f.email || undefined,
      phone: f.phone || undefined,
      postcode: f.postcode.toUpperCase() || undefined,
      service: f.service as ServiceType,
      summary: f.message.trim() || 'General enquiry from the contact form',
      details: [{ label: 'Message', value: f.message.trim() || '—' }],
      source: 'website',
      urgency: 'normal',
      preferredContact: f.email ? 'email' : 'phone',
    });
    const ref = state.data.leads.find((l) => l.id === id)?.ref;
    setSent(ref ?? 'received');
    toast({ title: 'Message sent', description: 'We’ll be in touch shortly. (Demo: a new lead was created.)', action: { label: 'View lead in office portal', to: `/app/leads/${id}` } });
    setF({ ...f, message: '' });
  };

  return (
    <div className="bg-canvas">
      <div className="mx-auto max-w-7xl px-4 pb-24 pt-14 sm:px-6 md:pt-20">
        <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-accent-ink">Contact</p>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-primary-ink md:text-5xl">How can we help?</h1>
        <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <form onSubmit={submit} className="card grid gap-4 p-6 sm:grid-cols-2 sm:p-8">
            <TextInput label="Full name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            <TextInput label="Mobile" inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
            <TextInput label="Email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
            <TextInput label="Postcode" value={f.postcode} onChange={(e) => setF({ ...f, postcode: e.target.value })} />
            <SelectInput label="Service" value={f.service} onChange={(e) => setF({ ...f, service: e.target.value as ServiceType })} className="sm:col-span-2">
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </SelectInput>
            <TextArea label="Message" rows={5} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} className="sm:col-span-2" placeholder="Tell us what you need…" />
            <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted">Demo form — nothing is sent outside this browser.</p>
              <Button type="submit" size="lg" icon={<Send className="size-4.5" />}>
                Send message
              </Button>
            </div>
            {sent && <p role="status" className="rounded-lg bg-success-soft px-3 py-2 text-sm font-semibold text-success-ink sm:col-span-2">Thanks — your enquiry {sent} has been received.</p>}
          </form>
          <div className="space-y-5">
            <div className="rounded-card bg-danger-ink p-6 text-white">
              <p className="flex items-center gap-2 text-lg font-bold">
                <Siren className="size-5" aria-hidden /> Plumbing emergency?
              </p>
              <p className="mt-1 text-sm text-white/85">Turn off your stopcock and call us — same-day slots available 7 days.</p>
              <Button variant="white" className="mt-4 text-danger-ink" icon={<Phone className="size-4" />} onClick={call}>
                Call {company.phone}
              </Button>
            </div>
            <div className="card space-y-4 p-6 text-sm">
              <p className="flex items-start gap-3">
                <Phone className="mt-0.5 size-5 text-accent-ink" aria-hidden />
                <span>
                  <span className="block font-semibold text-ink">{company.phone}</span>
                  <span className="text-muted">Demo number</span>
                </span>
              </p>
              <p className="flex items-start gap-3">
                <Mail className="mt-0.5 size-5 text-accent-ink" aria-hidden />
                <span className="font-semibold text-ink">{company.email}</span>
              </p>
              <p className="flex items-start gap-3">
                <Clock className="mt-0.5 size-5 text-accent-ink" aria-hidden />
                <span className="text-ink-2">{company.openingHours}</span>
              </p>
              <p className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-5 text-accent-ink" aria-hidden />
                <span className="text-ink-2">{company.address}</span>
              </p>
            </div>
            <div className="card p-6">
              <p className="font-bold text-ink">Service areas</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {company.serviceAreas.map((a) => (
                  <li key={a} className="rounded-full bg-subtle px-3 py-1 text-sm font-medium text-ink-2">
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
