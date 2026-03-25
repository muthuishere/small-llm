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
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-3 px-1">
        Tools
      </p>
      <div className="space-y-1">
        {AVAILABLE_TOOLS.map(({ id, label, icon: Icon }) => {
          const active = selectedTools.includes(id);
          return (
            <button
              key={id}
              onClick={() => toggle(id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-left hover:bg-[var(--accent)] cursor-pointer"
            >
              <Icon size={16} className={cn('shrink-0', active ? 'text-[var(--primary)]' : 'text-[var(--muted)]')} />
              <span className={cn('flex-1 font-medium', active ? 'text-[var(--foreground)]' : 'text-[var(--muted-foreground)]')}>
                {label}
              </span>
              <div className={cn(
                'w-10 h-6 rounded-full transition-colors relative shrink-0',
                active ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'
              )}>
                <div className={cn(
                  'absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white transition-transform shadow-sm',
                  active ? 'translate-x-[19px]' : 'translate-x-[3px]'
                )} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
