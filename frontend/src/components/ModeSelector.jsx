import { MessageSquare, Code2, Wrench } from 'lucide-react';
import useChatStore from '../store/chatStore';
import { cn } from '../lib/utils';

const MODES = [
  { id: 'chat', label: 'Chat', icon: MessageSquare, description: 'Plain conversational chat' },
  { id: 'object', label: 'Structured', icon: Code2, description: 'Returns JSON objects' },
  { id: 'tools', label: 'Tools', icon: Wrench, description: 'Uses calculator, datetime...' },
];

export function ModeSelector() {
  const { mode, setMode, clearMessages } = useChatStore();

  const handleModeChange = (newMode) => {
    setMode(newMode);
    clearMessages();
  };

  return (
    <div className="p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2 px-1">Mode</p>
      <div className="space-y-1">
        {MODES.map(({ id, label, icon: Icon, description }) => (
          <button
            key={id}
            onClick={() => handleModeChange(id)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left',
              mode === id
                ? 'bg-blue-600 text-white'
                : 'text-[var(--muted-foreground)] hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)]'
            )}
          >
            <Icon size={16} className="shrink-0" />
            <div>
              <div className="font-medium">{label}</div>
              <div className={cn('text-xs', mode === id ? 'text-blue-100' : 'text-[var(--muted)]')}>
                {description}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
