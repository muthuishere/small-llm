import { useState, useCallback } from 'react';

/**
 * useChat — conversation state management hook.
 *
 * Replaces the Zustand store in library consumers.  Pairs with useLLM or
 * useWebLLM to provide a full chat UI with automatic history tracking.
 *
 * @returns {{
 *   messages:  Array<{id: number, role: string, content: string, timestamp: number}>,
 *   send:      (message: string, sendFn: (msg: string, history: object[]) => Promise<string>) => Promise<void>,
 *   clear:     () => void,
 *   isLoading: boolean,
 * }}
 *
 * @example
 *   const { ask } = useLLM();
 *   const { messages, send, clear, isLoading } = useChat();
 *
 *   // In a form submit handler:
 *   await send(userInput, ask);
 */
export function useChat() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const nextIdRef = useRef(1);

  /** Append a message to the conversation. */
  const addMessage = useCallback((role, content) => {
    const id = nextIdRef.current++;
    setMessages((prev) => [
      ...prev,
      { id, role, content, timestamp: Date.now() },
    ]);
  }, []);

  /**
   * send — adds the user message, calls sendFn with history, adds the
   * assistant reply.
   *
   * @param {string}   message  - the user's message
   * @param {Function} sendFn   - e.g. the `ask` function from useLLM/useWebLLM
   */
  const send = useCallback(
    async (message, sendFn) => {
      if (isLoading) return;
      addMessage('user', message);
      setIsLoading(true);
      try {
        // Build history from current messages (excluding the one we just added).
        const history = messages.map((m) => ({ role: m.role, content: m.content }));
        const reply = await sendFn(message, history);
        addMessage('assistant', reply);
      } catch (e) {
        addMessage('assistant', `Error: ${e.message}`);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, messages, addMessage],
  );

  /** Clear all messages and reset the conversation. */
  const clear = useCallback(() => setMessages([]), []);

  return { messages, send, clear, isLoading };
}
