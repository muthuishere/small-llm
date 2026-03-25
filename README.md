# small-llm

Run small language models locally. **Go library** + **React hooks** — no cloud, no API keys.

| | Go | React |
|---|---|---|
| **Install** | `go get github.com/muthuishere/small-llm/go` | `npm install @small-llm/react` |
| **Mode** | Server-side (llama.cpp subprocess) | Server or browser (WebGPU) |
| **Docs** | [go/README.md](go/README.md) | [packages/react/README.md](packages/react/README.md) |

## What You Get

- **Chat** — single-turn and conversational
- **Streaming** — token-by-token output
- **Structured output** — JSON extraction into Go structs or JS objects
- **Tool calling** — built-in (calculator, datetime, weather) + custom tools
- **Context management** — persistent system prompts

## Quick Start — Go

```go
ai, err := llm.New() // downloads model + starts llama-server
defer ai.Close()

answer, err := ai.Ask(ctx, "What is the capital of France?")
```

→ Full docs: **[go/README.md](go/README.md)**

## Quick Start — React

```jsx
import { LLMProvider, useLLM } from '@small-llm/react';

<LLMProvider serverURL="http://localhost:8080">
  <App />
</LLMProvider>

// In a component:
const { ask, isLoading } = useLLM();
const answer = await ask('What is the capital of France?');
```

For browser-only mode (no server needed):

```jsx
import { useWebLLM, models } from '@small-llm/react';

const { ask, downloadProgress, isReady } = useWebLLM();
```

→ Full docs: **[packages/react/README.md](packages/react/README.md)**

## Example App

The `frontend/` directory is a full demo application showing both server and browser modes with chat, structured output, and tool calling.

```bash
# Start the Go backend
task backend

# Start the React dev server
task frontend
```

Open [http://localhost:5173](http://localhost:5173) and choose a mode.

## Models

| Constant | Size | Notes |
|---|---|---|
| Qwen 2.5 0.5B | ~394 MB (server) / ~300 MB (browser) | Default — fast, good for tool calling |
| Qwen 2.5 3B | ~2 GB (server) / ~1.5 GB (browser) | Better reasoning |

Models are downloaded automatically on first use and cached locally.

## Monorepo Structure

```
small-llm/
├── go/                    # Go library (github.com/muthuishere/small-llm/go)
│   ├── llm/               #   Core: AI, options, tools, errors
│   └── models/            #   Model constants
├── packages/
│   └── react/             # React library (@small-llm/react)
│       └── src/           #   Hooks: useLLM, useWebLLM, useChat, useTools
├── backend/               # Example Go backend server (uses go/llm)
├── frontend/              # Example React app (uses @small-llm/react)
├── config/                # Shared configuration
└── Taskfile.yml           # Dev commands
```

## Development

Requires [Task](https://taskfile.dev) (`brew install go-task`), Go 1.25+, Node.js 18+.

```bash
task                # Start backend + frontend (dev)
task install        # npm install for frontend
task build          # Build backend binary + frontend bundle
task test           # Run Go unit tests
task tidy           # go mod tidy
task clean          # Remove build artefacts
```

## Backend API

The example backend exposes these endpoints:

| Endpoint | Description |
|---|---|
| `GET /api/health` | Health check |
| `GET /api/status` | Model/server readiness |
| `POST /api/chat` | Conversational chat |
| `POST /api/chatwithobject` | Structured JSON extraction |
| `POST /api/chatwithtools` | Tool-augmented chat |

## License

MIT