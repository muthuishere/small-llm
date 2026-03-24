package llm

import (
	"encoding/json"
	"fmt"
)

// BuildChatMessages assembles a messages slice for a simple chat request.
func BuildChatMessages(systemPrompt string, history []ChatMessage, userMessage string) []ChatMessage {
	msgs := []ChatMessage{}
	if systemPrompt != "" {
		msgs = append(msgs, ChatMessage{Role: "system", Content: systemPrompt})
	}
	msgs = append(msgs, history...)
	msgs = append(msgs, ChatMessage{Role: "user", Content: userMessage})
	return msgs
}

// BuildObjectMessages assembles messages for structured JSON extraction.
// It injects a strict JSON system prompt and optional few-shot examples.
func BuildObjectMessages(userMessage string, schema map[string]interface{}, fewShot []map[string]interface{}) []ChatMessage {
	schemaJSON, _ := json.Marshal(schema)
	system := fmt.Sprintf(
		"You are a JSON extraction assistant. "+
			"You MUST respond with valid JSON only, no other text, no markdown, no code fences. "+
			"Extract data matching this schema: %s",
		string(schemaJSON),
	)

	msgs := []ChatMessage{{Role: "system", Content: system}}

	for _, ex := range fewShot {
		input, _ := ex["input"].(string)
		outputJSON, _ := json.Marshal(ex["output"])
		msgs = append(msgs,
			ChatMessage{Role: "user", Content: fmt.Sprintf("Extract from %q: %s", input, string(schemaJSON))},
			ChatMessage{Role: "assistant", Content: string(outputJSON)},
		)
	}

	msgs = append(msgs, ChatMessage{
		Role:    "user",
		Content: fmt.Sprintf("Extract from %q: %s", userMessage, string(schemaJSON)),
	})
	return msgs
}

// BuildToolMessages assembles messages for tool-augmented chat.
// Tool descriptions are injected into the system prompt.
func BuildToolMessages(systemPrompt, userMessage string, toolDescs []string) []ChatMessage {
	toolSection := ""
	if len(toolDescs) > 0 {
		toolSection = "\n\nAvailable tools:\n"
		for _, td := range toolDescs {
			toolSection += "- " + td + "\n"
		}
		toolSection += "\nWhen you need to call a tool, respond with a line like: TOOL_CALL: <tool_name>(<input>)\n" +
			"Then continue your response after the tool result."
	}

	if systemPrompt == "" {
		systemPrompt = "You are a helpful assistant."
	}

	return []ChatMessage{
		{Role: "system", Content: systemPrompt + toolSection},
		{Role: "user", Content: userMessage},
	}
}
