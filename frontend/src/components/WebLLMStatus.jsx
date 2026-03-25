import { CheckCircle } from 'lucide-react';

export function WebLLMStatus({ status }) {
  if (!status || status.phase === 'idle') return null;

  const { phase, text, progress } = status;

  if (phase === 'ready') {
    return (
      <div className="mx-5 mb-2 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
        <CheckCircle size={15} />
        <span className="font-medium">Model ready</span>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="mx-5 mb-2 text-sm text-[var(--destructive)]">
        {text || 'Failed to load model'}
      </div>
    );
  }

  return (
    <div className="mx-5 mb-2">
      <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)] mb-2">
        <span className="truncate">{text || 'Loading…'}</span>
        {progress > 0 && <span className="font-mono shrink-0 ml-2">{Math.round(progress * 100)}%</span>}
      </div>
      {progress > 0 && (
        <div className="h-1.5 rounded-full bg-[var(--accent)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--primary)] transition-all duration-300"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
