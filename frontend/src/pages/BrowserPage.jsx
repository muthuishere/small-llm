import { Sun, Moon, ArrowLeft } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { Chat } from '../components/Chat';
import { ModeSelector } from '../components/ModeSelector';
import { ToolSelector } from '../components/ToolSelector';
import { SchemaEditor } from '../components/SchemaEditor';
import { WebLLMStatus } from '../components/WebLLMStatus';
import useChatStore from '../store/chatStore';
import {
  initEngine,
  isEngineReady,
  browserChat,
  browserChatWithObject,
  browserChatWithTools,
} from '../services/webllm';

export function BrowserPage() {
  const { theme, setTheme } = useTheme();
  const { mode, clearMessages } = useChatStore();
  const navigate = useNavigate();

  const [webllmStatus, setWebllmStatus] = useState({ phase: 'idle', text: '', progress: 0 });

  useEffect(() => { clearMessages(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isEngineReady()) {
      setWebllmStatus({ phase: 'ready', text: 'Model ready in browser', progress: 1 });
      return;
    }
    setWebllmStatus({ phase: 'loading', text: 'Initialising model…', progress: 0 });
    initEngine((p) => {
      setWebllmStatus({ phase: 'loading', text: p.text, progress: p.progress ?? 0 });
    })
      .then(() => setWebllmStatus({ phase: 'ready', text: 'Model ready', progress: 1 }))
      .catch((e) => setWebllmStatus({ phase: 'error', text: e.message, progress: 0 }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const browserCallbacks = useCallback(() => ({
    chat:   (text, history, context) => browserChat(text, history, context),
    object: (text, schema, fewShot)  => browserChatWithObject(text, schema, fewShot),
    tools:  (text, tools, context)   => browserChatWithTools(text, tools, context),
  }), [])();

  const isReady = webllmStatus.phase === 'ready';

  return (
    <div className="flex flex-col h-screen bg-[var(--background)]">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-[var(--border)] text-sm shrink-0">
        <span className="text-base font-bold text-[var(--foreground)]">small-llm</span>
        <span className="text-[var(--border)]">·</span>
        <span className="text-[var(--muted-foreground)]">Browser Mode</span>
        {isReady && (
          <>
            <span className="text-[var(--border)]">·</span>
            <span className="flex items-center gap-2 text-[var(--muted-foreground)]">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Ready
            </span>
          </>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-72 lg:w-80 flex flex-col border-r border-[var(--border)] bg-[var(--surface)] overflow-y-auto shrink-0">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
            <span className="text-base font-bold text-[var(--foreground)]">Browser</span>
            <div className="flex items-center gap-1">
              <button onClick={() => navigate('/')} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[var(--surface-elevated)] text-[var(--muted-foreground)] transition-colors">
                <ArrowLeft size={18} />
              </button>
              <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[var(--surface-elevated)] text-[var(--muted-foreground)] transition-colors">
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            </div>
          </div>

          <div className="mt-4">
            <WebLLMStatus status={webllmStatus} />
          </div>

          <ModeSelector />

          {mode === 'tools'  && <><div className="mx-5 border-t border-[var(--border)]" /><ToolSelector /></>}
          {mode === 'object' && <><div className="mx-5 border-t border-[var(--border)]" /><SchemaEditor /></>}
        </aside>

        {/* Main chat area */}
        <main className="flex-1 overflow-hidden bg-[var(--background)] relative">
          {!isReady && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[var(--background)]/90 backdrop-blur-sm">
              <p className="text-xl md:text-2xl font-bold text-[var(--foreground)] mb-3">
                {webllmStatus.phase === 'error' ? 'Failed to load model' : 'Loading model…'}
              </p>
              <p className="text-base text-[var(--muted)] max-w-sm text-center leading-relaxed">
                {webllmStatus.phase === 'error'
                  ? webllmStatus.text
                  : 'Downloaded once, cached locally.'}
              </p>
              {webllmStatus.phase === 'loading' && webllmStatus.progress > 0 && (
                <div className="mt-8 w-64 h-1.5 rounded-full bg-[var(--surface-elevated)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--primary)] transition-all duration-300"
                    style={{ width: `${Math.round(webllmStatus.progress * 100)}%` }}
                  />
                </div>
              )}
              {webllmStatus.phase === 'loading' && webllmStatus.progress > 0 && (
                <p className="mt-3 text-sm font-mono text-[var(--muted)]">
                  {Math.round(webllmStatus.progress * 100)}%
                </p>
              )}
            </div>
          )}
          <Chat callbacks={browserCallbacks} />
        </main>
      </div>
    </div>
  );
}
