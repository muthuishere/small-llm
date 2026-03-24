package llm

import "errors"

// Typed sentinel errors for every documented failure mode.
// Callers can match with errors.Is:
//
//	if errors.Is(err, llm.ErrInference) { ... }
var (
	// ErrModelDownload is returned when the model file cannot be fetched.
	ErrModelDownload = errors.New("llm: model download failed")

	// ErrStorage is returned on a disk-space or write failure.
	ErrStorage = errors.New("llm: storage error")

	// ErrServerStart is returned when llama-server cannot be launched.
	ErrServerStart = errors.New("llm: server start failed")

	// ErrHealthTimeout is returned when llama-server does not become healthy
	// within the allowed window.
	ErrHealthTimeout = errors.New("llm: server health check timed out")

	// ErrInference is returned when llama-server responds with a non-200 status.
	ErrInference = errors.New("llm: inference error")

	// ErrEmptyResponse is returned when llama-server returns an empty choices
	// list or an empty content string.
	ErrEmptyResponse = errors.New("llm: empty response from server")

	// ErrStreamInterrupt is returned when a streaming (SSE) response is cut
	// short before the [DONE] sentinel.
	ErrStreamInterrupt = errors.New("llm: stream interrupted")

	// ErrUnknownTool is returned when the model invokes a tool name that is
	// not registered on the AI instance.
	ErrUnknownTool = errors.New("llm: unknown tool")

	// ErrConstraint is returned when AskStructured cannot parse the model
	// output into the target type.
	ErrConstraint = errors.New("llm: structured output constraint failed")
)
