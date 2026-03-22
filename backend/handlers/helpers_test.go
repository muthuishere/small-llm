package handlers_test

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/muthuishere/small-llm/backend/handlers"
	"github.com/muthuishere/small-llm/backend/llm"
)

func init() {
	gin.SetMode(gin.TestMode)
}

// mockLlamaServer returns a test HTTP server that mimics llama-server's
// /v1/chat/completions endpoint.  The response body is fixed; supply
// responseBody (JSON string) to control what the mock returns.
func mockLlamaServer(t *testing.T, responseBody string) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost || r.URL.Path != "/v1/chat/completions" {
			t.Errorf("unexpected mock request: %s %s", r.Method, r.URL.Path)
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(w, responseBody)
	}))
}

// completionsBody builds a llama-server JSON response string.
func completionsBody(content string, tokens int) string {
	resp := llm.ChatResponse{
		Choices: []llm.ChatChoice{
			{Message: llm.ChatMessage{Role: "assistant", Content: content}},
		},
		Usage: llm.ChatUsage{TotalTokens: tokens},
	}
	b, _ := json.Marshal(resp)
	return string(b)
}

// setupRouter creates a gin engine with all handlers attached to a manager
// that points at the given llama-server URL.
func setupRouter(llamaURL string) *gin.Engine {
	mgr := llm.NewManagerForTest(llamaURL)
	r := gin.New()
	api := r.Group("/api")
	{
		api.GET("/health", handlers.Health())
		api.POST("/chat", handlers.Chat(mgr))
		api.POST("/chatwithobject", handlers.ChatWithObject(mgr))
		api.POST("/chatwithtools", handlers.ChatWithTools(mgr))
	}
	return r
}

// doRequest fires an HTTP request against the given engine and returns the recorder.
func doRequest(r *gin.Engine, method, path, body string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

// mockErrorServer returns an httptest.Server that always responds with the given status code.
func mockErrorServer(t *testing.T, statusCode int, msg string) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, msg, statusCode)
	}))
}

// mockLlamaServerFunc creates a mock llama-server where each call gets its
// response body from fn(callIndex).  callCount is incremented before fn is called.
func mockLlamaServerFunc(t *testing.T, fn func(int) string, callCount *int) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		idx := *callCount
		*callCount++
		w.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(w, fn(idx))
	}))
}
