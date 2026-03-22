package handlers

import (
	"net/http"
	"regexp"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/muthuishere/small-llm/backend/llm"
	"github.com/muthuishere/small-llm/backend/tools"
)

// ChatWithToolsRequest is the payload for POST /api/chatwithtools.
type ChatWithToolsRequest struct {
	Message string   `json:"message" binding:"required"`
	Tools   []string `json:"tools"`
	Context string   `json:"context"`
}

// ToolCall records a single tool invocation and its result.
type ToolCall struct {
	Tool   string `json:"tool"`
	Input  string `json:"input"`
	Output string `json:"output"`
}

// ChatWithToolsResponse is the response for POST /api/chatwithtools.
type ChatWithToolsResponse struct {
	Response   string     `json:"response"`
	ToolCalls  []ToolCall `json:"tool_calls"`
	TokensUsed int        `json:"tokens_used"`
}

// toolCallRe matches: TOOL_CALL: <name>(<input>)
var toolCallRe = regexp.MustCompile(`TOOL_CALL:\s*(\w+)\(([^)]*)\)`)

// ChatWithTools handles tool-augmented chat requests.
//
// @Summary      Chat with tool use
// @Description  Sends a message with optional tools. The LLM can invoke calculator, datetime, or weather tools.
// @Tags         chat
// @Accept       json
// @Produce      json
// @Param        request  body      ChatWithToolsRequest   true  "ChatWithTools request"
// @Success      200      {object}  ChatWithToolsResponse
// @Failure      400      {object}  map[string]string
// @Failure      500      {object}  map[string]string
// @Router       /api/chatwithtools [post]
func ChatWithTools(mgr *llm.Manager) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req ChatWithToolsRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		toolDescs := tools.Descriptions(req.Tools)
		msgs := llm.BuildToolMessages(req.Context, req.Message, toolDescs)

		resp, err := mgr.Client().Complete(msgs, 1024, 0.7)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		rawReply := resp.Choices[0].Message.Content
		totalTokens := resp.Usage.TotalTokens

		// Parse and execute any tool calls embedded in the response
		toolCalls, finalReply := executeToolCalls(rawReply, req.Tools)

		// If tools were called, do a follow-up completion with results injected
		if len(toolCalls) > 0 {
			toolResultMsg := buildToolResultMessage(toolCalls)
			msgs2 := append(msgs,
				llm.ChatMessage{Role: "assistant", Content: rawReply},
				llm.ChatMessage{Role: "user", Content: toolResultMsg},
			)
			resp2, err2 := mgr.Client().Complete(msgs2, 512, 0.7)
			if err2 == nil {
				finalReply = resp2.Choices[0].Message.Content
				totalTokens += resp2.Usage.TotalTokens
			}
		}

		c.JSON(http.StatusOK, ChatWithToolsResponse{
			Response:   finalReply,
			ToolCalls:  toolCalls,
			TokensUsed: totalTokens,
		})
	}
}

// executeToolCalls scans the LLM response for TOOL_CALL directives, executes them,
// and returns the recorded calls plus the cleaned response text.
func executeToolCalls(response string, allowedTools []string) ([]ToolCall, string) {
	allowed := make(map[string]bool, len(allowedTools))
	for _, t := range allowedTools {
		allowed[t] = true
	}

	matches := toolCallRe.FindAllStringSubmatch(response, -1)
	calls := make([]ToolCall, 0, len(matches))

	for _, m := range matches {
		name := m[1]
		input := strings.TrimSpace(m[2])

		if !allowed[name] {
			continue
		}

		output, err := tools.Execute(name, input)
		if err != nil {
			output = "error: " + err.Error()
		}

		calls = append(calls, ToolCall{
			Tool:   name,
			Input:  input,
			Output: output,
		})
	}

	// Remove TOOL_CALL lines from the final response
	cleaned := toolCallRe.ReplaceAllString(response, "")
	cleaned = strings.TrimSpace(cleaned)

	return calls, cleaned
}

func buildToolResultMessage(calls []ToolCall) string {
	var sb strings.Builder
	sb.WriteString("Tool results:\n")
	for _, tc := range calls {
		sb.WriteString("- ")
		sb.WriteString(tc.Tool)
		sb.WriteString("(")
		sb.WriteString(tc.Input)
		sb.WriteString(") = ")
		sb.WriteString(tc.Output)
		sb.WriteString("\n")
	}
	sb.WriteString("\nPlease provide your final answer using these results.")
	return sb.String()
}
