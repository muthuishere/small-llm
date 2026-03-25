import { Sun, Moon, ArrowLeft } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Chat } from '../components/Chat';
import { ModeSelector } from '../components/ModeSelector';
import { ToolSelector } from '../components/ToolSelector';
import { SchemaEditor } from '../components/SchemaEditor';
import { StatusBar } from '../components/StatusBar';
import useChatStore from '../store/chatStore';
import { sendChat, sendChatWithObject, sendChatWithTools } from '../services/api';

const serverCallbacks = {
  chat: async (text, history, context) => {
    const res = await sendChat(text, history, context);
    return res.data;
  },
  object: async (text, schema, fewShot) => {
    const res = await sendChatWithObject(text, schema, fewShot);
    return res.data;
  },
  tools: async (text, tools, context) => {
    const res = await sendChatWithTools(text, tools, context);
    return res.data;
  },
};

export function ServerPage() {
  const { theme, setTheme } = useTheme();
  const { mode, clearMessages } = useChatStore();
  const navigate = useNavigate();

  useEffect(() => { clearMessages(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col h-screen bg-[var(--background)]">
      <StatusBar />

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-[320px] flex flex-col bg-[var(--sidebar)] border-r border-[var(--border)] overflow-y-auto shrink-0">
          <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)]">
            <span className="text-lg font-bold text-[var(--foreground)]">Server</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/')}
                className="w-10 h-10 flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-elevated)] transition-all cursor-pointer"
                aria-label="Back"
              >
                <ArrowLeft size={18} />
              </button>
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="w-10 h-10 flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-elevated)] transition-all cursor-pointer"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            </div>
          </div>

          <ModeSelector />

          {mode === 'tools' && <><div className="mx-6 border-t border-[var(--border)]" /><ToolSelector /></>}
          {mode === 'object' && <><div className="mx-6 border-t border-[var(--border)]" /><SchemaEditor /></>}
        </aside>

        <main className="flex-1 overflow-hidden bg-[var(--background)]">
          <Chat callbacks={serverCallbacks} />
        </main>
      </div>
    </div>
  );
}
