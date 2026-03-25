import { useRef, useEffect, useState } from 'react';
import { Send, Trash2, Copy, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import useChatStore from '../store/chatStore';
import { ChatMessage } from './ChatMessage';
import { Button } from './ui/Button';
import { Textarea } from './ui/Input';

export function Chat({ callbacks }) {
  const {
    messages, mode, selectedTools, schema, fewShotExamples, context,
    isLoading, addMessage, clearMessages, setLoading,
  } = useChatStore();
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const buildHistory = () =>
    messages.map((m) => ({ role: m.role, content: String(m.content) }));

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    addMessage({ role: 'user', content: text, type: 'text' });
    setLoading(true);

    try {
      if (mode === 'chat') {
        const data = await callbacks.chat(text, buildHistory(), context);
        addMessage({
          role: 'assistant',
          content: data.response || data.message || JSON.stringify(data),
          type: 'text',
        });
      } else if (mode === 'object') {
        const data = await callbacks.object(text, schema, fewShotExamples);
        addMessage({
          role: 'assistant',
          content: data.result ?? data.response ?? data,
          type: 'json',
        });
      } else if (mode === 'tools') {
        const data = await callbacks.tools(text, selectedTools, context);
        addMessage({
          role: 'assistant',
          content: data.response || data.message || JSON.stringify(data),
          type: 'text',
          toolCalls: data.tool_calls || data.toolCalls || [],
        });
      }
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || 'Request failed';
      toast.error(msg);
      addMessage({ role: 'assistant', content: `Error: ${msg}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopyAll = () => {
    const text = messages.map((m) => `${m.role}: ${m.content}`).join('\n\n');
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const modeLabels = { chat: 'Chat', object: 'Structured Output', tools: 'Tools' };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-[var(--border)] shrink-0 bg-[var(--background)]">
        <span className="text-base font-semibold text-[var(--foreground)]">{modeLabels[mode]}</span>
        <div className="flex gap-1.5">
          {messages.length > 0 && (
            <>
              <Button variant="ghost" size="icon" onClick={handleCopyAll} title="Copy all">
                <Copy size={18} />
              </Button>
              <Button variant="ghost" size="icon" onClick={clearMessages} title="Clear chat">
                <Trash2 size={18} />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 md:px-12 lg:px-20 py-8">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-center">
              <MessageCircle size={28} className="text-[var(--muted)]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--foreground)] mb-2">Start a conversation</p>
              <p className="text-base text-[var(--muted-foreground)]">Send a message to begin</p>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="flex items-center gap-2 px-5 py-4 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border)]">
                  <span className="w-2 h-2 bg-[var(--muted-foreground)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-[var(--muted-foreground)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-[var(--muted-foreground)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input area — ChatGPT style */}
      <div className="shrink-0 px-6 md:px-12 lg:px-20 pb-6 pt-3">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-3 rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-elevated)] focus-within:border-[var(--primary)] focus-within:shadow-[var(--shadow-glow)] transition-all duration-200 p-4">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
              }}
              onKeyDown={handleKeyDown}
              placeholder="Message…"
              disabled={isLoading}
              rows={1}
              className="!border-0 !shadow-none !ring-0 !bg-transparent !p-0 text-base overflow-hidden flex-1 !outline-none"
              style={{ minHeight: '28px', maxHeight: '160px' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="shrink-0 w-10 h-10 rounded-xl bg-[var(--primary)] text-white flex items-center justify-center hover:brightness-110 transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

