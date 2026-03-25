import { cn } from '../../lib/utils';

export function Badge({ children, className, variant = 'default', ...props }) {
  const variants = {
    default: 'bg-[var(--surface-elevated)] text-[var(--foreground)]',
    success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    danger: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
    muted: 'bg-[var(--surface-elevated)] text-[var(--muted-foreground)]',
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
