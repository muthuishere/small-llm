# small-llm — Development Guide

## Prerequisites

- **Go 1.25+**
- **Node.js 18+ / npm**
- **Task** (`brew install go-task` or `go install github.com/go-task/task/v3/cmd/task@latest`)
- ~900 MB free disk space (model ~394 MB + llama-server binary, cached in `~/.small-llm/`)
- For browser mode: Chrome 113+ or Edge 113+ (WebGPU required)

---

## Quick Start

```bash
# Install frontend dependencies (first time only)
task install

# Start both backend + frontend in parallel
task
```

On first backend run:
1. Downloads `qwen2.5-0.5b-instruct-q4_k_m.gguf` (~394 MB) → `~/.small-llm/models/`
2. Downloads `llama-server` binary → `~/.small-llm/bin/`
3. Starts llama-server on `:8081`
4. Exposes Go API on `:8080`
5. Frontend dev server on `:5173`

---

## Task Commands

| Command | Description |
|---|---|
| `task` / `task dev` | Start backend + frontend (dev mode, parallel) |
| `task backend` | Start Go backend only |
| `task frontend` | Start React dev server only |
| `task install` | `npm install` for frontend |
| `task build` | Build backend binary + frontend production bundle |
| `task build:backend` | Build Go binary → `backend/bin/small-llm` |
| `task build:frontend` | Build React bundle → `frontend/dist/` |
| `task test` | Run Go backend unit tests |
| `task test:frontend` | Run Vitest frontend tests |
| `task test:all` | Run all tests (backend + frontend) |
| `task docker:test` | Run all tests in Docker (no local Go/Node required) |
| `task tidy` | `go mod tidy` |
| `task clean` | Remove build artefacts (`backend/bin/`, `frontend/dist/`) |
| `task deploy` | Deploy to production via Kamal |
| `task deploy:setup` | First-time Kamal infrastructure setup |
| `task deploy:logs` | Tail production container logs |

---

## Running Tests

### Backend (Go)
```bash
task test
# or directly:
cd backend && go test ./...
```

Handler tests use `llm.NewManagerForTest(llamaBaseURL)` — this bypasses model download and llama-server startup, pointing the internal HTTP client at an `httptest.Server`.

### Frontend (Vitest)
```bash
task test:frontend
# or:
cd frontend && npm run test:run
```

### All Tests in Docker
```bash
task docker:test
```
Runs both test suites in Docker containers. No local Go or Node.js required.

---

## Project Layout

```
backend/
  config/config.go       — constants + Config struct
  handlers/              — HTTP handlers (one file per endpoint)
  llm/                   — Manager, Client, prompts, downloader
  middleware/cors.go     — CORS for local dev
  tools/tools.go         — tool registry

frontend/src/
  App.jsx                — router
  pages/                 — Landing, ServerPage, BrowserPage
  components/            — shared UI components
  services/api.js        — Axios backend client
  services/webllm.js     — WebLLM engine wrapper
  store/chatStore.js     — Zustand global state
```

---

## Adding a New Tool

1. Open `backend/tools/tools.go`
2. Add an entry to `Registry`:
```go
"mytool": {
    Name:        "mytool",
    Description: "mytool(input) – does something useful",
    Execute:     runMyTool,
},
```
3. Implement `runMyTool(input string) (string, error)`
4. Add the tool name to `ToolSelector.jsx` in the frontend (hardcoded list of known tools)
5. Add tests in `backend/tools/tools_test.go`

---

## Adding a New API Endpoint

1. Create `backend/handlers/myendpoint.go` with a `MyEndpoint(mgr *llm.Manager) gin.HandlerFunc`
2. Register in `main.go`: `api.POST("/myendpoint", handlers.MyEndpoint(mgr))`
3. Add the axios call in `frontend/src/services/api.js`
4. Write handler tests in `backend/handlers/myendpoint_test.go` using `NewManagerForTest`

---

## Deployment

The project ships with a `Dockerfile` (multi-stage build) and Kamal configuration in `config/`.

```bash
# First time: provision the server
task deploy:setup

# Deploy
task deploy

# View logs
task deploy:logs
```

---

## Environment Variables

| Variable | Where | Description |
|---|---|---|
| `VITE_API_URL` | Frontend `.env` | Override backend base URL (default: `http://localhost:8080`) |

---

## Cache Location

All downloaded assets are stored in `~/.small-llm/`:

```
~/.small-llm/
  models/
    qwen2.5-0.5b-instruct-q4_k_m.gguf   (~394 MB)
  bin/
    llama-server                          (platform binary)
    llama-server.log                      (subprocess log)
```

To force a re-download, delete the relevant file from `~/.small-llm/` before starting the backend.
