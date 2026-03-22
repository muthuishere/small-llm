package tools_test

import (
	"strings"
	"testing"

	"github.com/muthuishere/small-llm/backend/tools"
)

func TestCalculator(t *testing.T) {
	cases := []struct {
		expr string
		want string
	}{
		{"15*7", "105"},
		{"100/4", "25"},
		{"2^8", "256"},
		{"10+5", "15"},
		{"20-3", "17"},
		{"9/2", "4.5"},
	}
	for _, tc := range cases {
		got, err := tools.Execute("calculator", tc.expr)
		if err != nil {
			t.Errorf("calculator(%q) error: %v", tc.expr, err)
			continue
		}
		if got != tc.want {
			t.Errorf("calculator(%q) = %q, want %q", tc.expr, got, tc.want)
		}
	}
}

func TestCalculatorDivisionByZero(t *testing.T) {
	_, err := tools.Execute("calculator", "5/0")
	if err == nil {
		t.Error("expected error for division by zero, got nil")
	}
}

func TestDatetime(t *testing.T) {
	out, err := tools.Execute("datetime", "")
	if err != nil {
		t.Fatalf("datetime error: %v", err)
	}
	if !strings.Contains(out, "Date:") || !strings.Contains(out, "UTC") {
		t.Errorf("unexpected datetime output: %q", out)
	}
}

func TestWeather(t *testing.T) {
	out, err := tools.Execute("weather", "London")
	if err != nil {
		t.Fatalf("weather error: %v", err)
	}
	if !strings.Contains(out, "London") {
		t.Errorf("weather output missing city name: %q", out)
	}
}

func TestWeatherEmptyCity(t *testing.T) {
	out, err := tools.Execute("weather", "")
	if err != nil {
		t.Fatalf("weather error: %v", err)
	}
	if !strings.Contains(out, "Unknown") {
		t.Errorf("expected 'Unknown' city fallback, got: %q", out)
	}
}

func TestUnknownTool(t *testing.T) {
	_, err := tools.Execute("nonexistent", "")
	if err == nil {
		t.Error("expected error for unknown tool, got nil")
	}
}

func TestDescriptions(t *testing.T) {
	descs := tools.Descriptions([]string{"calculator", "datetime"})
	if len(descs) != 2 {
		t.Errorf("expected 2 descriptions, got %d", len(descs))
	}
	for _, d := range descs {
		if d == "" {
			t.Error("description should not be empty")
		}
	}
}

func TestDescriptionsUnknownSkipped(t *testing.T) {
	descs := tools.Descriptions([]string{"calculator", "bogus"})
	if len(descs) != 1 {
		t.Errorf("expected 1 description (bogus skipped), got %d", len(descs))
	}
}
