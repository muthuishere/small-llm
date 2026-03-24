// Package models provides named constants for the bundled GGUF model files.
// Using a constant instead of a raw URL keeps consumer code readable and lets
// the library upgrade default model versions in one place.
//
// Usage:
//
//	ai, _ := llm.New(llm.WithModel(models.Qwen2_5_0_5B))
package models

const (
	// Qwen2_5_0_5B is the 0.5B-parameter Qwen 2.5 Instruct model
	// (Q4_K_M GGUF, ~394 MB). Good for lightweight tool-calling tasks.
	Qwen2_5_0_5B = "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf"

	// Qwen2_5_3B is the 3B-parameter Qwen 2.5 Instruct model
	// (Q4_K_M GGUF, ~2 GB). Better reasoning for complex prompts.
	Qwen2_5_3B = "https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q4_k_m.gguf"
)
