/**
 * webllm.test.js — unit tests for the browser-side WebLLM service.
 *
 * We mock @mlc-ai/web-llm so tests run without WebGPU.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock @mlc-ai/web-llm before importing anything from our service
// ---------------------------------------------------------------------------
vi.mock('@mlc-ai/web-llm', () => {
  const mockCreate = vi.fn();
  const mockEngine = {
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  };

  return {
    CreateMLCEngine: vi.fn().mockResolvedValue(mockEngine),
    // Expose internals so tests can configure responses
    _mockCreate: mockCreate,
    _mockEngine: mockEngine,
  };
});

import * as WebLLM from '@mlc-ai/web-llm';
import {
  initEngine,
  isEngineReady,
  resetEngine,
  browserChat,
  browserChatWithObject,
  browserChatWithTools,
} from '../services/webllm';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Configure the mock engine to return a specific completion */
function mockResponse(content, tokens = 20) {
  WebLLM._mockCreate.mockResolvedValue({
    choices: [{ message: { role: 'assistant', content } }],
    usage: { total_tokens: tokens },
  });
}

/** Chain responses: first call returns [0], second [1], etc. */
function mockResponses(...responses) {
  let chain = WebLLM._mockCreate;
  for (const [content, tokens = 10] of responses) {
    chain = chain.mockResolvedValueOnce({
      choices: [{ message: { role: 'assistant', content } }],
      usage: { total_tokens: tokens },
    });
  }
}

/** Initialize engine + prime mock response */
async function initWithResponse(content = 'ok', tokens = 10) {
  mockResponse(content, tokens);
  return initEngine();
}

beforeEach(() => {
  resetEngine();
  WebLLM._mockCreate.mockReset();
  WebLLM.CreateMLCEngine.mockReset();
  WebLLM.CreateMLCEngine.mockResolvedValue(WebLLM._mockEngine);
});

// ---------------------------------------------------------------------------
// initEngine
// ---------------------------------------------------------------------------

describe('initEngine', () => {
  it('creates engine on first call', async () => {
    mockResponse('hi');
    await initEngine();
    expect(WebLLM.CreateMLCEngine).toHaveBeenCalledOnce();
    expect(isEngineReady()).toBe(true);
  });

  it('reuses engine on subsequent calls (no second CreateMLCEngine call)', async () => {
    mockResponse('hi');
    await initEngine();
    await initEngine();
    expect(WebLLM.CreateMLCEngine).toHaveBeenCalledOnce();
  });

  it('calls onProgress callback', async () => {
    const progress = { text: 'Loading…', progress: 0.5 };
    WebLLM.CreateMLCEngine.mockImplementation(async (_model, opts) => {
      opts?.initProgressCallback?.(progress);
      return WebLLM._mockEngine;
    });
    const onProgress = vi.fn();
    await initEngine(onProgress);
    expect(onProgress).toHaveBeenCalledWith(progress);
  });
});

// ---------------------------------------------------------------------------
// browserChat
// ---------------------------------------------------------------------------

describe('browserChat', () => {
  beforeEach(async () => {
    await initWithResponse();
  });

  it('returns response and token count', async () => {
    mockResponse('Hello back!', 15);
    const result = await browserChat('Hello');
    expect(result.response).toBe('Hello back!');
    expect(result.tokens_used).toBe(15);
  });

  it('includes context as system message', async () => {
    mockResponse('I can help.');
    await browserChat('Help me', [], 'You are a helpful assistant.');
    const call = WebLLM._mockCreate.mock.calls[0][0];
    const systemMsg = call.messages.find((m) => m.role === 'system');
    expect(systemMsg?.content).toBe('You are a helpful assistant.');
  });

  it('includes history in messages', async () => {
    mockResponse('Sure.');
    const history = [{ role: 'user', content: 'Hi' }, { role: 'assistant', content: 'Hey' }];
    await browserChat('Next?', history, '');
    const call = WebLLM._mockCreate.mock.calls[0][0];
    expect(call.messages.some((m) => m.content === 'Hi')).toBe(true);
  });

  it('returns model name in response', async () => {
    mockResponse('reply');
    const result = await browserChat('test');
    expect(typeof result.model).toBe('string');
    expect(result.model.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// browserChatWithObject
// ---------------------------------------------------------------------------

describe('browserChatWithObject', () => {
  beforeEach(async () => {
    await initWithResponse();
  });

  it('parses valid JSON response', async () => {
    mockResponse('{"name":"Alice","age":28}');
    const result = await browserChatWithObject('Alice, 28', { name: 'string', age: 'number' });
    expect(result.result).toEqual({ name: 'Alice', age: 28 });
  });

  it('strips markdown code fences', async () => {
    mockResponse('```json\n{"name":"Bob","age":35}\n```');
    const result = await browserChatWithObject('Bob, 35', { name: 'string', age: 'number' });
    expect(result.result).toEqual({ name: 'Bob', age: 35 });
  });

  it('returns raw string when JSON is unparseable', async () => {
    mockResponse('not json at all');
    const result = await browserChatWithObject('test', { x: 'string' });
    // result.result is the raw string since JSON.parse failed
    expect(result.result).toBeDefined();
  });

  it('injects few-shot examples as user/assistant turns', async () => {
    mockResponse('{"name":"Carol"}');
    const examples = [{ input: 'Alice', output: { name: 'Alice' } }];
    await browserChatWithObject('Carol', { name: 'string' }, examples);
    const call = WebLLM._mockCreate.mock.calls[0][0];
    const roles = call.messages.map((m) => m.role);
    expect(roles).toContain('system');
    // few-shot assistant turn should appear before final user turn
    const assistantIdx = roles.indexOf('assistant');
    expect(assistantIdx).toBeGreaterThan(0);
  });

  it('includes schema in system prompt', async () => {
    mockResponse('{}');
    const schema = { name: 'string' };
    await browserChatWithObject('test', schema);
    const call = WebLLM._mockCreate.mock.calls[0][0];
    const sys = call.messages.find((m) => m.role === 'system');
    expect(sys.content).toContain(JSON.stringify(schema));
  });
});

// ---------------------------------------------------------------------------
// browserChatWithTools
// ---------------------------------------------------------------------------

describe('browserChatWithTools', () => {
  beforeEach(async () => {
    await initWithResponse();
  });

  it('returns response with no tool calls when none triggered', async () => {
    mockResponse('No tools needed.');
    const result = await browserChatWithTools('Hello', ['calculator'], '');
    expect(result.response).toBe('No tools needed.');
    expect(result.tool_calls).toHaveLength(0);
  });

  it('executes calculator tool call and does follow-up', async () => {
    mockResponses(
      ['Let me calculate.\nTOOL_CALL: calculator(6*7)', 10],
      ['6 times 7 is 42.', 12],
    );
    const result = await browserChatWithTools('What is 6*7?', ['calculator'], '');
    expect(result.tool_calls).toHaveLength(1);
    expect(result.tool_calls[0].tool).toBe('calculator');
    expect(result.tool_calls[0].input).toBe('6*7');
    expect(result.tool_calls[0].output).toBe('42');
    expect(result.response).toBe('6 times 7 is 42.');
    expect(result.tokens_used).toBe(22);
  });

  it('ignores tools not in the allowed list', async () => {
    mockResponse('TOOL_CALL: weather(London)');
    const result = await browserChatWithTools('Weather?', ['calculator'], '');
    // weather not in allowed list → no tool calls recorded
    expect(result.tool_calls).toHaveLength(0);
  });

  it('executes datetime tool', async () => {
    mockResponses(
      ['TOOL_CALL: datetime()', 8],
      ["Today is a good day.", 10],
    );
    const result = await browserChatWithTools("What's today?", ['datetime'], '');
    expect(result.tool_calls).toHaveLength(1);
    expect(result.tool_calls[0].tool).toBe('datetime');
    expect(result.tool_calls[0].output).toMatch(/Date:/);
  });

  it('executes weather tool', async () => {
    mockResponses(
      ['TOOL_CALL: weather(Paris)', 8],
      ["It's nice in Paris.", 10],
    );
    const result = await browserChatWithTools('Weather in Paris?', ['weather'], '');
    expect(result.tool_calls[0].output).toContain('Paris');
  });

  it('sums tokens across initial and follow-up completions', async () => {
    mockResponses(['TOOL_CALL: calculator(2+2)', 5], ['The answer is 4.', 7]);
    const result = await browserChatWithTools('2+2?', ['calculator'], '');
    expect(result.tokens_used).toBe(12);
  });
});

