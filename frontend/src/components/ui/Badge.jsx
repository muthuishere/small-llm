import { cn } from '../../lib/utils';

export function Badge({ children, className, variant = 'default', ...props }) {
  const variants = {
    default: 'bg-[var(--surface-elevated)] text-[var(--foreground)] border border-[var(--border)]',
    success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
    warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
    danger: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-800',
    muted: 'bg-[var(--accent)] text-[var(--muted-foreground)] border border-[var(--border)]',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
