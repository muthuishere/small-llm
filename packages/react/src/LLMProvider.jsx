import { LLMContext } from './LLMContext.jsx';
import { models } from './models.js';

/**
 * LLMProvider wraps your component tree and provides model/context
 * configuration to all small-llm hooks below it.
 *
 * @param {object}   props
 * @param {string}   [props.model]      - MLC model ID; defaults to Qwen2_5_0_5B
 * @param {string}   [props.context]    - system context text injected into every prompt
 * @param {string}   [props.serverURL]  - Go backend base URL (default: http://localhost:8080)
 * @param {React.ReactNode} props.children
 *
 * @example
 *   <LLMProvider model={models.Qwen2_5_0_5B} context={productCatalog}>
 *     <App />
 *   </LLMProvider>
 */
export function LLMProvider({
  model = models.Qwen2_5_0_5B,
  context = '',
  serverURL = 'http://localhost:8080',
  children,
}) {
  return (
    <LLMContext.Provider value={{ model, context, serverURL }}>
      {children}
    </LLMContext.Provider>
  );
}
