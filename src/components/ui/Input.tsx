import {
  forwardRef,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  type ReactNode,
} from 'react';
import { cx } from '@/lib/utils';

interface FieldShellProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  id?: string;
  children: ReactNode;
  className?: string;
}

export function FieldShell({ label, hint, error, required, id, children, className }: FieldShellProps) {
  return (
    <div className={cx('flex flex-col gap-2', className)}>
      {label && (
        <label htmlFor={id} className="eyebrow text-fg-muted">
          {label}
          {required && (
            <span aria-hidden className="ml-1 text-danger-500">
              *
            </span>
          )}
        </label>
      )}
      {children}
      {error ? (
        <p role="alert" className="text-xs text-danger-500">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-fg-subtle">{hint}</p>
      ) : null}
    </div>
  );
}

const fieldClass = cx(
  'w-full h-11 px-3.5 rounded-lg',
  'bg-surface-inset text-fg-app placeholder:text-fg-subtle',
  'border border-line-soft',
  'transition-[border-color,box-shadow,background-color] duration-200 ease-out-soft',
  'hover:border-line-strong',
  'focus:border-azure-500 focus:bg-surface-app focus:outline-none focus:ring-4 focus:ring-azure-500/15',
  'disabled:opacity-50 disabled:cursor-not-allowed',
);

const errorClass = 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/15';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  /** decorative leading icon, inset in the field */
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, required, id, className, icon, ...rest },
  ref,
) {
  const inputId = id ?? rest.name;
  return (
    <FieldShell label={label} hint={hint} error={error} required={required} id={inputId}>
      <div className="relative">
        {icon && (
          <span aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={Boolean(error) || undefined}
          className={cx(fieldClass, icon && 'pl-10', error && errorClass, className)}
          {...rest}
        />
      </div>
    </FieldShell>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, required, id, className, rows = 4, ...rest },
  ref,
) {
  const inputId = id ?? rest.name;
  return (
    <FieldShell label={label} hint={hint} error={error} required={required} id={inputId}>
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        required={required}
        aria-invalid={Boolean(error) || undefined}
        className={cx(fieldClass, 'h-auto resize-y py-3 leading-relaxed', error && errorClass, className)}
        {...rest}
      />
    </FieldShell>
  );
});

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, required, id, className, children, ...rest },
  ref,
) {
  const inputId = id ?? rest.name;
  return (
    <FieldShell label={label} hint={hint} error={error} required={required} id={inputId}>
      <div className="relative">
        <select
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={Boolean(error) || undefined}
          className={cx(fieldClass, 'appearance-none pr-10', error && errorClass, className)}
          {...rest}
        >
          {children}
        </select>
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    </FieldShell>
  );
});
