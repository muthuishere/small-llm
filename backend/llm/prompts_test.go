package llm_test

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/muthuishere/small-llm/backend/llm"
)

func TestBuildChatMessages_WithSystem(t *testing.T) {
	msgs := llm.BuildChatMessages("You are helpful.", nil, "Hello!")
	if len(msgs) != 2 {
		t.Fatalf("expected 2 messages, got %d", len(msgs))
	}
	if msgs[0].Role != "system" {
		t.Errorf("first message should be system, got %q", msgs[0].Role)
	}
	if msgs[1].Role != "user" || msgs[1].Content != "Hello!" {
		t.Errorf("unexpected user message: %+v", msgs[1])
	}
}

func TestBuildChatMessages_WithHistory(t *testing.T) {
	history := []llm.ChatMessage{
		{Role: "user", Content: "prev question"},
		{Role: "assistant", Content: "prev answer"},
	}
	msgs := llm.BuildChatMessages("", history, "new question")
	if len(msgs) != 3 {
		t.Fatalf("expected 3 messages (history + user), got %d", len(msgs))
	}
	if msgs[2].Content != "new question" {
		t.Errorf("unexpected last message: %+v", msgs[2])
	}
}

func TestBuildObjectMessages_SystemHasSchema(t *testing.T) {
	schema := map[string]interface{}{"name": "string", "age": "number"}
	msgs := llm.BuildObjectMessages("Extract: Alice is 30", schema, nil)

	if msgs[0].Role != "system" {
		t.Errorf("expected system message first, got %q", msgs[0].Role)
	}
	if !strings.Contains(msgs[0].Content, "JSON") {
		t.Errorf("system prompt should mention JSON: %q", msgs[0].Content)
	}
	schemaJSON, _ := json.Marshal(schema)
	if !strings.Contains(msgs[0].Content, string(schemaJSON)) {
		t.Errorf("system prompt should contain schema: %q", msgs[0].Content)
	}
}

func TestBuildObjectMessages_FewShot(t *testing.T) {
	schema := map[string]interface{}{"name": "string"}
	fewShot := []map[string]interface{}{
		{"input": "Bob is here", "output": map[string]interface{}{"name": "Bob"}},
	}
	msgs := llm.BuildObjectMessages("Find: Carol", schema, fewShot)
	// system + user/assistant (few-shot pair) + final user = 4
	if len(msgs) != 4 {
		t.Fatalf("expected 4 messages with 1 few-shot example, got %d", len(msgs))
	}
	if msgs[1].Role != "user" || msgs[2].Role != "assistant" {
		t.Errorf("expected user/assistant few-shot pair, got %q / %q", msgs[1].Role, msgs[2].Role)
	}
	// assistant few-shot should be valid JSON
	var v interface{}
	if err := json.Unmarshal([]byte(msgs[2].Content), &v); err != nil {
		t.Errorf("assistant few-shot message is not valid JSON: %q", msgs[2].Content)
	}
}

func TestBuildToolMessages_InjectsTools(t *testing.T) {
	toolDescs := []string{
		"calculator(expr) – evaluates arithmetic",
		"datetime() – returns current time",
	}
	msgs := llm.BuildToolMessages("", "What time is it?", toolDescs)
	if len(msgs) != 2 {
		t.Fatalf("expected 2 messages, got %d", len(msgs))
	}
	if msgs[0].Role != "system" {
		t.Errorf("expected system message, got %q", msgs[0].Role)
	}
	if !strings.Contains(msgs[0].Content, "TOOL_CALL") {
		t.Errorf("system prompt should explain TOOL_CALL format: %q", msgs[0].Content)
	}
	for _, td := range toolDescs {
		if !strings.Contains(msgs[0].Content, td) {
			t.Errorf("system prompt missing tool description %q", td)
		}
	}
}

func TestBuildToolMessages_DefaultSystemPrompt(t *testing.T) {
	msgs := llm.BuildToolMessages("", "hello", nil)
	if !strings.Contains(msgs[0].Content, "helpful") {
		t.Errorf("default system prompt should mention 'helpful': %q", msgs[0].Content)
	}
}
