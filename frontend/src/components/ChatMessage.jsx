import { useState } from 'react';
import { ChevronDown, ChevronRight, Wrench } from 'lucide-react';
import { cn } from '../lib/utils';
import { JsonViewer } from './JsonViewer';

function ToolCallAccordion({ toolCalls }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2 rounded-xl bg-[var(--surface-elevated)] overflow-hidden">
      <button
        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <Wrench size={11} />
        <span>{toolCalls.length} tool call{toolCalls.length !== 1 ? 's' : ''}</span>
        {open ? <ChevronDown size={11} className="ml-auto" /> : <ChevronRight size={11} className="ml-auto" />}
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          {toolCalls.map((tc, i) => {
            const name   = tc.tool || tc.name || tc.function?.name || 'unknown';
            const args   = tc.input ?? tc.args ?? tc.function?.arguments;
            const result = tc.output ?? tc.result;
            return (
              <div key={i} className="rounded-lg bg-[var(--surface)] p-2.5 border border-[var(--border)]">
                <p className="text-xs font-medium text-[var(--primary)] mb-1">{name}</p>
                <pre className="text-[11px] text-[var(--muted-foreground)] whitespace-pre-wrap">
                  {typeof args === 'string' ? args : JSON.stringify(args, null, 2)}
                </pre>
                {result != null && (
                  <div className="mt-1.5 pt-1.5 border-t border-[var(--border)]">
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400">{String(result)}</p>
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

  return (
    <div className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[75%] space-y-1')}>
        <div className={cn(
          'rounded-2xl px-5 py-3.5 text-base leading-relaxed',
          isUser
            ? 'bg-[var(--primary)] text-white'
            : 'bg-[var(--surface-elevated)] text-[var(--foreground)]'
        )}>
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
