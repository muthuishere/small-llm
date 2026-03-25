import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        'w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-base text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)] focus:shadow-[var(--shadow-glow)] transition-all duration-150',
        className
      )}
      {...props}
    />
  );
}

export const Textarea = forwardRef(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        'w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-base text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)] focus:shadow-[var(--shadow-glow)] transition-all duration-150 resize-none',
        className
      )}
      {...props}
    />
  );
});

Textarea.displayName = 'Textarea';
