# small-llm / React

React hooks for running small language models — in the browser via WebGPU or through a Go backend server. No cloud, no API keys.

## Installation

```bash
npm install @small-llm/react
```

### Peer Dependencies

| Package | Required | Notes |
|---|---|---|
| `react` >= 18 | Yes | |
| `@mlc-ai/web-llm` | No | Only needed for browser mode (`useWebLLM`) |

```bash
# For browser mode
npm install @mlc-ai/web-llm
```

## Quick Start — Server Mode

Requires the Go backend running on `localhost:8080`.

```jsx
import { LLMProvider, useLLM } from '@small-llm/react';

function App() {
  return (
    <LLMProvider serverURL="http://localhost:8080">
      <Chat />
    </LLMProvider>
  );
}

function Chat() {
  const { ask, isLoading, error } = useLLM();
  const [answer, setAnswer] = useState('');

  const handleAsk = async () => {
    const response = await ask('What is the capital of France?');
    setAnswer(response);
  };

  return (
    <div>
      <button onClick={handleAsk} disabled={isLoading}>Ask</button>
      {error && <p>Error: {error.message}</p>}
      <p>{answer}</p>
    </div>
  );
}
```

## Browser Mode — useWebLLM

Runs entirely in the browser using WebGPU. No backend needed.

```jsx
import { LLMProvider, useWebLLM, models } from '@small-llm/react';

function App() {
  return (
    <LLMProvider model={models.Qwen2_5_0_5B}>
      <Chat />
    </LLMProvider>
  );
}

function Chat() {
  const { ask, isLoading, isReady, downloadProgress, downloadText } = useWebLLM();
  const [answer, setAnswer] = useState('');

  if (!isReady) {
    return <p>Loading model… {Math.round(downloadProgress * 100)}%</p>;
  }

  const handleAsk = async () => {
    const response = await ask('Explain quantum computing simply');
    setAnswer(response);
  };

  return (
    <div>
      <button onClick={handleAsk} disabled={isLoading}>Ask</button>
      <p>{answer}</p>
    </div>
  );
}
```

The model (~300 MB) downloads once and is cached in browser storage.

## Streaming

Both `useLLM` and `useWebLLM` support streaming via `askStream`:

```jsx
const { askStream } = useLLM();
// or: const { askStream } = useWebLLM();

const [text, setText] = useState('');

const handleStream = async () => {
  setText('');
  await askStream('Tell me a story', (token) => {
    setText(prev => prev + token);
  });
};
```

## Chat State — useChat

Manages conversation history with auto-incrementing message IDs:

```jsx
import { useLLM, useChat } from '@small-llm/react';

function ChatUI() {
  const { ask } = useLLM();
  const { messages, send, clear, isLoading } = useChat();

  const handleSubmit = async (text) => {
    await send(text, ask);
  };

  return (
    <div>
      {messages.map(m => (
        <div key={m.id}>
          <strong>{m.role}:</strong> {m.content}
        </div>
      ))}
      <button onClick={clear}>Clear</button>
    </div>
  );
}
```

Each message has the shape `{ id, role, content, timestamp }`.

## Tool Calling — useTools

Access built-in tools and register custom ones:

```jsx
import { useTools } from '@small-llm/react';

function ToolDemo() {
  const { call, result, availableTools } = useTools();

  return (
    <div>
      <p>Available: {availableTools.join(', ')}</p>
      <button onClick={() => call('calculator', '15 * 7')}>Calculate</button>
      <button onClick={() => call('datetime')}>Get Date</button>
      {result && <p>Result: {result}</p>}
    </div>
  );
}
```

### Custom Tools

```jsx
const customTools = {
  search: {
    description: 'search(query) – searches the product catalog',
    handler: async (input) => {
      const results = await fetchProducts(input);
      return JSON.stringify(results);
    },
  },
};

const { call, availableTools, register } = useTools(customTools);
// availableTools: ['calculator', 'datetime', 'weather', 'search']

// Register at runtime
register('translate', 'translate(text) – translates to Spanish', async (input) => {
  return await translateToSpanish(input);
});
```

### Built-in Tools

| Tool | Description |
|---|---|
| `calculator` | Evaluates arithmetic expressions (`15*7`, `2^8`) |
| `datetime` | Returns current date and UTC time |
| `weather` | Returns a mock weather report for a city |

## Models

```js
import { models } from '@small-llm/react';
```

| Constant | MLC Model ID | Size |
|---|---|---|
| `models.Qwen2_5_0_5B` | `Qwen2.5-0.5B-Instruct-q4f32_1-MLC` | ~300 MB |
| `models.Qwen2_5_3B` | `Qwen2.5-3B-Instruct-q4f32_1-MLC` | ~1.5 GB |

## API Reference

### `<LLMProvider>`

| Prop | Type | Default | Description |
|---|---|---|---|
| `model` | `string` | `models.Qwen2_5_0_5B` | MLC model ID for browser mode |
| `context` | `string` | `''` | System context injected into every prompt |
| `serverURL` | `string` | `'http://localhost:8080'` | Go backend URL for server mode |

### `useLLM()`

Returns server-mode inference functions. Reads `serverURL` and `context` from `LLMProvider`.

| Field | Type | Description |
|---|---|---|
| `ask` | `(message, history?) → Promise<string>` | Single-turn completion |
| `askStream` | `(message, onToken, history?) → Promise<void>` | Streaming completion |
| `isLoading` | `boolean` | Request in progress |
| `error` | `Error \| null` | Last error |

### `useWebLLM()`

Returns browser-mode inference functions. Reads `model` and `context` from `LLMProvider`. Auto-initializes the engine on first `ask`/`askStream` call.

| Field | Type | Description |
|---|---|---|
| `ask` | `(message, history?) → Promise<string>` | Single-turn completion |
| `askStream` | `(message, onToken, history?) → Promise<void>` | Streaming completion |
| `isLoading` | `boolean` | Request in progress |
| `isReady` | `boolean` | Engine initialized and ready |
| `error` | `Error \| null` | Last error |
| `downloadProgress` | `number` | Download progress 0–1 |
| `downloadText` | `string` | Human-readable progress text |
| `initEngine` | `() → Promise<void>` | Manually trigger engine initialization |

### `useChat()`

Manages conversation state. Pass `ask` from `useLLM` or `useWebLLM` into `send`.

| Field | Type | Description |
|---|---|---|
| `messages` | `Array<{ id, role, content, timestamp }>` | Conversation history |
| `send` | `(message, askFn) → Promise<void>` | Send message and get reply |
| `clear` | `() → void` | Clear conversation |
| `isLoading` | `boolean` | Waiting for response |

### `useTools(customTools?)`

Tool registry with built-in calculator, datetime, and weather.

| Field | Type | Description |
|---|---|---|
| `call` | `(name, input?) → Promise<string>` | Invoke a tool |
| `result` | `string \| null` | Output of last `call()` |
| `availableTools` | `string[]` | All registered tool names |
| `register` | `(name, description, handler) → void` | Register a tool at runtime |

Custom tools object shape:

```js
{
  toolName: {
    description: 'tool(input) – what it does',
    handler: async (input) => result,
  }
}
```

## TypeScript

`@small-llm/react` is a JavaScript library. TypeScript type definitions are not included yet.

## Browser Requirements

Browser mode (`useWebLLM`) requires WebGPU support:
- Chrome 113+
- Edge 113+

## License

MIT
