package llm

// Completer is the interface for underlying inference backends.
//
// Having a thin interface instead of a concrete type:
//   - enables full unit-testing without a running llama-server (mock it),
//   - enables multi-backend support in future phases (Ollama, remote APIs).
//
// Client (the llama.cpp HTTP client) implements Completer.
type Completer interface {
	// Complete performs a single-turn (non-streaming) completion and returns
	// the full ChatResponse.
	Complete(messages []ChatMessage, maxTokens int, temp float64) (*ChatResponse, error)

	// CompleteStream performs a streaming completion, calling cb for each
	// token as it arrives.  It returns when the stream is finished or on error.
	CompleteStream(messages []ChatMessage, maxTokens int, temp float64, cb func(string)) error
}
