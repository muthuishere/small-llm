# small-llm — Architecture

## System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│  Browser                                                         │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  React Frontend (Vite · http://localhost:5173)          │    │
│  │                                                         │    │
│  │   /          Landing page (mode selector)               │    │
│  │   /server    ServerPage ──────────────────► Go API      │    │
│  │   /browser   BrowserPage ─► WebLLM (WebGPU)            │    │
│  └─────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
                                │ HTTP :8080
                      ┌─────────▼──────────┐
                      │  Go Backend (Gin)  │
                      │  :8080             │
                      │                   │
                      │  llm.Manager       │
                      │  llm.Client        │
                      └─────────┬──────────┘
                                │ subprocess · HTTP :8081
                      ┌─────────▼──────────┐
                      │  llama-server      │
                      │  :8081             │
                      │  (llama.cpp)       │
                      └─────────┬──────────┘
                                │
                      ~/.small-llm/models/
                      qwen2.5-0.5b-instruct-q4_k_m.gguf
```

## Backend Component Breakdown

| Package | Responsibility |
|---|---|
| `config` | Constants (ports, model URL, context size) and `Config` struct with runtime paths |
| `llm/manager` | Lifecycle: download model → download binary → start llama-server → health poll |
| `llm/client` | HTTP client wrapping llama-server's OpenAI-compatible `/v1/chat/completions` |
| `llm/prompts` | Builds `[]ChatMessage` slices for chat, structured output, and tool use |
| `llm/downloader` | Downloads GGUF model and platform-specific llama-server binary from GitHub Releases |
| `handlers` | Gin HTTP handlers — one file per endpoint; receive request, call llm package, return JSON |
| `tools` | Tool registry: `calculator`, `datetime`, `weather` — each is a pure function |
| `middleware` | CORS (allows all origins for local dev) |

## Frontend Component Breakdown

| Path | Responsibility |
|---|---|
| `App.jsx` | React Router setup. Three routes: `/`, `/server`, `/browser` |
| `pages/Landing.jsx` | Mode selection card UI |
| `pages/ServerPage.jsx` | Full chat UI using Go backend API |
| `pages/BrowserPage.jsx` | Full chat UI using WebLLM in-browser inference |
| `components/Chat.jsx` | Message list + input field; mode-agnostic |
| `components/ModeSelector.jsx` | Tabs: Chat / Structured Output / Tools |
| `components/SchemaEditor.jsx` | JSON schema textarea for structured output mode |
| `components/ToolSelector.jsx` | Checkboxes for tool selection |
| `components/StatusBar.jsx` | Polls `/api/status` on ServerPage; shows model download/server progress |
| `components/WebLLMStatus.jsx` | Shows WebLLM model download + init progress |
| `services/api.js` | Axios client — all Go backend calls |
| `services/webllm.js` | WebLLM engine wrapper — model load + inference |
| `store/chatStore.js` | Zustand global state: messages, mode, tools, schema, few-shot, loading |

## Startup Sequence (Server Mode)

```
go run . (or binary)
  1. config.New() — resolve model/binary paths from ~/.small-llm/
  2. llm.NewManager(cfg)
  3. mgr.Start()
     a. ensureModel() — check cache, download if missing (~394 MB from HuggingFace)
     b. ensureBinary() — check PATH, check cache, download llama-server from GitHub if missing
     c. startServer() — exec llama-server with --model, --port 8081, --ctx-size 2048
     d. poll /health every 2s, up to 120s
  4. Gin router setup — /api/health, /api/status, /api/chat, /api/chatwithobject, /api/chatwithtools
  5. r.Run(":8080")
```

## Inference Modes Comparison

| Aspect | Server Mode | Browser Mode |
|---|---|---|
| Model quantization | Q4_K_M GGUF (~394 MB) | q4f32_1-MLC |
| Where model runs | Machine CPU/GPU | Browser tab (WebGPU) |
| Backend required | Yes (Go + llama-server) | No |
| First-run download | ~394 MB to `~/.small-llm/` | ~500 MB to browser cache |
| Subsequent loads | Instant (cached) | Fast (browser cache) |
| Browser requirement | Any | Chrome 113+ / Edge 113+ (WebGPU) |
