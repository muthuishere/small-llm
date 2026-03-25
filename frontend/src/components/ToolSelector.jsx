import { Calculator, Clock, Cloud } from 'lucide-react';
import useChatStore from '../store/chatStore';
import { cn } from '../lib/utils';

const AVAILABLE_TOOLS = [
  { id: 'calculator', label: 'Calculator', icon: Calculator },
  { id: 'datetime', label: 'Date & Time', icon: Clock },
  { id: 'weather', label: 'Weather', icon: Cloud },
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
    <div className="px-5 py-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-3">
        Tools
      </p>
      <div className="space-y-1">
        {AVAILABLE_TOOLS.map(({ id, label, icon: Icon }) => {
          const active = selectedTools.includes(id);
          return (
            <button
              key={id}
              onClick={() => toggle(id)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors text-left hover:bg-[var(--surface-elevated)]"
            >
              <Icon size={18} className={cn('shrink-0', active ? 'text-[var(--primary)]' : 'text-[var(--muted)]')} />
              <span className={cn('flex-1 font-medium', active ? 'text-[var(--foreground)]' : 'text-[var(--muted-foreground)]')}>
                {label}
              </span>
              <div className={cn(
                'w-11 h-6 rounded-full transition-colors relative',
                active ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'
              )}>
                <div className={cn(
                  'absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-sm',
                  active ? 'translate-x-5' : 'translate-x-0.5'
                )} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
