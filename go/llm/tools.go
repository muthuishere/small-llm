package llm

import (
	"context"
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"
)

// ToolFunc is the handler signature for custom tools.
// ctx is the same context passed to Ask/AskStream/AskStructured.
type ToolFunc func(ctx context.Context, input string) (string, error)

// toolEntry holds a registered tool's metadata and handler.
type toolEntry struct {
	description string
	handler     ToolFunc
}

// builtinTools returns entries for the built-in calculator, datetime, and
// weather tools.  These are registered by default on every new AI instance.
func builtinTools() map[string]*toolEntry {
	return map[string]*toolEntry{
		"calculator": {
			description: "calculator(expr) – evaluates a basic arithmetic expression (e.g. 15*7, 100/4, 2^8)",
			handler:     wrapSimple(runCalculator),
		},
		"datetime": {
			description: "datetime() – returns today's date and current UTC time",
			handler:     wrapSimple(runDatetime),
		},
		"weather": {
			description: "weather(city) – returns a mock weather report for the given city",
			handler:     wrapSimple(runWeather),
		},
	}
}

// wrapSimple adapts a (string)→(string,error) function to ToolFunc.
func wrapSimple(fn func(string) (string, error)) ToolFunc {
	return func(_ context.Context, input string) (string, error) {
		return fn(input)
	}
}

// --- built-in implementations ---

func runCalculator(expr string) (string, error) {
	expr = strings.TrimSpace(expr)
	result, err := evalSimple(expr)
	if err != nil {
		return "", err
	}
	if result == math.Trunc(result) {
		return strconv.FormatInt(int64(result), 10), nil
	}
	return strconv.FormatFloat(result, 'f', -1, 64), nil
}

// evalSimple handles +, -, *, /, ^ with right-to-left scan (no grouping).
func evalSimple(expr string) (float64, error) {
	expr = strings.ReplaceAll(expr, " ", "")
	if v, err := strconv.ParseFloat(expr, 64); err == nil {
		return v, nil
	}
	for i := len(expr) - 1; i >= 0; i-- {
		if (expr[i] == '+' || expr[i] == '-') && i > 0 {
			left, err := evalSimple(expr[:i])
			if err != nil {
				continue
			}
			right, err := evalSimple(expr[i+1:])
			if err != nil {
				return 0, err
			}
			if expr[i] == '+' {
				return left + right, nil
			}
			return left - right, nil
		}
	}
	for i := len(expr) - 1; i >= 0; i-- {
		if (expr[i] == '*' || expr[i] == '/') && i > 0 {
			left, err := evalSimple(expr[:i])
			if err != nil {
				continue
			}
			right, err := evalSimple(expr[i+1:])
			if err != nil {
				return 0, err
			}
			if expr[i] == '*' {
				return left * right, nil
			}
			if right == 0 {
				return 0, fmt.Errorf("division by zero")
			}
			return left / right, nil
		}
	}
	for i := len(expr) - 1; i >= 0; i-- {
		if expr[i] == '^' && i > 0 {
			left, err := evalSimple(expr[:i])
			if err != nil {
				continue
			}
			right, err := evalSimple(expr[i+1:])
			if err != nil {
				return 0, err
			}
			return math.Pow(left, right), nil
		}
	}
	return 0, fmt.Errorf("cannot parse expression: %s", expr)
}

func runDatetime(_ string) (string, error) {
	now := time.Now().UTC()
	return fmt.Sprintf("Date: %s, Time: %s UTC", now.Format("2006-01-02"), now.Format("15:04:05")), nil
}

func runWeather(city string) (string, error) {
	city = strings.TrimSpace(city)
	if city == "" {
		city = "Unknown"
	}
	return fmt.Sprintf("Weather in %s: 22°C, partly cloudy, humidity 65%%", city), nil
}
