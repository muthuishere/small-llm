// Package llm is the core of the small-llm Go library.
//
// It exposes a single high-level type, AI, that wraps llama-server lifecycle
// management, inference, context management, and tool calling behind a clean
// API:
//
//	ai, err := llm.New()
//	ai.AddContext("Here is our product catalog: ...")
//	ai.RegisterTool("search", "Search products", mySearchFn)
//	answer, err := ai.Ask(ctx, "Find the cheapest laptop")
//	defer ai.Close()
//
// For unit-testing without a running llama-server, inject a mock via
// llm.WithCompleter:
//
//	ai, _ := llm.NewWithCompleter(mockCompleter)
package llm

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"reflect"
	"regexp"
	"strings"
	"sync"
)

// AI is the main handle for local LLM inference.
// All exported methods are safe for concurrent use.
type AI struct {
	mu        sync.Mutex
	completer Completer
	mgr       *manager // nil when constructed with NewWithCompleter

	// Context management (two modes)
	anonContexts  []string          // unnamed, stackable (AddContext)
	namedContexts map[string]string // named, upsertable (SetContext)

	// Registered tools
	tools map[string]*toolEntry
}

// --- Functional options ---------------------------------------------------

// aiConfig accumulates configuration supplied by Option functions.
type aiConfig struct {
	modelURL    string
	modelPath   string
	binPath     string
	llamaPort   int
	contextSize int
	progressFn  func(downloaded, total int64)
	completer   Completer // non-nil when WithCompleter is used
}

// Option is a functional option for New.
type Option func(*aiConfig)

// WithModel selects the model by URL (use a models.* constant for the bundled
// models or WithModelURL for a custom GGUF).
func WithModel(modelURL string) Option {
	return func(c *aiConfig) { c.modelURL = modelURL }
}

// WithModelURL is identical to WithModel and is provided as an alias for
// callers who want to emphasise that they are passing a raw URL.
func WithModelURL(url string) Option {
	return func(c *aiConfig) { c.modelURL = url }
}

// WithProgress sets a callback that receives (downloaded, total) byte counts
// during model and binary downloads.  total is -1 when unknown.
func WithProgress(fn func(downloaded, total int64)) Option {
	return func(c *aiConfig) { c.progressFn = fn }
}

// WithCompleter injects a custom Completer.  When this option is used, New
// does NOT start llama-server — the caller is responsible for inference.
// Intended for unit-testing.
func WithCompleter(c Completer) Option {
	return func(cfg *aiConfig) { cfg.completer = c }
}

// --- Constructors ---------------------------------------------------------

// New creates an AI instance, downloading the model and starting llama-server
// on the first run.
//
// Options:
//
//	llm.New()                                      // default model
//	llm.New(llm.WithModel(models.Qwen2_5_0_5B))   // named constant
//	llm.New(llm.WithModelURL("https://..."))       // custom GGUF
//	llm.New(llm.WithProgress(func(d, t int64){})) // progress callback
func New(opts ...Option) (*AI, error) {
	cfg := &aiConfig{
		modelURL:    defaultModelURL,
		llamaPort:   defaultLlamaPort,
		contextSize: defaultContextSize,
	}
	for _, o := range opts {
		o(cfg)
	}

	// If a custom Completer was injected, skip server management entirely.
	if cfg.completer != nil {
		return newAI(cfg.completer, nil), nil
	}

	// Resolve paths under ~/.small-llm/
	home, _ := os.UserHomeDir()
	base := filepath.Join(home, ".small-llm")
	if cfg.modelPath == "" {
		cfg.modelPath = filepath.Join(base, "models", filepath.Base(cfg.modelURL))
	}
	if cfg.binPath == "" {
		cfg.binPath = filepath.Join(base, "bin", "llama-server")
	}

	mgr := newManager(&managerConfig{
		modelURL:    cfg.modelURL,
		modelPath:   cfg.modelPath,
		binPath:     cfg.binPath,
		llamaPort:   cfg.llamaPort,
		contextSize: cfg.contextSize,
		progressFn:  cfg.progressFn,
	})
	if err := mgr.Start(); err != nil {
		return nil, err
	}
	return newAI(mgr.Client(), mgr), nil
}

func newAI(c Completer, mgr *manager) *AI {
	return &AI{
		completer:     c,
		mgr:           mgr,
		namedContexts: make(map[string]string),
		tools:         builtinTools(),
	}
}

// Close stops the managed llama-server subprocess.
// It is a no-op when the AI was constructed with WithCompleter.
func (a *AI) Close() {
	if a.mgr != nil {
		a.mgr.Stop()
	}
}

// --- Context management --------------------------------------------------

// AddContext appends an anonymous context block to every prompt.
// Multiple calls stack; use SetContext for keyed (replaceable) context.
func (a *AI) AddContext(text string) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.anonContexts = append(a.anonContexts, text)
}

// SetContext upserts a named context block.  Calling SetContext with the same
// key replaces the previous value.
func (a *AI) SetContext(key, text string) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.namedContexts[key] = text
}

// RemoveContext removes a previously set named context block.
func (a *AI) RemoveContext(key string) {
	a.mu.Lock()
	defer a.mu.Unlock()
	delete(a.namedContexts, key)
}

// --- Tool registration ---------------------------------------------------

// RegisterTool registers a custom tool that the model can invoke via the
// TOOL_CALL protocol.
//
// name        — the identifier the model uses in TOOL_CALL directives
// description — one-line description injected into the system prompt
// handler     — func(ctx, input) called when the model invokes the tool
func (a *AI) RegisterTool(name, description string, handler ToolFunc) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.tools[name] = &toolEntry{description: description, handler: handler}
}

// --- Inference -----------------------------------------------------------

// Ask performs a single-turn completion and returns the assistant reply.
// If tools are registered, the model can invoke them; Ask handles the
// tool-call/follow-up cycle internally.
func (a *AI) Ask(ctx context.Context, question string) (string, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	msgs := a.buildMessages(question)

	resp, err := a.completer.Complete(msgs, 1024, 0.7)
	if err != nil {
		return "", fmt.Errorf("%w: %v", ErrInference, err)
	}
	if len(resp.Choices) == 0 || resp.Choices[0].Message.Content == "" {
		return "", ErrEmptyResponse
	}

	raw := resp.Choices[0].Message.Content

	// Execute any TOOL_CALL directives and, if tools were used, do a
	// follow-up completion with the results injected.
	calls := a.runToolCalls(ctx, raw)
	if len(calls) == 0 {
		return raw, nil
	}

	followUp := buildToolResultMessage(calls)
	msgs2 := append(msgs,
		ChatMessage{Role: "assistant", Content: raw},
		ChatMessage{Role: "user", Content: followUp},
	)
	resp2, err := a.completer.Complete(msgs2, 512, 0.7)
	if err != nil {
		return "", fmt.Errorf("%w: %v", ErrInference, err)
	}
	if len(resp2.Choices) == 0 || resp2.Choices[0].Message.Content == "" {
		return "", ErrEmptyResponse
	}
	return resp2.Choices[0].Message.Content, nil
}

// AskStream performs a streaming completion, calling cb for each token as it
// arrives.  Tool-call handling: if tools are registered, Ask first collects
// the full response (non-streaming), executes any tool calls, then streams
// the final answer to cb.
func (a *AI) AskStream(ctx context.Context, question string, cb func(token string)) error {
	a.mu.Lock()
	defer a.mu.Unlock()

	msgs := a.buildMessages(question)

	// Collect the initial (non-streaming) response so we can inspect it for
	// TOOL_CALL directives before streaming the final answer.
	resp, err := a.completer.Complete(msgs, 1024, 0.7)
	if err != nil {
		return fmt.Errorf("%w: %v", ErrInference, err)
	}
	if len(resp.Choices) == 0 || resp.Choices[0].Message.Content == "" {
		return ErrEmptyResponse
	}

	raw := resp.Choices[0].Message.Content
	calls := a.runToolCalls(ctx, raw)

	var finalMsgs []ChatMessage
	if len(calls) > 0 {
		followUp := buildToolResultMessage(calls)
		finalMsgs = append(msgs,
			ChatMessage{Role: "assistant", Content: raw},
			ChatMessage{Role: "user", Content: followUp},
		)
	} else {
		// No tools — stream the response we already have token-by-token.
		// (Real token-by-token streaming is available via CompleteStream when
		// no tools are registered.)
		finalMsgs = nil
	}

	if finalMsgs != nil {
		if err := a.completer.CompleteStream(finalMsgs, 512, 0.7, cb); err != nil {
			return fmt.Errorf("%w: %v", ErrStreamInterrupt, err)
		}
		return nil
	}

	// No tools were called — stream the first response directly.
	if err := a.completer.CompleteStream(msgs, 1024, 0.7, cb); err != nil {
		return fmt.Errorf("%w: %v", ErrStreamInterrupt, err)
	}
	return nil
}

// AskStructured performs a completion and unmarshals the response into out,
// which must be a pointer to a struct.  The JSON schema is derived from out's
// type via reflection.
//
//	var result struct {
//	    Name string `json:"name"`
//	    Age  int    `json:"age"`
//	}
//	err := ai.AskStructured(ctx, "Alice is 30 years old", &result)
func (a *AI) AskStructured(ctx context.Context, question string, out interface{}) error {
	a.mu.Lock()
	defer a.mu.Unlock()

	schema := schemaFromValue(out)
	msgs := BuildObjectMessages(question, schema, nil)

	resp, err := a.completer.Complete(msgs, 512, 0.1)
	if err != nil {
		return fmt.Errorf("%w: %v", ErrInference, err)
	}
	if len(resp.Choices) == 0 || resp.Choices[0].Message.Content == "" {
		return ErrEmptyResponse
	}

	raw := resp.Choices[0].Message.Content
	clean := extractJSON(raw)
	if err := json.Unmarshal([]byte(clean), out); err != nil {
		slog.Warn("AskStructured: could not unmarshal response",
			"raw", raw, "err", err)
		return fmt.Errorf("%w: %v", ErrConstraint, err)
	}
	return nil
}

// --- Helpers -------------------------------------------------------------

// buildMessages composes the full message list for a completion request,
// injecting all registered contexts and tool descriptions.
func (a *AI) buildMessages(question string) []ChatMessage {
	system := a.systemPrompt()
	descs := a.toolDescs()
	if len(descs) > 0 {
		return BuildToolMessages(system, question, descs)
	}
	return BuildChatMessages(system, nil, question)
}

func (a *AI) systemPrompt() string {
	var sb strings.Builder
	for _, t := range a.anonContexts {
		sb.WriteString(t)
		sb.WriteString("\n")
	}
	for _, t := range a.namedContexts {
		sb.WriteString(t)
		sb.WriteString("\n")
	}
	return strings.TrimSpace(sb.String())
}

func (a *AI) toolDescs() []string {
	descs := make([]string, 0, len(a.tools))
	for name, t := range a.tools {
		descs = append(descs, fmt.Sprintf("%s – %s", name, t.description))
	}
	return descs
}

// toolCall records a single TOOL_CALL execution result.
type toolCall struct {
	name   string
	input  string
	output string
}

var toolCallRE = regexp.MustCompile(`TOOL_CALL:\s*(\w+)\(([^)]*)\)`)

// runToolCalls parses TOOL_CALL directives from raw and executes each one.
func (a *AI) runToolCalls(ctx context.Context, raw string) []toolCall {
	matches := toolCallRE.FindAllStringSubmatch(raw, -1)
	calls := make([]toolCall, 0, len(matches))
	for _, m := range matches {
		name := m[1]
		input := strings.TrimSpace(m[2])
		t, ok := a.tools[name]
		if !ok {
			slog.Warn("unknown tool invoked by model",
				"tool", name,
				"fix", "register the tool with ai.RegisterTool before calling Ask")
			continue
		}
		output, err := t.handler(ctx, input)
		if err != nil {
			slog.Error("tool execution error", "tool", name, "err", err)
			output = fmt.Sprintf("error: %v", err)
		}
		calls = append(calls, toolCall{name: name, input: input, output: output})
	}
	return calls
}

func buildToolResultMessage(calls []toolCall) string {
	var sb strings.Builder
	sb.WriteString("Tool results:\n")
	for _, tc := range calls {
		sb.WriteString(fmt.Sprintf("- %s(%s) = %s\n", tc.name, tc.input, tc.output))
	}
	sb.WriteString("\nPlease provide your final answer using these results.")
	return sb.String()
}

// extractJSON strips markdown fences and returns the first {...} block.
func extractJSON(s string) string {
	s = strings.TrimSpace(s)
	if strings.HasPrefix(s, "```") {
		lines := strings.Split(s, "\n")
		if len(lines) >= 3 {
			s = strings.Join(lines[1:len(lines)-1], "\n")
		}
	}
	start := strings.Index(s, "{")
	end := strings.LastIndex(s, "}")
	if start >= 0 && end > start {
		return s[start : end+1]
	}
	return s
}

// schemaFromValue derives a minimal JSON schema map from a pointer-to-struct.
func schemaFromValue(v interface{}) map[string]interface{} {
	t := reflect.TypeOf(v)
	if t == nil {
		return map[string]interface{}{"type": "object"}
	}
	for t.Kind() == reflect.Ptr {
		t = t.Elem()
	}
	if t.Kind() != reflect.Struct {
		return map[string]interface{}{"type": "object"}
	}

	props := make(map[string]interface{}, t.NumField())
	for i := 0; i < t.NumField(); i++ {
		f := t.Field(i)
		name := f.Name
		if tag := f.Tag.Get("json"); tag != "" {
			if p := strings.SplitN(tag, ",", 2)[0]; p != "" && p != "-" {
				name = p
			}
		}
		props[name] = map[string]interface{}{"type": goKindToJSONType(f.Type.Kind())}
	}
	return map[string]interface{}{
		"type":       "object",
		"properties": props,
	}
}

func goKindToJSONType(k reflect.Kind) string {
	switch k {
	case reflect.String:
		return "string"
	case reflect.Bool:
		return "boolean"
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64,
		reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64,
		reflect.Float32, reflect.Float64:
		return "number"
	case reflect.Slice, reflect.Array:
		return "array"
	default:
		return "object"
	}
}
