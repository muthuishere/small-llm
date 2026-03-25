import { useState } from 'react';
import { ChevronDown, ChevronRight, Wrench } from 'lucide-react';
import { cn } from '../lib/utils';
import { JsonViewer } from './JsonViewer';

function ToolCallAccordion({ toolCalls }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      <button
        className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
        onClick={() => setOpen((v) => !v)}
      >
        <Wrench size={14} />
        <span>{toolCalls.length} tool call{toolCalls.length !== 1 ? 's' : ''}</span>
        {open ? <ChevronDown size={14} className="ml-auto" /> : <ChevronRight size={14} className="ml-auto" />}
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          {toolCalls.map((tc, i) => {
            const name = tc.tool || tc.name || tc.function?.name || 'unknown';
            const args = tc.input ?? tc.args ?? tc.function?.arguments;
            const result = tc.output ?? tc.result;
            return (
              <div key={i} className="rounded-lg bg-[var(--surface-elevated)] p-3 border border-[var(--border)]">
                <p className="text-sm font-medium text-[var(--primary)] mb-1">{name}</p>
                <pre className="text-xs text-[var(--muted-foreground)] whitespace-pre-wrap">
                  {typeof args === 'string' ? args : JSON.stringify(args, null, 2)}
                </pre>
                {result != null && (
                  <div className="mt-1.5 pt-1.5 border-t border-[var(--border)]">
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">{String(result)}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ChatMessage({ message }) {
  const isUser = message.role === 'user';
  const isJson = message.type === 'json' || message.type === 'object';
  const isError = message.type === 'error';

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[80%] space-y-1')}>
        <div
          className={cn(
            'rounded-2xl px-5 py-4 text-base leading-relaxed',
            isUser
              ? 'bg-[var(--primary)] text-white'
              : isError
                ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                : 'bg-[var(--surface-elevated)] text-[var(--foreground)] border border-[var(--border)]'
          )}
        >
          {isJson ? (
            <JsonViewer data={message.content} className="text-[var(--foreground)]" />
          ) : (
            <p className="whitespace-pre-wrap">{message.content}</p>
          )}
        </div>

        {message.toolCalls && message.toolCalls.length > 0 && (
          <ToolCallAccordion toolCalls={message.toolCalls} />
        )}
      </div>
    </div>
  );
}
