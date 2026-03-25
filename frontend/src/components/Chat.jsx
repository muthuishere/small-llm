import { useRef, useEffect, useState } from 'react';
import { Send, Trash2, Copy } from 'lucide-react';
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
  const bottomRef   = useRef(null);
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
      <div className="flex items-center justify-between px-8 py-5 border-b border-[var(--border)]">
        <h2 className="text-lg font-bold text-[var(--foreground)]">{modeLabels[mode]}</h2>
        <div className="flex gap-2">
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
      <div className="flex-1 overflow-y-auto px-8 md:px-12 lg:px-16 py-8 space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-2xl md:text-3xl font-bold text-[var(--foreground)] mb-3">Start a conversation</p>
            <p className="text-lg text-[var(--muted-foreground)]">Send a message to begin</p>
          </div>
        )}
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-[var(--surface-elevated)]">
              <span className="w-2 h-2 bg-[var(--muted)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-[var(--muted)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-[var(--muted)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 px-6 md:px-10 lg:px-14 pb-5 pt-3">
        <div className="max-w-3xl mx-auto flex items-end gap-3 rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)] focus-within:border-[var(--primary)] focus-within:shadow-[var(--shadow-elevated)] transition-all px-4 py-3">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
            onKeyDown={handleKeyDown}
            placeholder="Message…"
            disabled={isLoading}
            rows={1}
            className="!border-0 !shadow-none !ring-0 !bg-transparent !p-0 text-base overflow-hidden flex-1"
            style={{ minHeight: '28px', maxHeight: '120px' }}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="h-9 w-9 shrink-0 rounded-lg"
          >
            <Send size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}

