/**
 * MECHIST — AuthField primitives.
 *
 * `PasswordField` wraps `Input` with a working show / hide toggle so
 * the auth pages stop hand-rolling the same `absolute right-2 top-[34px]`
 * button markup.
 *
 * `AuthAlert` replaces the four hand-rolled `<p role="alert">` blocks
 * scattered across the auth pages. Tone → semantic colour, optional
 * icon (defaults to a tone-appropriate lucide icon), optional body
 * line.
 */
import { type ReactNode, useState, forwardRef } from 'react';
import { Eye, EyeOff, Lock, ShieldAlert, TriangleAlert, CheckCircle2, Info } from 'lucide-react';
import { Input, type InputProps } from './Input';
import { cx } from '@/lib/utils';

export type AuthAlertTone = 'success' | 'warning' | 'danger' | 'info';

export interface PasswordFieldProps extends Omit<InputProps, 'type'> {
  /** When true, starts in the visible (plain) state instead of masked. */
  defaultVisible?: boolean;
}

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(function PasswordField(
  { defaultVisible = false, ...rest },
  ref,
) {
  const [visible, setVisible] = useState(defaultVisible);

  return (
    <div className="relative">
      <Input
        ref={ref}
        type={visible ? 'text' : 'password'}
        icon={<Lock className="h-4 w-4" />}
        {...rest}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        className="absolute right-2 top-[34px] grid h-7 w-7 place-items-center rounded-md text-fg-muted hover:bg-surface-inset hover:text-fg-app focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
});

const TONE: Record<
  AuthAlertTone,
  {
    wrap: string;
    icon: (props: { className?: string; 'aria-hidden'?: boolean }) => ReactNode;
  }
> = {
  success: {
    wrap: 'border-success-500/30 bg-success-500/10 text-success-700 dark:text-success-300',
    icon: (p) => <CheckCircle2 aria-hidden className={cx('mt-0.5 h-4 w-4 shrink-0', p.className)} />,
  },
  warning: {
    wrap: 'border-warning-500/30 bg-warning-500/10 text-warning-700 dark:text-warning-300',
    icon: (p) => <ShieldAlert aria-hidden className={cx('mt-0.5 h-4 w-4 shrink-0', p.className)} />,
  },
  danger: {
    wrap: 'border-danger-500/30 bg-danger-500/10 text-danger-700 dark:text-danger-300',
    icon: (p) => <TriangleAlert aria-hidden className={cx('mt-0.5 h-4 w-4 shrink-0', p.className)} />,
  },
  info: {
    wrap: 'border-info-500/30 bg-info-500/10 text-info-700 dark:text-info-300',
    icon: (p) => <Info aria-hidden className={cx('mt-0.5 h-4 w-4 shrink-0', p.className)} />,
  },
};

export interface AuthAlertProps {
  tone: AuthAlertTone;
  /** Optional title (the line that gets the semibold treatment). */
  title?: ReactNode;
  /** Optional secondary line below the title. */
  body?: ReactNode;
  /** Override the default tone icon. */
  icon?: ReactNode;
  /** role attribute — `alert` for state errors, `status` for success. */
  role?: 'alert' | 'status';
  className?: string;
}

export function AuthAlert({ tone, title, body, icon, role = 'alert', className }: AuthAlertProps) {
  const t = TONE[tone];
  return (
    <p
      role={role}
      className={cx(
        'flex items-start gap-2 rounded-lg border p-3 text-small',
        t.wrap,
        className,
      )}
    >
      {icon ?? t.icon({})}
      <span>
        {title && <span className="font-medium">{title}</span>}
        {body && <span className="block opacity-90">{body}</span>}
      </span>
    </p>
  );
}
