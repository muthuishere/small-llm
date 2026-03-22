package handlers_test

import (
	"encoding/json"
	"net/http"
	"testing"
)

// ---------------------------------------------------------------------------
// POST /api/chatwithtools
// ---------------------------------------------------------------------------

func TestChatWithTools_NoToolCalls(t *testing.T) {
	// LLM responds without any TOOL_CALL directive
	srv := mockLlamaServer(t, completionsBody("The answer is 42.", 20))
	defer srv.Close()

	r := setupRouter(srv.URL)
	body := `{"message":"What is 6*7?","tools":["calculator"]}`
	w := doRequest(r, http.MethodPost, "/api/chatwithtools", body)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if resp["response"] != "The answer is 42." {
		t.Errorf("unexpected response: %v", resp["response"])
	}
	calls := resp["tool_calls"].([]interface{})
	if len(calls) != 0 {
		t.Errorf("expected no tool calls, got %d", len(calls))
	}
}

func TestChatWithTools_WithCalculatorToolCall(t *testing.T) {
	// First completion: LLM emits a TOOL_CALL directive
	firstReply := "Let me calculate that.\nTOOL_CALL: calculator(6*7)"
	// Second completion (follow-up with tool result): final answer
	secondReply := "6 times 7 equals 42."

	callCount := 0
	srv := mockLlamaServerFunc(t, func(callIdx int) string {
		switch callIdx {
		case 0:
			return completionsBody(firstReply, 20)
		default:
			return completionsBody(secondReply, 15)
		}
	}, &callCount)
	defer srv.Close()

	r := setupRouter(srv.URL)
	body := `{"message":"What is 6*7?","tools":["calculator"]}`
	w := doRequest(r, http.MethodPost, "/api/chatwithtools", body)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	calls := resp["tool_calls"].([]interface{})
	if len(calls) != 1 {
		t.Fatalf("expected 1 tool call, got %d", len(calls))
	}
	tc := calls[0].(map[string]interface{})
	if tc["tool"] != "calculator" {
		t.Errorf("expected tool=calculator, got %v", tc["tool"])
	}
	if tc["input"] != "6*7" {
		t.Errorf("expected input=6*7, got %v", tc["input"])
	}
	if tc["output"] != "42" {
		t.Errorf("expected output=42, got %v", tc["output"])
	}
	if resp["response"] != secondReply {
		t.Errorf("unexpected final response: %v", resp["response"])
	}
}

func TestChatWithTools_DatetimeTool(t *testing.T) {
	firstReply := "TOOL_CALL: datetime()"
	secondReply := "Today's date is in the tool result."

	callCount := 0
	srv := mockLlamaServerFunc(t, func(callIdx int) string {
		switch callIdx {
		case 0:
			return completionsBody(firstReply, 10)
		default:
			return completionsBody(secondReply, 12)
		}
	}, &callCount)
	defer srv.Close()

	r := setupRouter(srv.URL)
	body := `{"message":"What is today's date?","tools":["datetime"]}`
	w := doRequest(r, http.MethodPost, "/api/chatwithtools", body)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	_ = json.Unmarshal(w.Body.Bytes(), &resp)

	calls := resp["tool_calls"].([]interface{})
	if len(calls) != 1 {
		t.Fatalf("expected 1 tool call, got %d", len(calls))
	}
	tc := calls[0].(map[string]interface{})
	if tc["tool"] != "datetime" {
		t.Errorf("expected tool=datetime, got %v", tc["tool"])
	}
	out := tc["output"].(string)
	if len(out) == 0 {
		t.Error("expected non-empty datetime output")
	}
}

func TestChatWithTools_ToolNotInAllowedList_Ignored(t *testing.T) {
	// LLM tries to call 'weather' but only 'calculator' is in the allowed list
	firstReply := "TOOL_CALL: weather(London)"
	srv := mockLlamaServer(t, completionsBody(firstReply, 10))
	defer srv.Close()

	r := setupRouter(srv.URL)
	body := `{"message":"weather in London","tools":["calculator"]}`
	w := doRequest(r, http.MethodPost, "/api/chatwithtools", body)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	calls := resp["tool_calls"].([]interface{})
	if len(calls) != 0 {
		t.Errorf("expected 0 tool calls (weather not in allowed list), got %d", len(calls))
	}
}

func TestChatWithTools_EmptyTools(t *testing.T) {
	srv := mockLlamaServer(t, completionsBody("Just a reply.", 10))
	defer srv.Close()

	r := setupRouter(srv.URL)
	body := `{"message":"Hello","tools":[]}`
	w := doRequest(r, http.MethodPost, "/api/chatwithtools", body)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestChatWithTools_MissingMessage_Returns400(t *testing.T) {
	r := setupRouter("http://unused")
	w := doRequest(r, http.MethodPost, "/api/chatwithtools", `{"tools":["calculator"]}`)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestChatWithTools_LlamaServerError_Returns500(t *testing.T) {
	srv := mockErrorServer(t, http.StatusInternalServerError, "llama error")
	defer srv.Close()

	r := setupRouter(srv.URL)
	body := `{"message":"test","tools":[]}`
	w := doRequest(r, http.MethodPost, "/api/chatwithtools", body)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d", w.Code)
	}
}
