package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/muthuishere/small-llm/backend/llm"
)

// ChatWithObjectRequest is the payload for POST /api/chatwithobject.
type ChatWithObjectRequest struct {
	Message        string                   `json:"message" binding:"required"`
	Schema         map[string]interface{}   `json:"schema" binding:"required"`
	FewShotExamples []map[string]interface{} `json:"few_shot_examples"`
}

// ChatWithObjectResponse is the response for POST /api/chatwithobject.
type ChatWithObjectResponse struct {
	Result      interface{} `json:"result"`
	RawResponse string      `json:"raw_response"`
	TokensUsed  int         `json:"tokens_used"`
}

// ChatWithObject handles structured JSON extraction requests.
//
// @Summary      Extract structured data from text
// @Description  Uses the LLM to extract structured JSON matching the provided schema, with optional few-shot examples.
// @Tags         chat
// @Accept       json
// @Produce      json
// @Param        request  body      ChatWithObjectRequest   true  "ChatWithObject request"
// @Success      200      {object}  ChatWithObjectResponse
// @Failure      400      {object}  map[string]string
// @Failure      500      {object}  map[string]string
// @Router       /api/chatwithobject [post]
func ChatWithObject(mgr *llm.Manager) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req ChatWithObjectRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		msgs := llm.BuildObjectMessages(req.Message, req.Schema, req.FewShotExamples)
		resp, err := mgr.Client().Complete(msgs, 512, 0.1) // low temperature for determinism
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		raw := resp.Choices[0].Message.Content
		parsed, parseErr := parseJSONFromResponse(raw)

		c.JSON(http.StatusOK, ChatWithObjectResponse{
			Result:      parsed,
			RawResponse: raw,
			TokensUsed:  resp.Usage.TotalTokens,
		})

		if parseErr != nil {
			log.Printf("JSON parse error for chatwithobject response: %v", parseErr)
		}
	}
}

// parseJSONFromResponse extracts the first valid JSON object from a string.
func parseJSONFromResponse(raw string) (interface{}, error) {
	raw = strings.TrimSpace(raw)

	// Strip markdown code fences if present
	if strings.HasPrefix(raw, "```") {
		lines := strings.Split(raw, "\n")
		// drop first and last line (fences)
		if len(lines) >= 3 {
			raw = strings.Join(lines[1:len(lines)-1], "\n")
		}
	}

	// Find the first { ... }
	start := strings.Index(raw, "{")
	end := strings.LastIndex(raw, "}")
	if start >= 0 && end > start {
		raw = raw[start : end+1]
	}

	var result interface{}
	if err := json.Unmarshal([]byte(raw), &result); err != nil {
		return raw, err
	}
	return result, nil
}
