import { forwardRef, useId, useState, type InputHTMLAttributes } from 'react';
import { cx } from '@/lib/utils';

export interface AnimatedInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

/**
 * AnimatedInput — SmoothUI-style floating-label input. The label slides
 * up and shrinks when the field is focused or has content. Pure CSS
 * transition (no framer-motion needed) so it stays cheap.
 */
export const AnimatedInput = forwardRef<HTMLInputElement, AnimatedInputProps>(function AnimatedInput(
  { label, id, value, defaultValue, placeholder = ' ', className, ...rest },
  ref,
) {
  const reactId = useId();
  const fieldId = id ?? reactId;
  const [focused, setFocused] = useState(false);
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState<string>(
    typeof defaultValue === 'string' ? defaultValue : '',
  );
  const hasValue = isControlled ? Boolean(String(value ?? '')) : Boolean(internal);

  return (
    <div className={cx('relative w-full', className)}>
      <input
        id={fieldId}
        ref={ref}
        value={value}
        defaultValue={defaultValue}
        placeholder={placeholder}
        onFocus={(e) => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          if (!isControlled) setInternal(e.currentTarget.value);
          rest.onBlur?.(e);
        }}
        onChange={(e) => {
          if (!isControlled) setInternal(e.currentTarget.value);
          rest.onChange?.(e);
        }}
        className={cx(
          'peer w-full bg-surface-2 text-fg-app',
          'h-13 rounded-lg border border-line-soft px-4 pt-5 pb-2',
          'placeholder-transparent',
          'transition-[border-color,box-shadow] duration-200 ease-out',
          'focus:outline-none focus:border-azure-400 focus:shadow-[0_0_0_4px_rgb(59_125_255/0.15)]',
        )}
        {...rest}
      />
      <label
        htmlFor={fieldId}
        className={cx(
          'pointer-events-none absolute left-4 origin-left transition-all duration-200 ease-out-soft',
          focused || hasValue
            ? 'top-2 text-[0.7rem] tracking-[0.14em] uppercase text-fg-muted'
            : 'top-1/2 -translate-y-1/2 text-body text-fg-muted',
          focused && 'text-azure-300',
        )}
      >
        {label}
      </label>
    </div>
  );
});