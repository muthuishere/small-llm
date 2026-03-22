package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/muthuishere/small-llm/backend/config"
	"github.com/muthuishere/small-llm/backend/llm"
)

// ChatRequest is the payload for POST /api/chat.
type ChatRequest struct {
	Message string            `json:"message" binding:"required"`
	History []llm.ChatMessage `json:"history"`
	Context string            `json:"context"`
}

// ChatResponse is the response for POST /api/chat.
type ChatResponse struct {
	Response   string `json:"response"`
	TokensUsed int    `json:"tokens_used"`
	Model      string `json:"model"`
}

// Chat handles simple conversational chat requests.
//
// @Summary      Chat with the LLM
// @Description  Sends a message (with optional history and system context) and returns the assistant reply.
// @Tags         chat
// @Accept       json
// @Produce      json
// @Param        request  body      ChatRequest   true  "Chat request"
// @Success      200      {object}  ChatResponse
// @Failure      400      {object}  map[string]string
// @Failure      500      {object}  map[string]string
// @Router       /api/chat [post]
func Chat(mgr *llm.Manager) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req ChatRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		msgs := llm.BuildChatMessages(req.Context, req.History, req.Message)
		resp, err := mgr.Client().Complete(msgs, 512, 0.7)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, ChatResponse{
			Response:   resp.Choices[0].Message.Content,
			TokensUsed: resp.Usage.TotalTokens,
			Model:      config.ModelAlias,
		})
	}
}

// Health returns a simple liveness check.
//
// @Summary      Health check
// @Description  Returns OK when the backend is running.
// @Tags         health
// @Produce      json
// @Success      200  {object}  map[string]string
// @Router       /api/health [get]
func Health() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	}
}
