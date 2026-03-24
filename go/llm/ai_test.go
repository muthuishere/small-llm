package llm_test

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/muthuishere/small-llm/go/llm"
)

// testCompleter implements llm.Completer for unit tests.
// Canned responses are returned in order; once exhausted a default is used.
type testCompleter struct {
	responses []*llm.ChatResponse
	errs      []error
	calls     int
}

func (tc *testCompleter) Complete(_ []llm.ChatMessage, _ int, _ float64) (*llm.ChatResponse, error) {
	i := tc.calls
	tc.calls++
	if i < len(tc.errs) && tc.errs[i] != nil {
		return nil, tc.errs[i]
	}
	if i < len(tc.responses) {
		return tc.responses[i], nil
	}
	return chatResp("default response", 10), nil
}

func (tc *testCompleter) CompleteStream(_ []llm.ChatMessage, _ int, _ float64, cb func(string)) error {
	i := tc.calls
	tc.calls++
	if i < len(tc.errs) && tc.errs[i] != nil {
		return tc.errs[i]
	}
	text := "streamed response"
	if i < len(tc.responses) && len(tc.responses[i].Choices) > 0 {
		text = tc.responses[i].Choices[0].Message.Content
	}
	for _, r := range text {
		cb(string(r))
	}
	return nil
}

// chatResp is a convenience constructor for ChatResponse.
func chatResp(content string, tokens int) *llm.ChatResponse {
	return &llm.ChatResponse{
		Choices: []llm.ChatChoice{
			{Message: llm.ChatMessage{Role: "assistant", Content: content}},
		},
		Usage: llm.ChatUsage{TotalTokens: tokens},
	}
}

func newTestAI(responses ...*llm.ChatResponse) *llm.AI {
	ai, _ := llm.New(llm.WithCompleter(&testCompleter{responses: responses}))
	return ai
}

// capturingCompleter records the messages it receives for later assertion.
type capturingCompleter struct {
	captured []llm.ChatMessage
}

func (c *capturingCompleter) Complete(messages []llm.ChatMessage, _ int, _ float64) (*llm.ChatResponse, error) {
	c.captured = messages
	return chatResp("ok", 1), nil
}

func (c *capturingCompleter) CompleteStream(messages []llm.ChatMessage, _ int, _ float64, cb func(string)) error {
	c.captured = messages
	cb("ok")
	return nil
}

// --- Tests ---------------------------------------------------------------

func TestAsk_returnsAssistantReply(t *testing.T) {
	ai := newTestAI(chatResp("hello world", 5))
	defer ai.Close()

	answer, err := ai.Ask(context.Background(), "say hello")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if answer != "hello world" {
		t.Errorf("got %q, want %q", answer, "hello world")
	}
}

func TestAsk_inferenceError(t *testing.T) {
	tc := &testCompleter{errs: []error{errors.New("server 500")}}
	ai, _ := llm.New(llm.WithCompleter(tc))
	defer ai.Close()

	_, err := ai.Ask(context.Background(), "any question")
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !errors.Is(err, llm.ErrInference) {
		t.Errorf("want ErrInference, got %v", err)
	}
}

func TestAsk_emptyResponse(t *testing.T) {
	ai := newTestAI(&llm.ChatResponse{Choices: []llm.ChatChoice{}})
	defer ai.Close()

	_, err := ai.Ask(context.Background(), "question")
	if !errors.Is(err, llm.ErrEmptyResponse) {
		t.Errorf("want ErrEmptyResponse, got %v", err)
	}
}

func TestAddContext_injectedIntoPrompt(t *testing.T) {
	cc := &capturingCompleter{}
	ai, _ := llm.New(llm.WithCompleter(cc))
	defer ai.Close()

	ai.AddContext("Product catalog: laptop $999")
	_, _ = ai.Ask(context.Background(), "cheapest laptop?")

	if len(cc.captured) == 0 {
		t.Fatal("no messages captured")
	}
	systemContent := cc.captured[0].Content
	if !strings.Contains(systemContent, "Product catalog") {
		t.Errorf("context not found in system prompt, got: %q", systemContent)
	}
}

func TestSetContext_upserts(t *testing.T) {
	cc := &capturingCompleter{}
	ai, _ := llm.New(llm.WithCompleter(cc))
	defer ai.Close()

	ai.SetContext("catalog", "catalog v1")
	ai.SetContext("catalog", "catalog v2")
	_, _ = ai.Ask(context.Background(), "anything")

	systemContent := cc.captured[0].Content
	if strings.Contains(systemContent, "catalog v1") {
		t.Error("old context value should have been replaced")
	}
	if !strings.Contains(systemContent, "catalog v2") {
		t.Errorf("new context value not found in system prompt: %q", systemContent)
	}
}

func TestRemoveContext_removesNamedBlock(t *testing.T) {
	cc := &capturingCompleter{}
	ai, _ := llm.New(llm.WithCompleter(cc))
	defer ai.Close()

	ai.SetContext("catalog", "secret catalog text")
	ai.RemoveContext("catalog")
	_, _ = ai.Ask(context.Background(), "anything")

	systemContent := cc.captured[0].Content
	if strings.Contains(systemContent, "secret catalog text") {
		t.Error("removed context should not appear in system prompt")
	}
}

func TestRegisterTool_customToolInvoked(t *testing.T) {
	called := false
	tc := &testCompleter{responses: []*llm.ChatResponse{
		chatResp("TOOL_CALL: ping(hello)", 10),
		chatResp("pong: hello", 5),
	}}
	ai, _ := llm.New(llm.WithCompleter(tc))
	defer ai.Close()

	ai.RegisterTool("ping", "ping(input) – echoes input", func(_ context.Context, input string) (string, error) {
		called = true
		return "pong: " + input, nil
	})

	answer, err := ai.Ask(context.Background(), "ping hello")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !called {
		t.Error("custom tool handler was not called")
	}
	if answer != "pong: hello" {
		t.Errorf("got %q, want %q", answer, "pong: hello")
	}
}

func TestAskStream_callsCallback(t *testing.T) {
	// AskStream calls Complete first (to detect tool calls) then CompleteStream.
	// Provide two responses: one for Complete (no tool calls), one for CompleteStream.
	tc := &testCompleter{responses: []*llm.ChatResponse{
		chatResp("no tools here", 3),
		chatResp("streamed answer", 5),
	}}
	ai, _ := llm.New(llm.WithCompleter(tc))
	defer ai.Close()

	var tokens []string
	err := ai.AskStream(context.Background(), "question", func(tok string) {
		tokens = append(tokens, tok)
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(tokens) == 0 {
		t.Error("no tokens received")
	}
	joined := strings.Join(tokens, "")
	if joined != "streamed answer" {
		t.Errorf("got %q, want %q", joined, "streamed answer")
	}
}

func TestAskStructured_unmarshalsStruct(t *testing.T) {
	type Person struct {
		Name string `json:"name"`
		Age  int    `json:"age"`
	}
	ai := newTestAI(chatResp(`{"name":"Alice","age":30}`, 20))
	defer ai.Close()

	var p Person
	if err := ai.AskStructured(context.Background(), "Alice is 30", &p); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if p.Name != "Alice" || p.Age != 30 {
		t.Errorf("got %+v, want {Alice 30}", p)
	}
}

func TestAskStructured_badJSON_returnsErrConstraint(t *testing.T) {
	ai := newTestAI(chatResp("not json at all", 5))
	defer ai.Close()

	var out struct{ X string }
	err := ai.AskStructured(context.Background(), "anything", &out)
	if !errors.Is(err, llm.ErrConstraint) {
		t.Errorf("want ErrConstraint, got %v", err)
	}
}
