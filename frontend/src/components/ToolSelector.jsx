import { Calculator, Clock, Cloud } from 'lucide-react';
import useChatStore from '../store/chatStore';
import { cn } from '../lib/utils';

const AVAILABLE_TOOLS = [
  { id: 'calculator', label: 'Calculator', icon: Calculator, description: 'Math expressions' },
  { id: 'datetime', label: 'Date & Time', icon: Clock, description: 'Current time/date' },
  { id: 'weather', label: 'Weather', icon: Cloud, description: 'Weather lookup' },
];

export function ToolSelector() {
  const { selectedTools, setSelectedTools } = useChatStore();

  const toggle = (toolId) => {
    if (selectedTools.includes(toolId)) {
      setSelectedTools(selectedTools.filter((t) => t !== toolId));
    } else {
      setSelectedTools([...selectedTools, toolId]);
    }
  };

  return (
    <div className="p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2 px-1">
        Available Tools
      </p>
      <div className="space-y-1">
        {AVAILABLE_TOOLS.map(({ id, label, icon: Icon, description }) => {
          const active = selectedTools.includes(id);
          return (
            <button
              key={id}
              onClick={() => toggle(id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left border',
                active
                  ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                  : 'border-transparent text-[var(--muted-foreground)] hover:bg-[var(--surface-elevated)]'
              )}
            >
              <Icon size={15} className="shrink-0" />
              <div>
                <div className="font-medium">{label}</div>
                <div className="text-xs text-[var(--muted)]">{description}</div>
              </div>
              <div className="ml-auto">
                <div className={cn(
                  'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0',
                  active ? 'bg-blue-500 border-blue-500' : 'border-[var(--border)]'
                )}>
                  {active && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
