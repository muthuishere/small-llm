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
    chat: (text, history, context) => browserChat(text, history, context),
    object: (text, schema, fewShot) => browserChatWithObject(text, schema, fewShot),
    tools: (text, tools, context) => browserChatWithTools(text, tools, context),
  }), [])();

  const isReady = webllmStatus.phase === 'ready';

  return (
    <div className="flex flex-col h-screen bg-[var(--background)]">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-8 py-3 border-b border-[var(--border)] shrink-0 bg-[var(--background)]">
        <span className="text-base font-bold text-[var(--foreground)]">small‑llm</span>
        <span className="text-[var(--border)]">·</span>
        <span className="text-sm text-[var(--muted-foreground)]">Browser</span>
        {isReady && (
          <>
            <span className="text-[var(--border)]">·</span>
            <span className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Ready
            </span>
          </>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-[320px] flex flex-col bg-[var(--sidebar)] border-r border-[var(--border)] overflow-y-auto shrink-0">
          <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)]">
            <span className="text-lg font-bold text-[var(--foreground)]">Browser</span>
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

          <div className="mt-4">
            <WebLLMStatus status={webllmStatus} />
          </div>

          <ModeSelector />

          {mode === 'tools' && <><div className="mx-6 border-t border-[var(--border)]" /><ToolSelector /></>}
          {mode === 'object' && <><div className="mx-6 border-t border-[var(--border)]" /><SchemaEditor /></>}
        </aside>

        <main className="flex-1 overflow-hidden bg-[var(--background)] relative">
          {!isReady && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[var(--background)]/95 backdrop-blur-sm">
              <p className="text-xl font-semibold text-[var(--foreground)] mb-2">
                {webllmStatus.phase === 'error' ? 'Failed to load model' : 'Loading model…'}
              </p>
              <p className="text-sm text-[var(--muted-foreground)] max-w-sm text-center leading-relaxed">
                {webllmStatus.phase === 'error'
                  ? webllmStatus.text
                  : 'Downloaded once, cached locally.'}
              </p>
              {webllmStatus.phase === 'loading' && webllmStatus.progress > 0 && (
                <div className="mt-6 w-64 h-1.5 rounded-full bg-[var(--surface-elevated)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--primary)] transition-all duration-300"
                    style={{ width: `${Math.round(webllmStatus.progress * 100)}%` }}
                  />
                </div>
              )}
              {webllmStatus.phase === 'loading' && webllmStatus.progress > 0 && (
                <p className="mt-2 text-xs font-mono text-[var(--muted-foreground)]">
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
