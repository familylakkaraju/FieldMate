import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { cx } from '../../utils/cx';

export type ButtonVariant = 'primary' | 'dark' | 'accent' | 'outline' | 'ghost' | 'danger' | 'white' | 'soft';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-secondary-solid text-secondary-on hover:brightness-110 shadow-sm',
  dark: 'bg-primary-solid text-primary-on hover:brightness-125 shadow-sm',
  accent: 'bg-accent-solid text-accent-on hover:brightness-110 shadow-sm',
  outline: 'border border-line-2 bg-surface text-ink hover:bg-subtle',
  ghost: 'text-ink-2 hover:bg-subtle',
  danger: 'bg-danger-ink text-white hover:brightness-110',
  white: 'bg-white text-primary-ink hover:bg-white/90 shadow-sm',
  soft: 'bg-secondary-soft text-secondary-ink hover:bg-secondary-tint',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-5 text-[15px] gap-2',
  xl: 'h-14 px-7 text-base gap-2.5',
};

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconRight?: ReactNode;
  loading?: boolean;
  full?: boolean;
  className?: string;
  children?: ReactNode;
}

export const buttonClass = (variant: ButtonVariant = 'primary', size: ButtonSize = 'md', full?: boolean, className?: string) =>
  cx(
    'inline-flex select-none items-center justify-center whitespace-nowrap rounded-control font-semibold transition duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
    VARIANTS[variant],
    SIZES[size],
    full && 'w-full',
    className,
  );

type ButtonProps = CommonProps & ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant, size, icon, iconRight, loading, full, className, children, type = 'button', disabled, ...rest }, ref) {
  return (
    <button ref={ref} type={type} disabled={disabled || loading} className={buttonClass(variant, size, full, className)} {...rest}>
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
      {iconRight}
    </button>
  );
});

type LinkButtonProps = CommonProps & { to: string; onClick?: () => void; 'aria-label'?: string; state?: unknown };

export function LinkButton({ to, variant, size, icon, iconRight, full, className, children, onClick, state, ...rest }: LinkButtonProps) {
  return (
    <Link to={to} state={state} onClick={onClick} className={buttonClass(variant, size, full, className)} {...rest}>
      {icon}
      {children}
      {iconRight}
    </Link>
  );
}

export function IconButton({ label, children, className, ...rest }: { label: string; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" aria-label={label} title={label} className={cx('grid size-10 place-items-center rounded-control text-ink-2 transition hover:bg-subtle hover:text-ink', className)} {...rest}>
      {children}
    </button>
  );
}
