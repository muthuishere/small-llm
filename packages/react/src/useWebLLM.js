import { useState, useCallback, useRef } from 'react';
import { useLLMContext } from './LLMContext.jsx';

/**
 * useWebLLM — browser-side LLM inference hook (no server required).
 *
 * Wraps @mlc-ai/web-llm engine management, exposing a clean API for ask,
 * streaming, and download-progress tracking.
 *
 * @returns {{
 *   ask:              (message: string, history?: object[]) => Promise<string>,
 *   askStream:        (message: string, onToken: (token: string) => void, history?: object[]) => Promise<void>,
 *   isLoading:        boolean,
 *   isReady:          boolean,
 *   error:            Error|null,
 *   downloadProgress: number,   // 0–1
 *   downloadText:     string,
 *   initEngine:       () => Promise<void>,
 * }}
 *
 * @example
 *   const { ask, isLoading, downloadProgress } = useWebLLM();
 *   const answer = await ask('What is 2+2?');
 */
export function useWebLLM() {
  const { model, context } = useLLMContext();

  const engineRef = useRef(null);
  const initPromiseRef = useRef(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadText, setDownloadText] = useState('');

  /** Lazily initialise (or reuse) the WebLLM engine. */
  const initEngine = useCallback(async () => {
    if (engineRef.current) return;
    if (initPromiseRef.current) {
      await initPromiseRef.current;
      return;
    }

    // Dynamically import so the library doesn't hard-depend on @mlc-ai/web-llm
    // when users only need server mode.
    let webllm;
    try {
      webllm = await import('@mlc-ai/web-llm');
    } catch (e) {
      throw new Error(
        'useWebLLM requires @mlc-ai/web-llm — install it with: npm install @mlc-ai/web-llm',
      );
    }

    initPromiseRef.current = webllm.CreateMLCEngine(model, {
      initProgressCallback: (p) => {
        setDownloadProgress(p.progress ?? 0);
        setDownloadText(p.text ?? '');
      },
    });

    try {
      engineRef.current = await initPromiseRef.current;
      setIsReady(true);
      setDownloadProgress(1);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      console.error('[useWebLLM] engine init failed:', err);
      throw err;
    }
  }, [model]);

  /** Build the messages array from context + history + user message. */
  function buildMessages(message, history = []) {
    const msgs = [];
    if (context) msgs.push({ role: 'system', content: context });
    history.forEach((m) => msgs.push({ role: m.role, content: String(m.content) }));
    msgs.push({ role: 'user', content: message });
    return msgs;
  }

  /**
   * ask — non-streaming completion.
   * Automatically initialises the engine on first call.
   */
  const ask = useCallback(
    async (message, history = []) => {
      if (isLoading) throw new Error('Already loading — check isLoading before calling ask');
      setError(null);
      setIsLoading(true);
      try {
        await initEngine();
        const res = await engineRef.current.chat.completions.create({
          messages: buildMessages(message, history),
          temperature: 0.7,
          max_tokens: 1024,
          stream: false,
        });
        return res.choices[0].message.content;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        console.error('[useWebLLM] ask failed:', err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, initEngine, context], // eslint-disable-line react-hooks/exhaustive-deps
  );

  /**
   * askStream — streaming completion.
   * Calls onToken for each token as it arrives.
   */
  const askStream = useCallback(
    async (message, onToken, history = []) => {
      if (isLoading) throw new Error('Already loading — check isLoading before calling askStream');
      setError(null);
      setIsLoading(true);
      try {
        await initEngine();
        const stream = await engineRef.current.chat.completions.create({
          messages: buildMessages(message, history),
          temperature: 0.7,
          max_tokens: 1024,
          stream: true,
        });
        for await (const chunk of stream) {
          const token = chunk.choices[0]?.delta?.content;
          if (token) onToken(token);
        }
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        console.error('[useWebLLM] askStream failed:', err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, initEngine, context], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return { ask, askStream, isLoading, isReady, error, downloadProgress, downloadText, initEngine };
}
