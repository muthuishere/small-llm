/**
 * @small-llm/react — React hooks and components for local LLM inference.
 *
 * Browser mode (WebLLM, WebGPU required):
 *   import { useWebLLM, LLMProvider, models } from '@small-llm/react';
 *
 * Server mode (Go backend):
 *   import { useLLM, LLMProvider } from '@small-llm/react';
 *
 * Conversation management:
 *   import { useChat } from '@small-llm/react';
 *
 * Tool registration:
 *   import { useTools } from '@small-llm/react';
 */

export { LLMProvider } from './LLMProvider.jsx';
export { LLMContext, useLLMContext } from './LLMContext.jsx';
export { useWebLLM } from './useWebLLM.js';
export { useLLM } from './useLLM.js';
export { useChat } from './useChat.js';
export { useTools } from './useTools.js';
export { models } from './models.js';
