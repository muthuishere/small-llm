import { cn } from '../lib/utils';

function renderValue(val, depth = 0) {
  if (val === null) return <span className="text-[var(--muted)]">null</span>;
  if (typeof val === 'boolean') return <span className="text-purple-500 dark:text-purple-400">{String(val)}</span>;
  if (typeof val === 'number') return <span className="text-amber-600 dark:text-amber-400">{val}</span>;
  if (typeof val === 'string') return <span className="text-emerald-600 dark:text-emerald-400">"{val}"</span>;
  if (Array.isArray(val)) {
    if (val.length === 0) return <span className="text-[var(--muted)]">[]</span>;
    return (
      <span>
        <span className="text-[var(--muted)]">[</span>
        <div className="pl-4">
          {val.map((item, i) => (
            <div key={i}>
              {renderValue(item, depth + 1)}
              {i < val.length - 1 && <span className="text-[var(--muted)]">,</span>}
            </div>
          ))}
        </div>
        <span className="text-[var(--muted)]">]</span>
      </span>
    );
  }
  if (typeof val === 'object') {
    const entries = Object.entries(val);
    if (entries.length === 0) return <span className="text-[var(--muted)]">{'{}'}</span>;
    return (
      <span>
        <span className="text-[var(--muted)]">{'{'}</span>
        <div className="pl-4">
          {entries.map(([k, v], i) => (
            <div key={k}>
              <span className="text-[var(--primary)]">"{k}"</span>
              <span className="text-[var(--muted)]">: </span>
              {renderValue(v, depth + 1)}
              {i < entries.length - 1 && <span className="text-[var(--muted)]">,</span>}
            </div>
          ))}
        </div>
        <span className="text-[var(--muted)]">{'}'}</span>
      </span>
    );
  }
  return <span>{String(val)}</span>;
}

export function JsonViewer({ data, className }) {
  let parsed = data;
  if (typeof data === 'string') {
    try {
      parsed = JSON.parse(data);
    } catch {
      // Try to display as formatted text if it looks JSON-ish
      return <pre className={cn('text-xs font-mono leading-relaxed overflow-auto', className)}>{data}</pre>;
    }
  }

  // If parsed is still a string (shouldn't happen but safety net), show as-is
  if (typeof parsed === 'string') {
    return <pre className={cn('text-xs font-mono leading-relaxed overflow-auto', className)}>{parsed}</pre>;
  }

  return (
    <pre className={cn('text-xs font-mono leading-relaxed overflow-auto', className)}>
      {renderValue(parsed)}
    </pre>
  );
}
