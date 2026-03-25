import { MessageSquare, Code2, Wrench } from 'lucide-react';
import useChatStore from '../store/chatStore';
import { cn } from '../lib/utils';

const MODES = [
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'object', label: 'Structured', icon: Code2 },
  { id: 'tools', label: 'Tools', icon: Wrench },
];

export function ModeSelector() {
  const { mode, setMode, clearMessages } = useChatStore();

  const handleModeChange = (newMode) => {
    setMode(newMode);
    clearMessages();
  };

  return (
    <div className="px-5 py-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-3">Mode</p>
      <div className="flex gap-1.5 p-1.5 rounded-2xl bg-[var(--surface-elevated)]">
        {MODES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => handleModeChange(id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
              mode === id
                ? 'bg-[var(--surface)] text-[var(--foreground)] shadow-sm'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            )}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
