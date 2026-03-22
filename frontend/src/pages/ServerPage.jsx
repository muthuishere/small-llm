import { Sun, Moon, Server, MessageSquare, ArrowLeft } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Chat } from '../components/Chat';
import { ModeSelector } from '../components/ModeSelector';
import { ToolSelector } from '../components/ToolSelector';
import { SchemaEditor } from '../components/SchemaEditor';
import { StatusBar } from '../components/StatusBar';
import { Button } from '../components/ui/Button';
import useChatStore from '../store/chatStore';
import { sendChat, sendChatWithObject, sendChatWithTools } from '../services/api';

/** Callbacks that delegate to the Go backend API */
const serverCallbacks = {
  chat:   async (text, history, context) => {
    const res = await sendChat(text, history, context);
    return res.data;
  },
  object: async (text, schema, fewShot) => {
    const res = await sendChatWithObject(text, schema, fewShot);
    return res.data;
  },
  tools:  async (text, tools, context) => {
    const res = await sendChatWithTools(text, tools, context);
    return res.data;
  },
};

export function ServerPage() {
  const { theme, setTheme } = useTheme();
  const { mode, clearMessages } = useChatStore();
  const navigate = useNavigate();

  // Clear messages when entering this page
  useEffect(() => { clearMessages(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col h-screen bg-[var(--background)]">
      <StatusBar />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 flex flex-col border-r border-[var(--border)] bg-[var(--surface)] overflow-y-auto shrink-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <Server size={16} className="text-blue-400 shrink-0" />
              <span className="font-semibold text-sm text-[var(--foreground)]">Server Mode</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
                title="Back to home"
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                <ArrowLeft size={15} />
              </Button>
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
          </div>

          <div className="px-3 pt-2 pb-1">
            <p className="text-[10px] uppercase tracking-wider text-[var(--muted)] px-1">
              Go backend · llama.cpp · Qwen 0.5B
            </p>
          </div>

          <ModeSelector />

          <div className="border-t border-[var(--border)]" />

          {mode === 'tools'  && <ToolSelector />}
          {mode === 'object' && <SchemaEditor />}
          {mode === 'chat'   && (
            <div className="p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2 px-1">
                Info
              </p>
              <p className="text-xs text-[var(--muted-foreground)] px-1 leading-relaxed">
                Runs Qwen 0.5B via llama.cpp on the Go server. Messages maintain history.
              </p>
            </div>
          )}
        </aside>

        {/* Main chat area */}
        <main className="flex-1 overflow-hidden bg-[var(--background)]">
          <Chat callbacks={serverCallbacks} />
        </main>
      </div>
    </div>
  );
}
