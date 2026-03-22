package handlers_test

import (
	"encoding/json"
	"net/http"
	"testing"
)

// ---------------------------------------------------------------------------
// POST /api/chatwithobject
// ---------------------------------------------------------------------------

func TestChatWithObject_Success(t *testing.T) {
	// LLM returns a valid JSON object
	srv := mockLlamaServer(t, completionsBody(`{"name":"Alice","age":28}`, 40))
	defer srv.Close()

	r := setupRouter(srv.URL)
	body := `{
		"message": "Alice, 28, engineer",
		"schema":  {"name":"string","age":"number"}
	}`
	w := doRequest(r, http.MethodPost, "/api/chatwithobject", body)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	result, ok := resp["result"].(map[string]interface{})
	if !ok {
		t.Fatalf("result is not an object: %T %v", resp["result"], resp["result"])
	}
	if result["name"] != "Alice" {
		t.Errorf("expected name=Alice, got %v", result["name"])
	}
}

func TestChatWithObject_WithFewShot(t *testing.T) {
	srv := mockLlamaServer(t, completionsBody(`{"name":"Bob","age":35}`, 50))
	defer srv.Close()

	r := setupRouter(srv.URL)
	body := `{
		"message": "Bob, 35, developer",
		"schema": {"name":"string","age":"number"},
		"few_shot_examples": [
			{"input":"Alice, 28","output":{"name":"Alice","age":28}}
		]
	}`
	w := doRequest(r, http.MethodPost, "/api/chatwithobject", body)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestChatWithObject_LLMReturnsMarkdownFencedJSON(t *testing.T) {
	// LLM wraps JSON in markdown code fences — handler should strip them
	fenced := "```json\n{\"name\":\"Carol\",\"age\":30}\n```"
	srv := mockLlamaServer(t, completionsBody(fenced, 30))
	defer srv.Close()

	r := setupRouter(srv.URL)
	body := `{"message":"Carol, 30","schema":{"name":"string","age":"number"}}`
	w := doRequest(r, http.MethodPost, "/api/chatwithobject", body)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	_ = json.Unmarshal(w.Body.Bytes(), &resp)

	if result, ok := resp["result"].(map[string]interface{}); ok {
		if result["name"] != "Carol" {
			t.Errorf("expected name=Carol, got %v", result["name"])
		}
	} else {
		t.Errorf("result was not parsed as JSON object: %v", resp["result"])
	}
}

func TestChatWithObject_MissingMessage_Returns400(t *testing.T) {
	r := setupRouter("http://unused")
	w := doRequest(r, http.MethodPost, "/api/chatwithobject", `{"schema":{}}`)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestChatWithObject_MissingSchema_Returns400(t *testing.T) {
	r := setupRouter("http://unused")
	w := doRequest(r, http.MethodPost, "/api/chatwithobject", `{"message":"test"}`)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestChatWithObject_LlamaServerError_Returns500(t *testing.T) {
	srv := mockErrorServer(t, http.StatusInternalServerError, "llama error")
	defer srv.Close()

	r := setupRouter(srv.URL)
	body := `{"message":"test","schema":{"key":"string"}}`
	w := doRequest(r, http.MethodPost, "/api/chatwithobject", body)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d", w.Code)
	}
}
