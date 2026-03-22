import { Sun, Moon, MessageSquare } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Chat } from '../components/Chat';
import { ModeSelector } from '../components/ModeSelector';
import { ToolSelector } from '../components/ToolSelector';
import { SchemaEditor } from '../components/SchemaEditor';
import { StatusBar } from '../components/StatusBar';
import { Button } from '../components/ui/Button';
import useChatStore from '../store/chatStore';

export function Home() {
  const { theme, setTheme } = useTheme();
  const { mode } = useChatStore();

  return (
    <div className="flex flex-col h-screen bg-[var(--background)]">
      <StatusBar />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 flex flex-col border-r border-[var(--border)] bg-[var(--surface)] overflow-y-auto shrink-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <MessageSquare size={18} className="text-blue-400" />
              <span className="font-semibold text-sm text-[var(--foreground)]">small-llm</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title="Toggle theme"
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </Button>
          </div>

          <ModeSelector />

          <div className="border-t border-[var(--border)]" />

          {mode === 'tools' && <ToolSelector />}
          {mode === 'object' && <SchemaEditor />}

          {mode === 'chat' && (
            <div className="p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2 px-1">
                Info
              </p>
              <p className="text-xs text-[var(--muted-foreground)] px-1 leading-relaxed">
                Standard conversational mode. Messages maintain history for context.
              </p>
            </div>
          )}
        </aside>

        {/* Main chat area */}
        <main className="flex-1 overflow-hidden bg-[var(--background)]">
          <Chat />
        </main>
      </div>
    </div>
  );
}
