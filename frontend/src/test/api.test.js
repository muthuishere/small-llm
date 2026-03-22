import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import axiosInstance, { sendChat, sendChatWithObject, sendChatWithTools, getStatus, getHealth } from '../services/api';

// Mock the specific axios instance used by api.js
let mock;

beforeEach(() => {
  mock = new MockAdapter(axiosInstance);
});

afterEach(() => {
  mock.restore();
});

// ---------------------------------------------------------------------------
// GET /api/health
// ---------------------------------------------------------------------------

describe('getHealth', () => {
  it('returns ok on success', async () => {
    mock.onGet('/api/health').reply(200, { status: 'ok' });
    const res = await getHealth();
    expect(res.data.status).toBe('ok');
  });
});

// ---------------------------------------------------------------------------
// GET /api/status
// ---------------------------------------------------------------------------

describe('getStatus', () => {
  it('returns status fields', async () => {
    const statusPayload = {
      model_downloaded: true,
      server_running: true,
      model_name: 'qwen2.5-0.5b',
    };
    mock.onGet('/api/status').reply(200, statusPayload);
    const res = await getStatus();
    expect(res.data.model_downloaded).toBe(true);
    expect(res.data.model_name).toBe('qwen2.5-0.5b');
  });
});

// ---------------------------------------------------------------------------
// POST /api/chat
// ---------------------------------------------------------------------------

describe('sendChat', () => {
  it('sends message and receives response', async () => {
    mock.onPost('/api/chat').reply(200, {
      response: 'Hello there!',
      tokens_used: 12,
      model: 'qwen2.5-0.5b',
    });
    const res = await sendChat('Hello', [], '');
    expect(res.data.response).toBe('Hello there!');
    expect(res.data.tokens_used).toBe(12);
  });

  it('sends history in the payload', async () => {
    const history = [{ role: 'user', content: 'Hi' }, { role: 'assistant', content: 'Hey' }];
    mock.onPost('/api/chat').reply((config) => {
      const body = JSON.parse(config.data);
      expect(body.history).toHaveLength(2);
      return [200, { response: 'ok', tokens_used: 5, model: 'qwen2.5-0.5b' }];
    });
    await sendChat('Next question', history, '');
  });

  it('sends context in the payload', async () => {
    mock.onPost('/api/chat').reply((config) => {
      const body = JSON.parse(config.data);
      expect(body.context).toBe('You are a helpful assistant.');
      return [200, { response: 'ok', tokens_used: 5, model: 'qwen2.5-0.5b' }];
    });
    await sendChat('Hi', [], 'You are a helpful assistant.');
  });

  it('throws on 500', async () => {
    mock.onPost('/api/chat').reply(500, { error: 'internal' });
    await expect(sendChat('test', [], '')).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// POST /api/chatwithobject
// ---------------------------------------------------------------------------

describe('sendChatWithObject', () => {
  it('sends message, schema, and few-shot examples', async () => {
    const schema = { name: 'string', age: 'number' };
    const examples = [{ input: 'Alice, 28', output: { name: 'Alice', age: 28 } }];
    mock.onPost('/api/chatwithobject').reply((config) => {
      const body = JSON.parse(config.data);
      expect(body.message).toBe('Bob, 35');
      expect(body.schema).toEqual(schema);
      expect(body.few_shot_examples).toHaveLength(1);
      return [200, { result: { name: 'Bob', age: 35 }, tokens_used: 40 }];
    });
    const res = await sendChatWithObject('Bob, 35', schema, examples);
    expect(res.data.result.name).toBe('Bob');
  });

  it('throws on 400', async () => {
    mock.onPost('/api/chatwithobject').reply(400, { error: 'missing field' });
    await expect(sendChatWithObject('', {}, [])).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// POST /api/chatwithtools
// ---------------------------------------------------------------------------

describe('sendChatWithTools', () => {
  it('sends message and tools list', async () => {
    mock.onPost('/api/chatwithtools').reply((config) => {
      const body = JSON.parse(config.data);
      expect(body.tools).toContain('calculator');
      return [
        200,
        {
          response: '42',
          tool_calls: [{ tool: 'calculator', input: '6*7', output: '42' }],
          tokens_used: 25,
        },
      ];
    });
    const res = await sendChatWithTools('What is 6*7?', ['calculator'], '');
    expect(res.data.tool_calls).toHaveLength(1);
    expect(res.data.tool_calls[0].output).toBe('42');
  });

  it('returns empty tool_calls when none triggered', async () => {
    mock.onPost('/api/chatwithtools').reply(200, {
      response: 'Sure!',
      tool_calls: [],
      tokens_used: 10,
    });
    const res = await sendChatWithTools('Hello', [], '');
    expect(res.data.tool_calls).toHaveLength(0);
  });
});
