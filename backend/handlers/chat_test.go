package handlers_test

import (
	"encoding/json"
	"net/http"
	"testing"
)

// ---------------------------------------------------------------------------
// GET /api/health
// ---------------------------------------------------------------------------

func TestHealth_ReturnsOK(t *testing.T) {
	r := setupRouter("http://unused")
	w := doRequest(r, http.MethodGet, "/api/health", "")

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var resp map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if resp["status"] != "ok" {
		t.Errorf("expected status=ok, got %q", resp["status"])
	}
}

// ---------------------------------------------------------------------------
// POST /api/chat
// ---------------------------------------------------------------------------

func TestChat_Success(t *testing.T) {
	srv := mockLlamaServer(t, completionsBody("Hello back!", 15))
	defer srv.Close()

	r := setupRouter(srv.URL)
	w := doRequest(r, http.MethodPost, "/api/chat", `{"message":"Hello"}`)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if resp["response"] != "Hello back!" {
		t.Errorf("unexpected response: %v", resp["response"])
	}
	if resp["tokens_used"].(float64) != 15 {
		t.Errorf("unexpected tokens_used: %v", resp["tokens_used"])
	}
}

func TestChat_WithHistoryAndContext(t *testing.T) {
	srv := mockLlamaServer(t, completionsBody("I can help with that.", 20))
	defer srv.Close()

	r := setupRouter(srv.URL)
	body := `{
		"message": "Can you help?",
		"history": [
			{"role":"user","content":"Hi"},
			{"role":"assistant","content":"Hello!"}
		],
		"context": "You are a helpful assistant."
	}`
	w := doRequest(r, http.MethodPost, "/api/chat", body)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestChat_MissingMessage_Returns400(t *testing.T) {
	r := setupRouter("http://unused")
	w := doRequest(r, http.MethodPost, "/api/chat", `{}`)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestChat_InvalidJSON_Returns400(t *testing.T) {
	r := setupRouter("http://unused")
	w := doRequest(r, http.MethodPost, "/api/chat", `{invalid json}`)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestChat_LlamaServerError_Returns500(t *testing.T) {
	srv := mockErrorServer(t, http.StatusInternalServerError, "llama error")
	defer srv.Close()

	r := setupRouter(srv.URL)
	w := doRequest(r, http.MethodPost, "/api/chat", `{"message":"test"}`)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d: %s", w.Code, w.Body.String())
	}
}

