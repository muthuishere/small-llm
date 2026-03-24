import { useState, useCallback } from 'react';
import { useLLMContext } from './LLMContext.jsx';

/**
 * useLLM — server-mode LLM hook.
 *
 * Calls the Go backend API (POST /api/chat) for inference.
 * Works alongside the existing `backend/` Go server.
 *
 * @returns {{
 *   ask:       (message: string, history?: object[]) => Promise<string>,
 *   askStream: (message: string, onToken: (token: string) => void, history?: object[]) => Promise<void>,
 *   isLoading: boolean,
 *   error:     Error|null,
 * }}
 *
 * @example
 *   const { ask, isLoading } = useLLM();
 *   const answer = await ask('What is 2+2?');
 */
export function useLLM() {
  const { serverURL, context } = useLLMContext();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * ask — non-streaming completion via the Go backend.
   */
  const ask = useCallback(
    async (message, history = []) => {
      if (isLoading) throw new Error('Already loading — check isLoading before calling ask');
      setError(null);
      setIsLoading(true);
      try {
        const res = await fetch(`${serverURL}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, history, context }),
        });
        if (!res.ok) {
          const body = await res.text();
          throw new Error(`Server error ${res.status}: ${body}`);
        }
        const data = await res.json();
        return data.response;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        console.error('[useLLM] ask failed:', err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, serverURL, context],
  );

  /**
   * askStream — streaming completion via the Go backend.
   * Calls onToken for each SSE token as it arrives.
   *
   * Note: the Go backend must expose a streaming endpoint for this to work.
   * Falls back to ask() and delivers the full response as a single token if
   * the backend does not support streaming.
   */
  const askStream = useCallback(
    async (message, onToken, history = []) => {
      if (isLoading) throw new Error('Already loading — check isLoading before calling askStream');
      setError(null);
      setIsLoading(true);
      try {
        const res = await fetch(`${serverURL}/api/chat/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, history, context }),
        });

        if (!res.ok) {
          // Graceful fallback: use non-streaming endpoint directly (avoid calling
          // ask() which would clash with the isLoading guard already set above).
          const fallbackRes = await fetch(`${serverURL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, history, context }),
          });
          if (!fallbackRes.ok) {
            const body = await fallbackRes.text();
            throw new Error(`Server error ${fallbackRes.status}: ${body}`);
          }
          const data = await fallbackRes.json();
          onToken(data.response);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const payload = line.slice(6);
            if (payload === '[DONE]') return;
            try {
              const chunk = JSON.parse(payload);
              const token = chunk.choices?.[0]?.delta?.content;
              if (token) onToken(token);
            } catch (_) {
              // skip malformed chunk
            }
          }
        }
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        console.error('[useLLM] askStream failed:', err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, serverURL, context],
  );

  return { ask, askStream, isLoading, error };
}
