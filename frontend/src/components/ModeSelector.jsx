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
    <div className="px-6 py-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-4">Mode</p>
      <div className="flex flex-col gap-1.5">
        {MODES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => handleModeChange(id)}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-medium transition-all text-left',
              mode === id
                ? 'bg-[var(--surface)] text-[var(--foreground)] shadow-[var(--shadow-card)]'
                : 'text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]'
            )}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
