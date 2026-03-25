import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        'w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-base text-[var(--foreground)] placeholder-[var(--muted-foreground)] shadow-[var(--shadow-card)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all',
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
        'w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-base text-[var(--foreground)] placeholder-[var(--muted-foreground)] shadow-[var(--shadow-card)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all resize-none',
        className
      )}
      {...props}
    />
  );
});
