import { createContext, useContext } from 'react';

/**
 * LLMContext carries the shared configuration for all hooks in the tree.
 *
 * Shape:
 *   {
 *     model: string,           // MLC model ID (from models.*)
 *     context: string,         // system context text
 *     serverURL: string,       // base URL for the Go backend (server mode)
 *   }
 */
export const LLMContext = createContext({
  model: 'Qwen2.5-0.5B-Instruct-q4f32_1-MLC',
  context: '',
  serverURL: 'http://localhost:8080',
});

/** Access the nearest LLMProvider's configuration. */
export function useLLMContext() {
  return useContext(LLMContext);
}
