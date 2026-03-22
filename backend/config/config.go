package config

import (
	"os"
	"path/filepath"
)

const (
	ModelName    = "qwen2.5-0.5b-instruct-q4_k_m.gguf"
	ModelURL     = "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf"
	ModelAlias   = "qwen2.5-0.5b"
	LlamaPort    = 8081
	BackendPort  = 8080
	ContextSize  = 2048
)

type Config struct {
	ModelPath      string
	BinPath        string
	LlamaServerURL string
}

func New() *Config {
	home, _ := os.UserHomeDir()
	base := filepath.Join(home, ".small-llm")

	return &Config{
		ModelPath:      filepath.Join(base, "models", ModelName),
		BinPath:        filepath.Join(base, "bin", "llama-server"),
		LlamaServerURL: "http://localhost:8081",
	}
}
