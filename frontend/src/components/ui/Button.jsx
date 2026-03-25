import { cn } from '../../lib/utils';

export function Button({ children, className, variant = 'primary', size = 'md', disabled, ...props }) {
  const base = 'inline-flex items-center justify-center font-medium rounded-xl transition-all focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-[var(--primary)] text-white hover:opacity-85 active:opacity-75',
    secondary: 'bg-[var(--surface-elevated)] text-[var(--foreground)] hover:bg-[var(--border)]',
    ghost: 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-elevated)]',
    destructive: 'bg-[var(--destructive)] text-white hover:opacity-85',
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
    icon: 'p-2.5',
  };

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
