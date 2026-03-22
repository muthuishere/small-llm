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
// It injects a strict JSON system prompt and few-shot examples.
func BuildObjectMessages(userMessage string, schema map[string]interface{}, fewShot []map[string]interface{}) []ChatMessage {
	schemaJSON, _ := json.Marshal(schema)
	system := fmt.Sprintf(
		"You are a JSON extraction assistant. "+
			"You MUST respond with valid JSON only, no other text, no markdown, no code fences. "+
			"Extract data matching this schema: %s",
		string(schemaJSON),
	)

	msgs := []ChatMessage{{Role: "system", Content: system}}

	// Add few-shot examples
	for _, ex := range fewShot {
		input, _ := ex["input"].(string)
		output := ex["output"]

		outputJSON, _ := json.Marshal(output)
		extractPrompt := fmt.Sprintf("Extract from %q: %s", input, string(schemaJSON))
		msgs = append(msgs,
			ChatMessage{Role: "user", Content: extractPrompt},
			ChatMessage{Role: "assistant", Content: string(outputJSON)},
		)
	}

	// Final user message
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
	fullSystem := systemPrompt + toolSection

	return []ChatMessage{
		{Role: "system", Content: fullSystem},
		{Role: "user", Content: userMessage},
	}
}
