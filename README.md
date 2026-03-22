# small-llm

A full-stack local LLM application powered by **Qwen 2.5 0.5B (GGUF q4)** — available in two modes:

| Mode | Runtime | Where inference runs |
|---|---|---|
| **Server** (`/server`) | Go backend → llama.cpp | Your machine's CPU/GPU |
| **Browser** (`/browser`) | React → WebLLM (WebGPU) | In the browser tab itself |

Both modes support **chat**, **structured output (JSON extraction)**, and **tool-augmented chat**.

## Architecture

```
           ┌──────────────────────────────────┐
           │   React Frontend (Vite)          │
           │   http://localhost:5173          │
           │                                  │
           │   /         Landing page         │
           │   /server   ─── Go API ────────► Go backend :8080
           │   /browser  ─── WebLLM ────────► In-browser (WebGPU)
           └──────────────────────────────────┘
                              │
                    Go backend :8080
                              │ subprocess
                    llama-server :8081
                              │
                    ~/.small-llm/models/qwen2.5-0.5b-instruct-q4_k_m.gguf
```

## Prerequisites

- Go 1.25+
- Node.js 18+ / npm
- [Task](https://taskfile.dev) (`brew install go-task` / `go install github.com/go-task/task/v3/cmd/task@latest`)
- ~500 MB free disk space (model + binary, cached in `~/.small-llm/`)

> **Browser mode** additionally requires a browser with WebGPU support (Chrome 113+, Edge 113+).

## Quick Start

```bash
# Install frontend deps (first time only)
task install

# Start both backend + frontend in parallel
task
```

Or start individually:

```bash
task backend    # Go server (downloads model + llama-server on first run)
task frontend   # React dev server → http://localhost:5173
```

Open [http://localhost:5173](http://localhost:5173) and choose a mode.

## Taskfile Commands

```bash
task               # Start backend + frontend (dev)
task install       # npm install for frontend
task build         # Build backend binary + frontend bundle
task test          # Run Go unit tests
task tidy          # go mod tidy
task clean         # Remove build artefacts
```

---

## Routes

### `GET /` — Landing page
Choose between Server mode and Browser mode.

### `GET /server` — Server mode
Uses the Go backend API. Three endpoint sub-modes available in the sidebar:
- **Chat** — conversational chat with history
- **Structured Output** — strict JSON extraction (schema + few-shot examples)
- **Chat with Tools** — calculator, datetime, weather tools

### `GET /browser` — Browser mode
Downloads Qwen 0.5B into the browser via WebLLM once and caches it. Same three sub-modes as Server mode — no Go backend required.

---

## Backend API Reference

### `GET /api/health`
Returns `200 OK` when the server is up.

### `GET /api/status`
```json
{
  "model_downloaded": true,
  "server_running": true,
  "model_name": "qwen2.5-0.5b",
  "model_path": "/home/user/.small-llm/models/qwen2.5-0.5b-instruct-q4_k_m.gguf",
  "server_url": "http://127.0.0.1:8081"
}
```

### `POST /api/chat`
```json
// Request
{ "message": "Hello!", "history": [], "context": "You are helpful." }
// Response
{ "response": "Hi there!", "tokens_used": 42, "model": "qwen2.5-0.5b" }
```

### `POST /api/chatwithobject`
Strict JSON-only prompting + few-shot examples → structured extraction.
```json
// Request
{
  "message": "John Smith, 34, engineer at Google",
  "schema": {"name":"string","age":"number","company":"string"},
  "few_shot_examples": [
    {"input":"Alice, 28, OpenAI","output":{"name":"Alice","age":28,"company":"OpenAI"}}
  ]
}
// Response
{ "result": {"name":"John Smith","age":34,"company":"Google"}, "tokens_used": 112 }
```

### `POST /api/chatwithtools`
Tool-augmented chat. Available tools: `calculator`, `datetime`, `weather`.
```json
// Request
{ "message": "What is 15*7 and today's date?", "tools": ["calculator","datetime"] }
// Response
{
  "response": "15×7 = 105. Today is 2026-03-22.",
  "tool_calls": [
    {"tool":"calculator","input":"15*7","output":"105"},
    {"tool":"datetime","input":"","output":"Date: 2026-03-22, Time: 07:32:25 UTC"}
  ],
  "tokens_used": 143
}
```

---

## Model

| Property | Value |
|---|---|
| Model | Qwen 2.5 0.5B Instruct |
| Server quantization | Q4_K_M (GGUF, ~394 MB) |
| Browser quantization | q4f32_1-MLC (WebLLM cache) |
| Runtime (server) | llama.cpp `llama-server` |
| Runtime (browser) | `@mlc-ai/web-llm` + WebGPU |

A full-stack local LLM application powered by **Qwen 2.5 0.5B (GGUF q4)** via **llama.cpp**, with a Go backend API and React frontend.

## Architecture

```
┌─────────────────────┐      HTTP       ┌──────────────────────┐
│  React Frontend     │ ◄──────────────► │  Go Backend (Gin)    │
│  Vite + Tailwind v4 │   localhost:8080 │  localhost:8080      │
│  MUI + Radix UI     │                  │                      │
│  Zustand + Axios    │                  │  /api/chat           │
└─────────────────────┘                  │  /api/chatwithobject │
                                         │  /api/chatwithtools  │
                                         │  /api/status         │
                                         └──────────┬───────────┘
                                                    │ subprocess
                                                    ▼
                                         ┌──────────────────────┐
                                         │  llama-server        │
                                         │  localhost:8081      │
                                         │  Qwen2.5-0.5B GGUF   │
                                         └──────────────────────┘
```

## Prerequisites

- Go 1.25+
- Node.js 18+ / npm
- ~500 MB free disk space (model + binary cached in `~/.small-llm/`)

> **llama-server** is downloaded automatically on first run if not found in `$PATH`.
> The **Qwen 2.5 0.5B q4_k_m model** (~394 MB) is also downloaded automatically on first run.

## Quick Start

### 1. Backend

```bash
cd backend
go run .
```

On first run the backend will:
1. Download `qwen2.5-0.5b-instruct-q4_k_m.gguf` → `~/.small-llm/models/`
2. Download `llama-server` binary → `~/.small-llm/bin/`
3. Start `llama-server` on port `8081`
4. Expose the API on port `8080`

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## API Reference

### `GET /api/health`
Returns `200 OK` when the server is up.

### `GET /api/status`
Returns model/server readiness:
```json
{
  "model_downloaded": true,
  "server_running": true,
  "model_name": "qwen2.5-0.5b",
  "model_path": "/home/user/.small-llm/models/qwen2.5-0.5b-instruct-q4_k_m.gguf",
  "server_url": "http://127.0.0.1:8081"
}
```

### `POST /api/chat`
Standard conversational chat.

**Request:**
```json
{
  "message": "Explain quantum computing in simple terms.",
  "history": [
    { "role": "user", "content": "What is a qubit?" },
    { "role": "assistant", "content": "A qubit is..." }
  ],
  "context": "You are a helpful teacher."
}
```

**Response:**
```json
{
  "response": "Quantum computing uses qubits that can be 0 and 1 simultaneously...",
  "tokens_used": 87,
  "model": "qwen2.5-0.5b"
}
```

### `POST /api/chatwithobject`
Extract structured JSON matching a schema. Uses strict JSON-only prompting with few-shot examples.

**Request:**
```json
{
  "message": "John Smith is a 34-year-old software engineer at Google.",
  "schema": {
    "name": "string",
    "age": "number",
    "job_title": "string",
    "company": "string"
  },
  "few_shot_examples": [
    {
      "input": "Alice Chen, 28, works as a data scientist at OpenAI.",
      "output": { "name": "Alice Chen", "age": 28, "job_title": "data scientist", "company": "OpenAI" }
    }
  ]
}
```

**Response:**
```json
{
  "result": { "name": "John Smith", "age": 34, "job_title": "software engineer", "company": "Google" },
  "raw_response": "{\"name\":\"John Smith\",\"age\":34,...}",
  "tokens_used": 112
}
```

### `POST /api/chatwithtools`
Chat augmented with custom tools. The LLM can invoke tools mid-response.

**Available tools:** `calculator`, `datetime`, `weather`

**Request:**
```json
{
  "message": "What is 144 divided by 12, and what day of the week is it today?",
  "tools": ["calculator", "datetime"],
  "context": "You are a helpful assistant."
}
```

**Response:**
```json
{
  "response": "144 ÷ 12 = 12. Today is Monday, March 22, 2026.",
  "tool_calls": [
    { "tool": "calculator", "input": "144/12", "output": "12" },
    { "tool": "datetime",   "input": "now",    "output": "2026-03-22T07:32:25Z" }
  ],
  "tokens_used": 143
}
```

---

## Frontend Features

| Feature | Description |
|---|---|
| **Chat mode** | Conversational chat with history |
| **Structured Output mode** | JSON schema editor + few-shot examples → structured extraction |
| **Tools mode** | Select tools (calculator / datetime / weather) → tool-augmented answers |
| **Status bar** | Live model download / server startup progress |
| **Dark / Light theme** | Toggle via sun/moon icon |

---

## Configuration

### Backend (`backend/config/config.go`)
| Constant | Default | Description |
|---|---|---|
| `BackendPort` | `8080` | Gin server port |
| `LlamaPort` | `8081` | Internal llama-server port |
| `ContextSize` | `2048` | Model context window |
| `ModelURL` | HuggingFace URL | Source for GGUF download |

### Frontend
Set `VITE_API_URL` env var to override the backend base URL (default: same host via Vite proxy).

---

## Development

```bash
# Backend — live reload
cd backend && go run .

# Frontend — dev server with HMR
cd frontend && npm run dev

# Backend — build binary
cd backend && make build

# Backend — run tests
cd backend && go test ./...
```

---

## Model

| Property | Value |
|---|---|
| Model | Qwen 2.5 0.5B Instruct |
| Quantization | Q4_K_M (GGUF) |
| Size | ~394 MB |
| Source | [HuggingFace](https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF) |
| Runtime | llama.cpp (`llama-server`) |