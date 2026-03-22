import { Sun, Moon, Cpu, ArrowLeft } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { Chat } from '../components/Chat';
import { ModeSelector } from '../components/ModeSelector';
import { ToolSelector } from '../components/ToolSelector';
import { SchemaEditor } from '../components/SchemaEditor';
import { WebLLMStatus } from '../components/WebLLMStatus';
import { Button } from '../components/ui/Button';
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

  // Clear messages on page enter
  useEffect(() => { clearMessages(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Begin loading the model immediately when this page mounts
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

  // Callbacks that delegate to the WebLLM service
  const browserCallbacks = useCallback(() => ({
    chat:   (text, history, context) => browserChat(text, history, context),
    object: (text, schema, fewShot)  => browserChatWithObject(text, schema, fewShot),
    tools:  (text, tools, context)   => browserChatWithTools(text, tools, context),
  }), [])();

  const isReady = webllmStatus.phase === 'ready';

  return (
    <div className="flex flex-col h-screen bg-[var(--background)]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)] bg-[var(--surface)] text-sm shrink-0">
        <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
          <span className="font-semibold text-[var(--foreground)]">Small LLM</span>
          <span className="text-[var(--border)]">·</span>
          <Cpu size={14} className="text-purple-400" />
          <span className="text-purple-400">Browser Mode</span>
        </div>
        <div className="text-xs">
          {isReady && (
            <span className="px-2 py-0.5 rounded bg-[var(--surface-elevated)] font-mono text-green-400">
              Qwen 0.5B · WebLLM
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 flex flex-col border-r border-[var(--border)] bg-[var(--surface)] overflow-y-auto shrink-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <Cpu size={16} className="text-purple-400 shrink-0" />
              <span className="font-semibold text-sm text-[var(--foreground)]">Browser Mode</span>
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
              WebLLM · Qwen 0.5B · runs in browser
            </p>
          </div>

          {/* WebLLM download / init progress */}
          <div className="mt-2">
            <WebLLMStatus status={webllmStatus} />
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
                Runs Qwen 0.5B entirely in your browser via WebLLM + WebGPU.
                No server required. Model is cached locally after first download.
              </p>
            </div>
          )}
        </aside>

        {/* Main chat area */}
        <main className="flex-1 overflow-hidden bg-[var(--background)] relative">
          {/* Overlay while model is loading */}
          {!isReady && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[var(--background)]/80 backdrop-blur-sm">
              <Cpu size={40} className="text-purple-400 mb-4 animate-pulse" />
              <p className="font-semibold text-[var(--foreground)] mb-1">
                {webllmStatus.phase === 'error' ? 'Failed to load model' : 'Loading Qwen 0.5B…'}
              </p>
              <p className="text-sm text-[var(--muted-foreground)] max-w-xs text-center">
                {webllmStatus.phase === 'error'
                  ? webllmStatus.text
                  : 'The model is being downloaded and cached in your browser. This only happens once.'}
              </p>
              {webllmStatus.phase === 'loading' && webllmStatus.progress > 0 && (
                <div className="mt-4 w-64 h-2 rounded-full bg-[var(--surface-elevated)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-purple-500 transition-all duration-300"
                    style={{ width: `${Math.round(webllmStatus.progress * 100)}%` }}
                  />
                </div>
              )}
              {webllmStatus.phase === 'loading' && webllmStatus.progress > 0 && (
                <p className="mt-1 text-xs font-mono text-purple-400">
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
