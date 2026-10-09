import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Check, CheckCircle2, Clock, Mail, Phone, Send, ShieldCheck, UserPlus, Users } from 'lucide-react';
import type { ServiceType, TeamMember } from '../../types/domain';
import { useDemo } from '../../app/DemoProvider';
import { sortedServices } from '../../app/selectors';
import { serviceTone } from '../../theme/branding';
import { cx } from '../../utils/cx';
import { SettingsShell } from '../../components/settings/SettingsShell';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Checkbox, SelectInput, TextInput, Toggle } from '../../components/common/Form';
import { WorkerAvatar } from '../../components/common/Avatar';
import { ServiceIcon } from '../../components/common/ServiceIcon';
import { useToast } from '../../components/common/Toast';

const OWNER_ID = 'w-daniel';
const FIELD_SEATS = 3;
const ROLES = ['Field Technician', 'Plumber', 'Exterior Cleaning Operative', 'Apprentice', 'Office Coordinator'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Team() {
  const { state } = useDemo();
  const team = state.data.team;
  const [inviteOpen, setInviteOpen] = useState(false);

  const fieldActive = team.filter((m) => !m.isOffice && m.active && !m.invited).length;
  const pending = team.filter((m) => m.invited).length;

  return (
    <SettingsShell
      title="Team"
      subtitle="Who can be booked for which services, and who has access to the worker app."
      actions={
        <Button icon={<UserPlus className="size-4" />} onClick={() => setInviteOpen(true)}>
          Invite team member
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Summary icon={Users} label="Team members" value={String(team.length)} sub={`${team.filter((m) => m.isOffice).length} office · ${team.filter((m) => !m.isOffice).length} field`} />
        <Summary
          icon={ShieldCheck}
          label="Field worker seats"
          value={`${fieldActive} of ${FIELD_SEATS}`}
          sub={
            <Link to="/app/settings/plan" className="font-semibold text-secondary-ink hover:underline">
              {fieldActive >= FIELD_SEATS ? 'At plan limit — see plans' : 'FieldMate Pro plan'}
            </Link>
          }
          warn={fieldActive > FIELD_SEATS}
        />
        <Summary icon={Send} label="Pending invites" value={String(pending)} sub={pending ? 'Waiting for them to accept' : 'Everyone has joined'} />
      </div>

      <ul className="grid gap-5 lg:grid-cols-2">
        {team.map((m) => (
          <li key={m.id} className="min-w-0">
            <MemberCard member={m} />
          </li>
        ))}
      </ul>

      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </SettingsShell>
  );
}

function Summary({ icon: Icon, label, value, sub, warn }: { icon: typeof Users; label: string; value: string; sub: ReactNode; warn?: boolean }) {
  return (
    <div className="card flex items-center gap-3.5 p-4">
      <span className={cx('grid size-11 shrink-0 place-items-center rounded-xl', warn ? 'bg-warning-soft text-warning-ink' : 'bg-secondary-soft text-secondary-ink')}>
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-muted">{label}</p>
        <p className="tabular font-display text-xl font-extrabold text-ink">{value}</p>
        <p className="truncate text-[12px] text-muted">{sub}</p>
      </div>
    </div>
  );
}

function MemberCard({ member: m }: { member: TeamMember }) {
  const { state, actions } = useDemo();
  const toast = useToast();
  const services = sortedServices(state.config);
  const isOwner = m.id === OWNER_ID;

  const toggleService = (id: ServiceType) => {
    const has = m.services.includes(id);
    const next = has ? m.services.filter((s) => s !== id) : [...m.services, id];
    actions.updateTeamMember(m.id, { services: next });
  };

  const setActive = (v: boolean) => {
    actions.updateTeamMember(m.id, { active: v });
    toast({
      title: v ? `${m.firstName} is active` : `${m.firstName} deactivated`,
      description: v ? 'Can be assigned jobs and sign in to the worker app.' : 'Hidden from scheduling and signed out of the worker app. Job history is kept.',
      tone: v ? 'success' : 'info',
    });
  };

  const accept = () => {
    actions.updateTeamMember(m.id, { invited: false, active: true });
    toast({ title: `${m.firstName} accepted the invite`, description: 'Demo simulation — they can now be booked for jobs.' });
  };

  return (
    <Card as="article" className={cx('flex h-full flex-col', !m.active && !m.invited && 'bg-canvas')}>
      <div className="flex items-start gap-3.5">
        <span className={cx(!m.active && 'opacity-60 grayscale')}>
          <WorkerAvatar id={m.id} size="lg" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="truncate text-base font-bold text-ink">{m.name}</h3>
            {isOwner && <Badge tone="brand">Owner</Badge>}
            {m.isOffice && <Badge tone="violet">Office</Badge>}
            {m.invited ? (
              <Badge tone="amber" icon={<Send className="size-3" aria-hidden />}>
                Invite sent
              </Badge>
            ) : m.active ? (
              <Badge tone="green" dot>
                Active
              </Badge>
            ) : (
              <Badge tone="gray" dot>
                Inactive
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted">{m.role}</p>
        </div>
      </div>

      <ul className="mt-4 grid gap-1.5 text-[13px] text-ink-2 sm:grid-cols-2">
        <li className="flex min-w-0 items-center gap-2">
          <Phone className="size-4 shrink-0 text-muted" aria-hidden />
          {m.phone ? <span className="truncate">{m.phone}</span> : <span className="italic text-muted">Added when they join</span>}
        </li>
        <li className="flex min-w-0 items-center gap-2">
          <Mail className="size-4 shrink-0 text-muted" aria-hidden />
          <span className="truncate">{m.email || '—'}</span>
        </li>
      </ul>

      <div className="mt-4">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">Skills</p>
        {m.skills.length ? (
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {m.skills.map((s) => (
              <li key={s} className="rounded-full bg-subtle px-2.5 py-1 text-xs font-semibold text-ink-2">
                {s}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-[13px] text-muted">Skills are added during onboarding.</p>
        )}
      </div>

      <div className="mt-4">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-muted" id={`cap-${m.id}`}>
          Can be booked for
        </p>
        {m.isOffice ? (
          <p className="mt-1 text-[13px] text-muted">Office role — manages leads, bookings, quotes and invoices rather than field work.</p>
        ) : (
          <div role="group" aria-labelledby={`cap-${m.id}`} className="mt-1.5 flex flex-wrap gap-1.5">
            {services.map((s) => {
              const on = m.services.includes(s.id);
              const tone = serviceTone(s.color);
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleService(s.id)}
                  className={cx('inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold transition', on ? 'border-transparent' : 'border-dashed border-line-2 bg-surface text-muted hover:border-muted hover:text-ink')}
                  style={on ? { background: tone.soft, color: tone.ink, borderColor: tone.border } : undefined}
                >
                  {on ? <Check className="size-3.5" aria-hidden /> : <ServiceIcon name={s.icon} className="size-3.5" />}
                  {s.name}
                  {!s.enabled && <span className="text-[11px] font-medium opacity-70">(hidden)</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-auto pt-5">
        <div className="border-t border-line pt-4">
          {m.invited ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 text-[13px] text-warning-ink">
                <Clock className="size-4 shrink-0" aria-hidden /> Waiting for {m.firstName} to accept
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" icon={<Send className="size-3.5" />} onClick={() => toast({ title: 'Invite re-sent', description: `Demo — no email is sent to ${m.email}.`, tone: 'info' })}>
                  Resend
                </Button>
                <Button size="sm" variant="soft" icon={<CheckCircle2 className="size-3.5" />} onClick={accept}>
                  Simulate acceptance
                </Button>
              </div>
            </div>
          ) : (
            <Toggle
              checked={m.active}
              onChange={setActive}
              disabled={isOwner}
              label="Active"
              description={isOwner ? 'Account owner — always active.' : m.active ? 'Can be assigned jobs and use the worker app.' : 'Hidden from scheduling. History is kept.'}
            />
          )}
        </div>
      </div>
    </Card>
  );
}

function InviteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, actions } = useDemo();
  const toast = useToast();
  const services = sortedServices(state.config);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState(ROLES[0]);
  const [picked, setPicked] = useState<ServiceType[]>([]);
  const [tried, setTried] = useState(false);

  const errors = {
    name: name.trim().length < 2 ? 'Enter their full name' : '',
    email: !EMAIL.test(email.trim()) ? 'Enter a valid email address' : '',
  };

  const close = () => {
    onClose();
    setName('');
    setEmail('');
    setRole(ROLES[0]);
    setPicked([]);
    setTried(false);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (errors.name || errors.email) return;
    actions.inviteTeamMember(name.trim(), email.trim(), role, role === 'Office Coordinator' ? [] : picked);
    toast({ title: 'Invite sent (demo — no email is sent)', description: `${name.trim().split(/\s+/)[0]} has been added as a pending ${role.toLowerCase()}.` });
    close();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Invite team member"
      description="They’ll get an email to join and download the worker app."
      footer={
        <>
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" form="invite-form" icon={<Send className="size-4" />}>
            Send invite
          </Button>
        </>
      }
    >
      <form id="invite-form" onSubmit={submit} noValidate className="space-y-4">
        <TextInput
          label="Full name"
          required
          data-autofocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="off"
          placeholder="e.g. Jordan Ellis"
          aria-invalid={tried && !!errors.name}
          hint={tried && errors.name ? <span className="font-medium text-danger-ink">{errors.name}</span> : undefined}
        />
        <TextInput
          label="Email"
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="off"
          placeholder="name@yourbusiness.co.uk"
          aria-invalid={tried && !!errors.email}
          hint={tried && errors.email ? <span className="font-medium text-danger-ink">{errors.email}</span> : undefined}
        />
        <SelectInput label="Role" value={role} onChange={(e) => setRole(e.target.value)}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </SelectInput>
        {role !== 'Office Coordinator' && (
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-ink-2">Can be booked for</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {services.map((s) => (
                <Checkbox
                  key={s.id}
                  checked={picked.includes(s.id)}
                  onChange={(v) => setPicked((p) => (v ? [...p, s.id] : p.filter((x) => x !== s.id)))}
                  className="rounded-xl border border-line p-3 hover:bg-canvas"
                  label={
                    <span className="inline-flex items-center gap-2 font-semibold">
                      <ServiceIcon name={s.icon} className="size-4" style={{ color: serviceTone(s.color).ink }} />
                      {s.name}
                    </span>
                  }
                />
              ))}
            </div>
          </fieldset>
        )}
        <p className="rounded-xl bg-warning-soft px-3.5 py-2.5 text-[13px] text-warning-ink">Demo prototype — no email is sent. The new member appears as “Invite sent” until you simulate acceptance.</p>
      </form>
    </Modal>
  );
}
