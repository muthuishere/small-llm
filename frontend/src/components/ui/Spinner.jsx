import { cn } from '../../lib/utils';

export function Spinner({ className, size = 'md' }) {
  const sizes = {
    sm: 'w-4 h-4 border-[1.5px]',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-2',
  };

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-[var(--border)] border-t-[var(--primary)]',
        sizes[size],
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );
}
