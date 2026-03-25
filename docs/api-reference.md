# small-llm — Backend API Reference

Base URL: `http://localhost:8080`

---

## GET /api/health

Liveness check.

**Response 200**
```json
{ "status": "ok" }
```

---

## GET /api/status

Returns model download status and llama-server readiness.

**Response 200**
```json
{
  "model_downloaded": true,
  "server_running": true,
  "model_name": "qwen2.5-0.5b",
  "model_path": "/home/user/.small-llm/models/qwen2.5-0.5b-instruct-q4_k_m.gguf",
  "server_url": "http://localhost:8081",
  "error": ""
}
```

| Field | Type | Description |
|---|---|---|
| `model_downloaded` | bool | True if GGUF model file exists on disk |
| `server_running` | bool | True if llama-server passed health check |
| `model_name` | string | Always `"qwen2.5-0.5b"` |
| `model_path` | string | Absolute path to cached GGUF |
| `server_url` | string | Internal llama-server URL |
| `error` | string | Non-empty if startup failed |

---

## POST /api/chat

Conversational chat with optional history and system context.

**Request**
```json
{
  "message": "Explain what a closure is in JavaScript.",
  "history": [
    { "role": "user", "content": "What is a function?" },
    { "role": "assistant", "content": "A function is a reusable block of code..." }
  ],
  "context": "You are a concise programming tutor."
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `message` | string | Yes | The user's current message |
| `history` | array | No | Prior conversation turns `[{role, content}]` |
| `context` | string | No | System prompt / persona |

**Response 200**
```json
{
  "response": "A closure is a function that retains access to its outer scope...",
  "tokens_used": 87,
  "model": "qwen2.5-0.5b"
}
```

**Response 400** — missing `message` field
**Response 500** — llama-server error

---

## POST /api/chatwithobject

Extract structured JSON from natural language using a user-defined schema and optional few-shot examples.

**Request**
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

| Field | Type | Required | Description |
|---|---|---|---|
| `message` | string | Yes | Natural language input to extract from |
| `schema` | object | No | Key → type map describing the output shape |
| `few_shot_examples` | array | No | `[{ input: string, output: object }]` examples |

**Response 200**
```json
{
  "result": { "name": "John Smith", "age": 34, "job_title": "software engineer", "company": "Google" },
  "raw_response": "{\"name\":\"John Smith\",\"age\":34,\"job_title\":\"software engineer\",\"company\":\"Google\"}",
  "tokens_used": 112
}
```

> Note: Extraction uses few-shot prompting. Simple flat schemas are reliable; complex/nested schemas may occasionally return malformed JSON.

---

## POST /api/chatwithtools

Tool-augmented chat. The LLM can invoke tools mid-response using prompt-based tool calling.

**Available tools:** `calculator`, `datetime`, `weather`

**Request**
```json
{
  "message": "What is 144 divided by 12, and what is today's date?",
  "tools": ["calculator", "datetime"],
  "context": "You are a helpful assistant."
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `message` | string | Yes | User's message |
| `tools` | array | No | Tool names to enable: `"calculator"`, `"datetime"`, `"weather"` |
| `context` | string | No | Optional system prompt |

**Response 200**
```json
{
  "response": "144 ÷ 12 = 12. Today is 2026-03-23.",
  "tool_calls": [
    { "tool": "calculator", "input": "144/12", "output": "12" },
    { "tool": "datetime",   "input": "",        "output": "Date: 2026-03-23, Time: 07:32:00 UTC" }
  ],
  "tokens_used": 143
}
```

| Field | Type | Description |
|---|---|---|
| `response` | string | Final answer after tool results injected |
| `tool_calls` | array | Each tool invoked: `{tool, input, output}` |
| `tokens_used` | int | Total tokens across both LLM calls |

### Tool Descriptions

| Tool | Signature | Description |
|---|---|---|
| `calculator` | `calculator(expr)` | Evaluates arithmetic: `+`, `-`, `*`, `/`, `^`. No parentheses. |
| `datetime` | `datetime()` | Returns current UTC date and time. |
| `weather` | `weather(city)` | Returns a mock weather report for the city. |
