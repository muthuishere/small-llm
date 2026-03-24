/**
 * models.js — Named constants for browser-side MLC model IDs.
 *
 * Use these with LLMProvider or useWebLLM instead of raw model ID strings:
 *
 *   import { models } from '@small-llm/react';
 *   <LLMProvider model={models.Qwen2_5_0_5B}>...</LLMProvider>
 */

export const models = {
  /**
   * Qwen 2.5 0.5B Instruct — lightweight model for tool-calling tasks.
   * Downloads once (~300 MB) and is cached in browser Cache Storage.
   */
  Qwen2_5_0_5B: 'Qwen2.5-0.5B-Instruct-q4f32_1-MLC',

  /**
   * Qwen 2.5 3B Instruct — better reasoning, larger download (~1.5 GB).
   */
  Qwen2_5_3B: 'Qwen2.5-3B-Instruct-q4f32_1-MLC',
};
