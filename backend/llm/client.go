package llm

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

// OpenAI-compatible request/response types used by llama.cpp server.

type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type ChatRequest struct {
	Model       string        `json:"model"`
	Messages    []ChatMessage `json:"messages"`
	Temperature float64       `json:"temperature"`
	MaxTokens   int           `json:"max_tokens"`
	Stream      bool          `json:"stream"`
}

type ChatChoice struct {
	Message      ChatMessage `json:"message"`
	FinishReason string      `json:"finish_reason"`
}

type ChatUsage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

type ChatResponse struct {
	Choices []ChatChoice `json:"choices"`
	Usage   ChatUsage    `json:"usage"`
}

// Client is an HTTP client for the llama.cpp OpenAI-compatible server.
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

// Complete sends messages to the /v1/chat/completions endpoint and returns the response.
func (c *Client) Complete(messages []ChatMessage, maxTokens int, temperature float64) (*ChatResponse, error) {
	if maxTokens <= 0 {
		maxTokens = 512
	}
	if temperature <= 0 {
		temperature = 0.7
	}

	req := ChatRequest{
		Model:       "local-model",
		Messages:    messages,
		Temperature: temperature,
		MaxTokens:   maxTokens,
		Stream:      false,
	}

	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("marshal: %w", err)
	}

	resp, err := c.httpClient.Post(c.baseURL+"/v1/chat/completions", "application/json", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("POST completions: %w", err)
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("llama-server returned %d: %s", resp.StatusCode, string(raw))
	}

	var cr ChatResponse
	if err := json.Unmarshal(raw, &cr); err != nil {
		return nil, fmt.Errorf("unmarshal: %w", err)
	}
	if len(cr.Choices) == 0 {
		return nil, fmt.Errorf("empty choices in response")
	}
	return &cr, nil
}
