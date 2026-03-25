# small-llm / Go

Run small language models locally from Go — no cloud, no API keys, no setup.

`small-llm/go` downloads a quantized model and `llama-server` on first run, starts the server as a subprocess, and gives you a simple API for chat, streaming, structured output, and tool calling.

## Installation

```bash
go get github.com/muthuishere/small-llm/go
```

## Quick Start

```go
package main

import (
	"context"
	"fmt"
	"log"

	"github.com/muthuishere/small-llm/go/llm"
)

func main() {
	ai, err := llm.New()
	if err != nil {
		log.Fatal(err)
	}
	defer ai.Close()

	answer, err := ai.Ask(context.Background(), "What is the capital of France?")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println(answer)
}
```

On first run this will download **Qwen 2.5 0.5B** (~394 MB) and `llama-server`, then start inference.

## Streaming

```go
err := ai.AskStream(ctx, "Tell me a short story", func(token string) {
	fmt.Print(token)
})
```

## Structured Output

Extract typed data from natural language:

```go
var person struct {
	Name string `json:"name"`
	Age  int    `json:"age"`
	City string `json:"city"`
}

err := ai.AskStructured(ctx, "Alice is 30 and lives in Paris", &person)
// person.Name == "Alice", person.Age == 30, person.City == "Paris"
```

`AskStructured` derives a JSON schema from your struct via reflection and constrains the model output.

## Tool Calling

Register custom tools the model can invoke mid-conversation:

```go
ai.RegisterTool("lookup", "lookup(id) – find a product by ID", func(ctx context.Context, input string) (string, error) {
	product, err := db.FindProduct(input)
	if err != nil {
		return "", err
	}
	return product.String(), nil
})

answer, err := ai.Ask(ctx, "What's the price of product ABC-123?")
```

Three built-in tools are registered automatically:

| Tool | Description |
|---|---|
| `calculator` | Evaluates arithmetic expressions (`15*7`, `2^8`) |
| `datetime` | Returns current date and UTC time |
| `weather` | Returns a mock weather report for a city |

## Context Management

Inject persistent context into every prompt:

```go
// Anonymous context (stacks with each call)
ai.AddContext("You are a helpful cooking assistant.")

// Keyed context (replaceable)
ai.SetContext("menu", "Today's specials: pasta, salad, soup")
ai.SetContext("menu", "Updated specials: pizza, burger")  // replaces previous

// Remove keyed context
ai.RemoveContext("menu")
```

## Models

| Constant | Size | Use case |
|---|---|---|
| `models.Qwen2_5_0_5B` | ~394 MB | Lightweight, fast — good for tool calling |
| `models.Qwen2_5_3B` | ~2 GB | Better reasoning for complex prompts |

```go
import "github.com/muthuishere/small-llm/go/models"

ai, err := llm.New(llm.WithModel(models.Qwen2_5_3B))
```

## Options

```go
llm.New()                                          // defaults (Qwen 0.5B)
llm.New(llm.WithModel(models.Qwen2_5_3B))         // larger model
llm.New(llm.WithModelURL("https://example.com/custom.gguf")) // custom GGUF URL
llm.New(llm.WithProgress(func(downloaded, total int64) {     // download progress
	fmt.Printf("\r%.0f%%", float64(downloaded)/float64(total)*100)
}))
llm.New(llm.WithCompleter(mockCompleter))          // inject custom backend (testing)
```

| Option | Description |
|---|---|
| `WithModel(url)` | Select model by URL (use `models.*` constants) |
| `WithModelURL(url)` | Alias for `WithModel` — emphasises raw URL usage |
| `WithProgress(fn)` | Callback receiving `(downloaded, total)` byte counts |
| `WithCompleter(c)` | Inject a custom `Completer`; skips llama-server startup |

## Error Handling

All errors are sentinel values — match with `errors.Is()`:

```go
answer, err := ai.Ask(ctx, "Hello")
if errors.Is(err, llm.ErrInference) {
	// handle inference failure
}
```

| Error | When |
|---|---|
| `ErrModelDownload` | Model file cannot be fetched |
| `ErrStorage` | Disk space or write failure |
| `ErrServerStart` | llama-server cannot be launched |
| `ErrHealthTimeout` | llama-server didn't become healthy in time |
| `ErrInference` | llama-server returned non-200 |
| `ErrEmptyResponse` | Empty choices or content from server |
| `ErrStreamInterrupt` | Streaming response cut short before completion |
| `ErrUnknownTool` | Model invoked an unregistered tool |
| `ErrConstraint` | `AskStructured` couldn't parse output into target type |

## API Reference

### Constructor

| Function | Signature |
|---|---|
| `New` | `New(opts ...Option) (*AI, error)` |

### AI Methods

| Method | Signature |
|---|---|
| `Ask` | `(a *AI) Ask(ctx context.Context, question string) (string, error)` |
| `AskStream` | `(a *AI) AskStream(ctx context.Context, question string, cb func(token string)) error` |
| `AskStructured` | `(a *AI) AskStructured(ctx context.Context, question string, out interface{}) error` |
| `RegisterTool` | `(a *AI) RegisterTool(name, description string, handler ToolFunc)` |
| `AddContext` | `(a *AI) AddContext(text string)` |
| `SetContext` | `(a *AI) SetContext(key, text string)` |
| `RemoveContext` | `(a *AI) RemoveContext(key string)` |
| `Close` | `(a *AI) Close()` |

### Types

| Type | Description |
|---|---|
| `AI` | Main handle for local LLM inference (concurrent-safe) |
| `Option` | Functional option for `New` |
| `ToolFunc` | `func(ctx context.Context, input string) (string, error)` |
| `Completer` | Interface for inference backends (`Complete` + `CompleteStream`) |
| `ChatMessage` | `struct{ Role, Content string }` |

## Requirements

- Go 1.25+
- ~394 MB disk space for the default model (cached in `~/.small-llm/`)
- `llama-server` is downloaded automatically on first run
- macOS, Linux, or Windows

## License

MIT
