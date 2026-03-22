import { useState } from 'react';
import { User, Bot, ChevronDown, ChevronRight, Wrench } from 'lucide-react';
import { cn } from '../lib/utils';
import { JsonViewer } from './JsonViewer';

function ToolCallAccordion({ toolCalls }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2 border border-[var(--border)] rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--muted-foreground)] hover:bg-[var(--surface-elevated)] transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <Wrench size={12} />
        <span>{toolCalls.length} tool call{toolCalls.length !== 1 ? 's' : ''}</span>
        {open ? <ChevronDown size={12} className="ml-auto" /> : <ChevronRight size={12} className="ml-auto" />}
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          {toolCalls.map((tc, i) => (
            <div key={i} className="rounded bg-[var(--surface-elevated)] p-2">
              <p className="text-xs font-semibold text-blue-400 mb-1">{tc.name || tc.function?.name}</p>
              <pre className="text-xs text-[var(--muted-foreground)] whitespace-pre-wrap">
                {JSON.stringify(tc.args || tc.function?.arguments, null, 2)}
              </pre>
              {tc.result && (
                <div className="mt-1 pt-1 border-t border-[var(--border)]">
                  <p className="text-xs text-green-400">Result: {String(tc.result)}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ChatMessage({ message }) {
  const isUser = message.role === 'user';
  const isJson = message.type === 'json' || message.type === 'object';

  return (
    <div className={cn('flex gap-3 group', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1',
        isUser ? 'bg-blue-600' : 'bg-[var(--surface-elevated)] border border-[var(--border)]'
      )}>
        {isUser ? <User size={14} className="text-white" /> : <Bot size={14} className="text-blue-400" />}
      </div>

      <div className={cn('max-w-[75%] space-y-1', isUser ? 'items-end' : 'items-start')}>
        <div className={cn(
          'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'bg-blue-600 text-white rounded-tr-sm'
            : 'bg-[var(--surface)] border border-[var(--border)] border-l-2 border-l-blue-500 text-[var(--foreground)] rounded-tl-sm'
        )}>
          {isJson ? (
            <JsonViewer data={message.content} className="text-[var(--foreground)]" />
          ) : (
            <p className="whitespace-pre-wrap">{message.content}</p>
          )}
        </div>

        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="w-full">
            <ToolCallAccordion toolCalls={message.toolCalls} />
          </div>
        )}

        <p className="text-[10px] text-[var(--muted)] px-1">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}
