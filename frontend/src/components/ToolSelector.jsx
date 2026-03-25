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
    <div className="px-6 py-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-4">
        Tools
      </p>
      <div className="space-y-2">
        {AVAILABLE_TOOLS.map(({ id, label, icon: Icon }) => {
          const active = selectedTools.includes(id);
          return (
            <button
              key={id}
              onClick={() => toggle(id)}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-base transition-all text-left hover:bg-[var(--accent)]"
            >
              <Icon size={20} className={cn('shrink-0', active ? 'text-[var(--primary)]' : 'text-[var(--muted)]')} />
              <span className={cn('flex-1 font-medium', active ? 'text-[var(--foreground)]' : 'text-[var(--muted-foreground)]')}>
                {label}
              </span>
              <div className={cn(
                'w-12 h-7 rounded-full transition-colors relative',
                active ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'
              )}>
                <div className={cn(
                  'absolute top-[3px] w-[22px] h-[22px] rounded-full bg-white transition-transform shadow-sm',
                  active ? 'translate-x-[22px]' : 'translate-x-[3px]'
                )} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
