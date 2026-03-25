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
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-3 px-1">Mode</p>
      <div className="flex flex-col gap-1">
        {MODES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => handleModeChange(id)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left cursor-pointer',
              mode === id
                ? 'bg-[var(--surface)] text-[var(--foreground)] shadow-[var(--shadow-card)] border border-[var(--border)]'
                : 'text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]'
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
