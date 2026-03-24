# TODOS

## Library Extraction

### Fix downloader.go JSON parsing

**What:** Replace `strings.Index`-based JSON parsing in `downloader.go` with `json.Unmarshal` into typed structs.

**Why:** The only code quality anti-pattern in the codebase. Fragile — any HuggingFace API response format change breaks it silently.

**Context:** During the monorepo extraction, `backend/llm/downloader.go` moves to `go/llm/downloader.go`. Fix the ~15 lines of string manipulation with proper struct deserialization at that point. Zero risk, pure improvement.

**Effort:** XS
**Priority:** P1
**Depends on:** Part of v0.1.0 extraction work

### Go HTTP Middleware

**What:** Create `smallllm.Middleware()` that adds AI capabilities to any Go HTTP server via `router.Use()`.

**Why:** Developers with existing Gin/Chi/stdlib servers want to add AI without restructuring their app. Middleware is the idiomatic Go pattern.

**Context:** Deferred from CEO Review Expansion Ceremony (Proposal #5). Developers can manually write handlers using the library, but middleware lowers the adoption barrier. Wait for v0.1.0 feedback to validate demand before building.

**Effort:** S
**Priority:** P2
**Depends on:** Core library extraction complete (v0.1.0)

## Post-v0.1.0

### Multi-backend support via Completer interface

**What:** Implement additional backends behind the `Completer` interface — Ollama, remote OpenAI-compatible APIs, and other local inference engines.

**Why:** The `Completer` interface was designed for this. Users who already run Ollama or have OpenAI keys should use small-llm's tool calling, context management, and structured output with their preferred backend.

**Context:** The Completer interface in v0.1.0 is specifically designed to enable this. Each backend implements `Complete()` and `CompleteStream()`. Natural Phase 2 work once the interface is proven stable. Start with Ollama (most popular local alternative).

**Effort:** M
**Priority:** P1
**Depends on:** v0.1.0 shipped with stable Completer interface

### Conversation memory / multi-turn context

**What:** Add built-in conversation history management — the library tracks previous Q&A turns and includes them in subsequent prompts automatically.

**Why:** Currently each `Ask()` call is stateless. For chat-like experiences, developers manually build the message array. React's `useChat()` hook manages this, but Go has no equivalent.

**Context:** Go needs `ai.Chat(ctx, msg) → response` with automatic history. Token-aware truncation (keep most recent N turns that fit within context window). The React `useChat()` hook already has message state management — this extends the pattern to Go.

**Effort:** S
**Priority:** P2
**Depends on:** Context management API (in v0.1.0 scope)

### Example apps beyond the current demo

**What:** Create 2-3 focused example apps: CLI tool-calling assistant, React product search component, document Q&A app.

**Why:** The current example app demonstrates everything at once. Focused examples help developers see specific features in isolation.

**Context:** The monorepo `examples/` directory is the home. Each example should be minimal (<100 lines) and self-contained. "Show me the code" is how developers evaluate libraries.

**Effort:** S
**Priority:** P2
**Depends on:** v0.1.0 shipped

## Completed
