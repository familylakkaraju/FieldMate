import { useDemoData } from '../../app/DemoProvider';
import { mix } from '../../theme/branding';
import { cx } from '../../utils/cx';
import { initials } from '../../utils/format';

export function Avatar({ name, color = '#475467', size = 'md', className, ring }: { name: string; color?: string; size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; className?: string; ring?: boolean }) {
  const sizes = { xs: 'size-6 text-[10px]', sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-12 text-base', xl: 'size-16 text-xl' };
  return (
    <span
      className={cx('inline-grid shrink-0 place-items-center rounded-full font-bold', sizes[size], ring && 'ring-2 ring-white', className)}
      style={{ background: mix(color, '#ffffff', 0.82), color: mix(color, '#000000', 0.15) }}
      aria-hidden
      title={name}
    >
      {initials(name)}
    </span>
  );
}

export function WorkerAvatar({ id, size = 'sm', ring, className }: { id: string; size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; ring?: boolean; className?: string }) {
  const data = useDemoData();
  const m = data.team.find((t) => t.id === id);
  if (!m) return null;
  return <Avatar name={m.name} color={m.color} size={size} ring={ring} className={className} />;
}

export function AvatarStack({ ids, size = 'sm', max = 3 }: { ids: string[]; size?: 'xs' | 'sm' | 'md'; max?: number }) {
  const data = useDemoData();
  const names = ids.map((id) => data.team.find((t) => t.id === id)?.name).filter(Boolean).join(' & ');
  if (!ids.length) return <span className="text-[13px] font-medium text-warning-ink">Unassigned</span>;
  return (
    <span className="inline-flex items-center" aria-label={`Assigned: ${names}`} title={names}>
      {ids.slice(0, max).map((id, i) => (
        <WorkerAvatar key={id} id={id} size={size} ring className={i ? '-ml-2' : ''} />
      ))}
    </span>
  );
}
