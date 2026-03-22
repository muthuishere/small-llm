package tools

import (
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"
)

// ToolDefinition describes a tool available to the LLM.
type ToolDefinition struct {
	Name        string
	Description string
	Execute     func(input string) (string, error)
}

// Registry holds all available tools.
var Registry = map[string]*ToolDefinition{
	"calculator": {
		Name:        "calculator",
		Description: "calculator(expr) – evaluates a basic arithmetic expression (e.g. 15*7, 100/4, 2^8)",
		Execute:     runCalculator,
	},
	"datetime": {
		Name:        "datetime",
		Description: "datetime() – returns today's date and current UTC time",
		Execute:     runDatetime,
	},
	"weather": {
		Name:        "weather",
		Description: "weather(city) – returns a mock weather report for the given city",
		Execute:     runWeather,
	},
}

// Descriptions returns a slice of description strings for the named tools.
func Descriptions(names []string) []string {
	out := make([]string, 0, len(names))
	for _, n := range names {
		if t, ok := Registry[n]; ok {
			out = append(out, t.Description)
		}
	}
	return out
}

// Execute runs the named tool with the given input.
func Execute(name, input string) (string, error) {
	t, ok := Registry[name]
	if !ok {
		return "", fmt.Errorf("unknown tool: %s", name)
	}
	return t.Execute(input)
}

// --- implementations ---

func runCalculator(expr string) (string, error) {
	expr = strings.TrimSpace(expr)
	result, err := evalSimple(expr)
	if err != nil {
		return "", err
	}
	// Return int if possible
	if result == math.Trunc(result) {
		return strconv.FormatInt(int64(result), 10), nil
	}
	return strconv.FormatFloat(result, 'f', -1, 64), nil
}

// evalSimple handles +, -, *, /, ^ with left-to-right precedence (no grouping).
func evalSimple(expr string) (float64, error) {
	expr = strings.ReplaceAll(expr, " ", "")
	// Try to parse as a plain number first
	if v, err := strconv.ParseFloat(expr, 64); err == nil {
		return v, nil
	}

	// Split on + or - (lowest precedence, rightmost)
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
	// Split on * or /
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
	// Split on ^
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
	// Mock response – replace with real API integration if needed
	return fmt.Sprintf("Weather in %s: 22°C, partly cloudy, humidity 65%%", city), nil
}
