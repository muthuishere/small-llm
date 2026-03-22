import { Cpu, CheckCircle, AlertCircle } from 'lucide-react';
import { Spinner } from './ui/Spinner';

/**
 * WebLLMStatus — shows model download / initialisation progress for browser mode.
 *
 * @param {{ status: { phase: 'idle'|'loading'|'ready'|'error', text: string, progress: number } }} props
 */
export function WebLLMStatus({ status }) {
  if (!status || status.phase === 'idle') return null;

  const { phase, text, progress } = status;

  const indicator = phase === 'ready'
    ? <CheckCircle size={14} className="text-green-400 shrink-0" />
    : phase === 'error'
    ? <AlertCircle  size={14} className="text-red-400 shrink-0" />
    : <Spinner size="sm" />;

  const label = phase === 'ready'
    ? 'Model ready in browser'
    : phase === 'error'
    ? text || 'Failed to load model'
    : text || 'Loading model…';

  const color = phase === 'ready' ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : phase === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400'
              : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400';

  return (
    <div className={`mx-3 mb-2 rounded-lg border px-3 py-2 text-xs ${color}`}>
      <div className="flex items-center gap-2">
        {indicator}
        <span className="flex-1 truncate">{label}</span>
        {phase === 'loading' && progress > 0 && (
          <span className="font-mono shrink-0">{Math.round(progress * 100)}%</span>
        )}
      </div>
      {phase === 'loading' && progress > 0 && (
        <div className="mt-1.5 h-1 rounded-full bg-yellow-900/40 overflow-hidden">
          <div
            className="h-full rounded-full bg-yellow-400 transition-all duration-300"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
