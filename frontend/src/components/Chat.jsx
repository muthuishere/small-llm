import { useRef, useEffect, useState } from 'react';
import { Send, Trash2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import useChatStore from '../store/chatStore';
import { sendChat, sendChatWithObject, sendChatWithTools } from '../services/api';
import { ChatMessage } from './ChatMessage';
import { Button } from './ui/Button';
import { Spinner } from './ui/Spinner';

export function Chat() {
  const { messages, mode, selectedTools, schema, fewShotExamples, context, isLoading, addMessage, clearMessages, setLoading } = useChatStore();
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
    addMessage({ role: 'user', content: text, type: 'text' });
    setLoading(true);

    try {
      let response;
      if (mode === 'chat') {
        response = await sendChat(text, buildHistory(), context);
        const data = response.data;
        addMessage({
          role: 'assistant',
          content: data.response || data.message || JSON.stringify(data),
          type: 'text',
        });
      } else if (mode === 'object') {
        response = await sendChatWithObject(text, schema, fewShotExamples);
        const data = response.data;
        addMessage({
          role: 'assistant',
          content: data.result ?? data.response ?? data,
          type: 'json',
        });
      } else if (mode === 'tools') {
        response = await sendChatWithTools(text, selectedTools, context);
        const data = response.data;
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

  const modeLabels = { chat: 'Chat', object: 'Structured Output', tools: 'Chat with Tools' };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div>
          <h2 className="font-semibold text-[var(--foreground)]">{modeLabels[mode]}</h2>
          <p className="text-xs text-[var(--muted-foreground)]">
            {mode === 'chat' && 'Conversational chat'}
            {mode === 'object' && 'Returns structured JSON objects'}
            {mode === 'tools' && `Tools: ${selectedTools.join(', ') || 'none selected'}`}
          </p>
        </div>
        <div className="flex gap-2">
          {messages.length > 0 && (
            <>
              <Button variant="ghost" size="icon" onClick={handleCopyAll} title="Copy all">
                <Copy size={15} />
              </Button>
              <Button variant="ghost" size="icon" onClick={clearMessages} title="Clear chat">
                <Trash2 size={15} />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-[var(--muted-foreground)]">
            <div className="w-16 h-16 rounded-full bg-[var(--surface-elevated)] flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="font-medium">Start a conversation</p>
            <p className="text-sm mt-1">Send a message to begin chatting with the AI</p>
          </div>
        )}
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-center shrink-0">
              <Spinner size="sm" />
            </div>
            <div className="bg-[var(--surface)] border border-[var(--border)] border-l-2 border-l-blue-500 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1 items-center">
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[var(--border)] p-4">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
            onKeyDown={handleKeyDown}
            placeholder={`Message${mode === 'tools' ? ' (AI will use selected tools)' : ''}... (Enter to send, Shift+Enter for newline)`}
            disabled={isLoading}
            rows={1}
            className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none overflow-hidden transition-colors disabled:opacity-50"
            style={{ minHeight: '44px', maxHeight: '120px' }}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-11 w-11 shrink-0 rounded-xl"
          >
            {isLoading ? <Spinner size="sm" /> : <Send size={16} />}
          </Button>
        </div>
        <p className="text-[10px] text-[var(--muted)] mt-1.5 px-1">
          Enter ↵ to send · Shift+Enter for newline
        </p>
      </div>
    </div>
  );
}
