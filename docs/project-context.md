# small-llm — Project Context

> For AI agents: This document provides complete context needed to understand, extend, or modify this project.

---

## What This Project Does

`small-llm` is a local LLM playground application. It runs **Qwen 2.5 0.5B Instruct** inference entirely on the user's machine — no cloud API, no internet required after initial download. It demonstrates two inference approaches:

1. **Server mode**: The Go backend manages a `llama-server` subprocess (llama.cpp). The React frontend sends HTTP requests to the Go API, which proxies them to llama-server.
2. **Browser mode**: The React frontend downloads the model directly into the browser and runs inference via WebGPU using `@mlc-ai/web-llm`. The Go backend is not involved in inference.

Both modes support three interaction patterns:
- **Chat** — conversational chat with history and optional system context
- **Structured Output** — strict JSON extraction given a user-defined schema + few-shot examples
- **Chat with Tools** — the LLM can invoke calculator, datetime, or weather tools mid-response

---

## Repository Structure

```
small-llm/
├── backend/                    # Go backend
│   ├── main.go                 # Entry point: sets up Gin routes, starts LLM manager
│   ├── config/config.go        # Constants + Config struct (ports, paths, model URL)
│   ├── handlers/               # HTTP handlers (one file per endpoint)
│   │   ├── chat.go             # POST /api/chat + GET /api/health
│   │   ├── chatwithobject.go   # POST /api/chatwithobject
│   │   └── chatwithtools.go    # POST /api/chatwithtools
│   ├── llm/                    # LLM infrastructure
│   │   ├── manager.go          # Downloads model/binary, starts llama-server subprocess
│   │   ├── client.go           # HTTP client for llama-server OpenAI-compatible API
│   │   ├── prompts.go          # Message builders (chat, object, tools)
│   │   └── downloader.go       # File/binary download utilities
│   ├── middleware/cors.go       # CORS middleware
│   └── tools/tools.go          # Tool registry: calculator, datetime, weather
│
├── frontend/                   # React frontend
│   └── src/
│       ├── App.jsx             # Router: / → Landing, /server → ServerPage, /browser → BrowserPage
│       ├── pages/
│       │   ├── Landing.jsx     # Mode selector landing page
│       │   ├── ServerPage.jsx  # Server inference UI (calls Go backend API)
│       │   └── BrowserPage.jsx # Browser inference UI (uses WebLLM)
│       ├── components/         # Shared UI components
│       │   ├── Chat.jsx        # Chat message list + input
│       │   ├── ChatMessage.jsx # Single message bubble
│       │   ├── ModeSelector.jsx# Chat/Structured/Tools tab switcher
│       │   ├── SchemaEditor.jsx# JSON schema editor for structured output
│       │   ├── ToolSelector.jsx# Tool checkbox selector
│       │   ├── StatusBar.jsx   # Model download/server startup progress
│       │   ├── JsonViewer.jsx  # Pretty-prints JSON responses
│       │   └── WebLLMStatus.jsx# WebLLM download/init progress
│       ├── services/
│       │   ├── api.js          # Axios client for Go backend API
│       │   └── webllm.js       # WebLLM engine wrapper
│       └── store/chatStore.js  # Zustand store (messages, mode, tools, schema, loading)
│
├── Taskfile.yml                # Task runner (dev, build, test, deploy)
├── Dockerfile                  # Multi-stage Docker build
├── docker-compose.test.yml     # Containerised test runner
├── config/                     # Kamal deploy configuration
└── docs/                       # Project documentation (this folder)
```

---

## Key Architectural Decisions

### 1. llama-server as subprocess (not library)
The backend spawns `llama-server` as a child process rather than embedding llama.cpp as a library. This means:
- The Go binary itself has no C/C++ build dependencies
- llama-server is auto-downloaded from GitHub Releases on first run
- Communication is over HTTP (localhost:8081) using the OpenAI-compatible `/v1/chat/completions` endpoint
- The backend polls `llama-server/health` up to 120 seconds on startup

### 2. Two separate inference paths
Server mode and browser mode are completely independent code paths:
- Server mode: `ServerPage.jsx` → `services/api.js` → Go backend → llama-server
- Browser mode: `BrowserPage.jsx` → `services/webllm.js` → WebLLM engine (in browser)
- They share the same UI components (Chat, ModeSelector, etc.) but call different services

### 3. Tool calling is prompt-based, not OpenAI function-calling
Tool use in `POST /api/chatwithtools` is implemented via prompt injection, not native function-calling:
- Tool descriptions are injected into the system prompt
- The LLM is instructed to emit `TOOL_CALL: <name>(<input>)` when it wants to call a tool
- The backend parses these with regex, executes tools, injects results, and calls the LLM again for final answer
- This works on small models that don't support native function-calling

### 4. Structured output via few-shot prompting
`POST /api/chatwithobject` does not use JSON schema enforcement or constrained decoding:
- A strict "respond with valid JSON only" system prompt is used
- Few-shot examples are injected as user/assistant turns
- Works well for simple schemas; complex schemas may produce invalid JSON

### 5. Model caching at `~/.small-llm/`
All persistent files (model GGUF and llama-server binary) are cached in `~/.small-llm/` in the user's home directory, separate from the project. This directory persists across `go run` invocations.

---

## Data Flow

### Server Mode Chat Request
```
User types message
  → ServerPage.jsx calls sendChat(message, history, context)
  → api.js: POST http://localhost:8080/api/chat
  → handlers/chat.go: Chat() handler
  → llm.BuildChatMessages(context, history, message)
  → llm.Client.Complete(msgs, maxTokens=512, temp=0.7)
  → HTTP POST http://localhost:8081/v1/chat/completions (OpenAI format)
  → llama-server inference on Qwen 2.5 0.5B
  → Response: { response, tokens_used, model }
```

### Server Mode Tool Call Request
```
User types message + selects tools
  → sendChatWithTools(message, ["calculator","datetime"])
  → POST /api/chatwithtools
  → tools.Descriptions(["calculator","datetime"]) → tool desc strings
  → llm.BuildToolMessages() injects tool descriptions into system prompt
  → First LLM call → may contain TOOL_CALL: calculator(15*7)
  → executeToolCalls() parses regex, runs tools.Execute()
  → If tools called: second LLM call with tool results injected
  → Response: { response, tool_calls: [{tool, input, output}], tokens_used }
```

### Browser Mode (WebLLM)
```
BrowserPage loads
  → webllm.js initializes WebLLM engine
  → Downloads Qwen 0.5B (q4f32_1-MLC) from CDN to browser cache
  → All inference runs in-browser via WebGPU
  → No network requests to Go backend
```

---

## Configuration Reference

### Backend (`backend/config/config.go`)

| Constant/Field | Value | Description |
|---|---|---|
| `BackendPort` | `8080` | Gin HTTP server port |
| `LlamaPort` | `8081` | llama-server internal port |
| `ContextSize` | `2048` | Model context window tokens |
| `ModelName` | `qwen2.5-0.5b-instruct-q4_k_m.gguf` | GGUF filename |
| `ModelURL` | HuggingFace URL | Auto-download source |
| `ModelAlias` | `qwen2.5-0.5b` | Name returned in API responses |
| `Config.ModelPath` | `~/.small-llm/models/<ModelName>` | Local model file path |
| `Config.BinPath` | `~/.small-llm/bin/llama-server` | llama-server binary path |

### Frontend

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8080` | Backend base URL override |

---

## API Surface

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Liveness check → `{"status":"ok"}` |
| GET | `/api/status` | Model + server status |
| POST | `/api/chat` | Conversational chat |
| POST | `/api/chatwithobject` | Structured JSON extraction |
| POST | `/api/chatwithtools` | Tool-augmented chat |

Full request/response schemas: see [api-reference.md](./api-reference.md)

---

## Testing

- **Backend**: `go test ./...` — unit tests for all handlers, tools, and prompts. Uses `llm.NewManagerForTest()` to inject a mock llama-server via `httptest`.
- **Frontend**: `vitest` — unit tests in `frontend/src/test/`
- **Docker tests**: `task docker:test` — runs both test suites in containers

---

## Known Limitations & Gotchas

1. **Weather tool is mocked** — `tools/tools.go` returns a hardcoded weather string; no real weather API is integrated.
2. **Calculator has no parentheses** — `evalSimple()` handles `+`, `-`, `*`, `/`, `^` left-to-right but does not support grouping with `()`.
3. **Structured output may fail on complex schemas** — relies on few-shot prompting, not constrained decoding. Simple flat schemas work reliably; nested/complex schemas may return malformed JSON.
4. **llama-server 120s startup timeout** — if the model takes longer to load (slow disk), the backend will exit with an error.
5. **WebLLM requires WebGPU** — browser mode requires Chrome 113+, Edge 113+, or a browser with WebGPU support. Falls back to a warning message.
6. **No authentication** — the API has no auth; it is intended for local development only.

---

## Conventions

- **Go handlers**: Each endpoint has its own file in `handlers/`. Handlers are factory functions returning `gin.HandlerFunc`.
- **Go LLM layer**: All llama-server communication goes through `llm.Client`. Never call llama-server directly from handlers.
- **Frontend services**: All backend calls go through `services/api.js`. WebLLM calls go through `services/webllm.js`.
- **State**: All UI state lives in `store/chatStore.js` (Zustand). Components read from and write to the store.
- **No routing in pages**: Pages are thin wrappers. Business logic lives in services and the store.
