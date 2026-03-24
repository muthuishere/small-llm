package llm

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
)

// OpenAI-compatible request/response types used by llama.cpp server.

// ChatMessage is a single turn in a conversation.
type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatRequest struct {
	Model       string        `json:"model"`
	Messages    []ChatMessage `json:"messages"`
	Temperature float64       `json:"temperature"`
	MaxTokens   int           `json:"max_tokens"`
	Stream      bool          `json:"stream"`
}

// ChatChoice is one completion candidate returned by llama-server.
type ChatChoice struct {
	Message      ChatMessage `json:"message"`
	FinishReason string      `json:"finish_reason"`
}

// ChatUsage carries token-count information from a completion response.
type ChatUsage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

// ChatResponse is the full response from a non-streaming completion.
type ChatResponse struct {
	Choices []ChatChoice `json:"choices"`
	Usage   ChatUsage    `json:"usage"`
}

// --- SSE streaming types --------------------------------------------------

type streamDelta struct {
	Content string `json:"content"`
}

type streamChoice struct {
	Delta        streamDelta `json:"delta"`
	FinishReason *string     `json:"finish_reason"`
}

type streamChunk struct {
	Choices []streamChoice `json:"choices"`
}

// Client is an HTTP client for the llama.cpp OpenAI-compatible server.
// It implements the Completer interface.
type Client struct {
	baseURL    string
	httpClient *http.Client
}

// NewClient creates a new Client targeting the given base URL.
func NewClient(baseURL string) *Client {
	return &Client{
		baseURL:    baseURL,
		httpClient: &http.Client{},
	}
}

// Complete sends messages to /v1/chat/completions and returns the full
// response.  It implements Completer.
func (c *Client) Complete(messages []ChatMessage, maxTokens int, temperature float64) (*ChatResponse, error) {
	if maxTokens <= 0 {
		maxTokens = 512
	}
	if temperature <= 0 {
		temperature = 0.7
	}

	body, err := json.Marshal(chatRequest{
		Model:       "local-model",
		Messages:    messages,
		Temperature: temperature,
		MaxTokens:   maxTokens,
		Stream:      false,
	})
	if err != nil {
		return nil, fmt.Errorf("marshal: %w", err)
	}

	resp, err := c.httpClient.Post(c.baseURL+"/v1/chat/completions", "application/json", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("%w: POST completions: %v", ErrInference, err)
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("%w: llama-server returned %d: %s", ErrInference, resp.StatusCode, string(raw))
	}

	var cr ChatResponse
	if err := json.Unmarshal(raw, &cr); err != nil {
		return nil, fmt.Errorf("unmarshal: %w", err)
	}
	if len(cr.Choices) == 0 {
		return nil, ErrEmptyResponse
	}
	return &cr, nil
}

// CompleteStream sends messages to /v1/chat/completions with stream=true and
// calls cb for each token as it arrives via Server-Sent Events.
// It implements Completer.
func (c *Client) CompleteStream(messages []ChatMessage, maxTokens int, temperature float64, cb func(string)) error {
	if maxTokens <= 0 {
		maxTokens = 512
	}
	if temperature <= 0 {
		temperature = 0.7
	}

	body, err := json.Marshal(chatRequest{
		Model:       "local-model",
		Messages:    messages,
		Temperature: temperature,
		MaxTokens:   maxTokens,
		Stream:      true,
	})
	if err != nil {
		return fmt.Errorf("marshal: %w", err)
	}

	resp, err := c.httpClient.Post(c.baseURL+"/v1/chat/completions", "application/json", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("%w: POST completions: %v", ErrInference, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("%w: llama-server returned %d: %s", ErrInference, resp.StatusCode, string(raw))
	}

	scanner := bufio.NewScanner(resp.Body)
	for scanner.Scan() {
		line := scanner.Text()
		if !strings.HasPrefix(line, "data: ") {
			continue
		}
		payload := strings.TrimPrefix(line, "data: ")
		if payload == "[DONE]" {
			return nil
		}

		var chunk streamChunk
		if err := json.Unmarshal([]byte(payload), &chunk); err != nil {
			continue // skip malformed chunks
		}
		if len(chunk.Choices) > 0 {
			token := chunk.Choices[0].Delta.Content
			if token != "" {
				cb(token)
			}
		}
	}
	if err := scanner.Err(); err != nil {
		return fmt.Errorf("%w: %v", ErrStreamInterrupt, err)
	}
	return nil
}
