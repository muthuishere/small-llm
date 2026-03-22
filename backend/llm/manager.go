package llm

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"sync"
	"time"

	"github.com/muthuishere/small-llm/backend/config"
)

// Status represents the current state of the LLM manager.
type Status struct {
	ModelDownloaded bool   `json:"model_downloaded"`
	ServerRunning   bool   `json:"server_running"`
	ModelName       string `json:"model_name"`
	ModelPath       string `json:"model_path"`
	ServerURL       string `json:"server_url"`
	Error           string `json:"error,omitempty"`
}

// Manager handles downloading the model/binary and managing the llama-server subprocess.
type Manager struct {
	cfg    *config.Config
	client *Client

	mu     sync.RWMutex
	status Status
	cmd    *exec.Cmd
}

// NewManagerForTest creates a minimal Manager for use in handler tests.
// It bypasses model/binary download and llama-server startup, pointing the
// internal HTTP client directly at the provided base URL (e.g. an httptest server).
func NewManagerForTest(llamaBaseURL string) *Manager {
	return &Manager{
		client: NewClient(llamaBaseURL),
		status: Status{
			ModelDownloaded: true,
			ServerRunning:   true,
			ModelName:       "test-model",
			ServerURL:       llamaBaseURL,
		},
	}
}

// NewManager creates a new Manager with the given config.
func NewManager(cfg *config.Config) *Manager {
	return &Manager{
		cfg:    cfg,
		client: NewClient(cfg.LlamaServerURL),
		status: Status{
			ModelName: config.ModelAlias,
			ModelPath: cfg.ModelPath,
			ServerURL: cfg.LlamaServerURL,
		},
	}
}

// Start downloads required assets and starts llama-server.
// It is safe to call once at startup.
func (m *Manager) Start() error {
	if err := m.ensureModel(); err != nil {
		m.setError(fmt.Sprintf("model download failed: %v", err))
		return err
	}

	if err := m.ensureBinary(); err != nil {
		m.setError(fmt.Sprintf("binary download failed: %v", err))
		return err
	}

	if err := m.startServer(); err != nil {
		m.setError(fmt.Sprintf("server start failed: %v", err))
		return err
	}
	return nil
}

// Stop gracefully shuts down llama-server.
func (m *Manager) Stop() {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.cmd != nil && m.cmd.Process != nil {
		log.Println("Stopping llama-server...")
		if err := m.cmd.Process.Kill(); err != nil {
			log.Printf("Failed to kill llama-server: %v", err)
		}
	}
}

// GetStatus returns a snapshot of the current status.
func (m *Manager) GetStatus() Status {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.status
}

// Client returns the HTTP client for the llama-server.
func (m *Manager) Client() *Client {
	return m.client
}

// ensureModel downloads the model if not already cached.
func (m *Manager) ensureModel() error {
	if fileExists(m.cfg.ModelPath) {
		log.Printf("Model already cached at %s", m.cfg.ModelPath)
		m.mu.Lock()
		m.status.ModelDownloaded = true
		m.mu.Unlock()
		return nil
	}

	log.Printf("Downloading model from %s", config.ModelURL)
	log.Printf("Saving to %s", m.cfg.ModelPath)

	if err := DownloadFile(config.ModelURL, m.cfg.ModelPath); err != nil {
		return err
	}

	m.mu.Lock()
	m.status.ModelDownloaded = true
	m.mu.Unlock()
	log.Println("Model download complete.")
	return nil
}

// ensureBinary ensures llama-server is available.
func (m *Manager) ensureBinary() error {
	// Check PATH first
	if path, err := exec.LookPath("llama-server"); err == nil {
		log.Printf("Found llama-server in PATH: %s", path)
		m.cfg.BinPath = path
		return nil
	}

	// Check cached binary
	if fileExists(m.cfg.BinPath) {
		log.Printf("Using cached llama-server at %s", m.cfg.BinPath)
		return nil
	}

	log.Println("llama-server not found; downloading from GitHub releases...")
	if err := DownloadLlamaServer(m.cfg.BinPath); err != nil {
		return err
	}
	log.Printf("llama-server downloaded to %s", m.cfg.BinPath)
	return nil
}

// startServer launches llama-server as a subprocess and waits for it to be ready.
func (m *Manager) startServer() error {
	binPath := m.cfg.BinPath
	if _, err := exec.LookPath(binPath); err != nil {
		// use absolute path if binary is not on PATH
		binPath = m.cfg.BinPath
	}

	args := []string{
		"--model", m.cfg.ModelPath,
		"--port", strconv.Itoa(config.LlamaPort),
		"--ctx-size", strconv.Itoa(config.ContextSize),
		"--host", "127.0.0.1",
		"--log-disable",
	}

	log.Printf("Starting llama-server: %s %v", binPath, args)

	logFile, logErr := os.OpenFile(
		filepath.Join(filepath.Dir(m.cfg.BinPath), "llama-server.log"),
		os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644,
	)
	if logErr != nil {
		log.Printf("Warning: could not open llama-server log file: %v", logErr)
	}

	cmd := exec.Command(binPath, args...) //nolint:gosec
	if logFile != nil {
		cmd.Stdout = logFile
		cmd.Stderr = logFile
	}

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("start llama-server: %w", err)
	}

	m.mu.Lock()
	m.cmd = cmd
	m.mu.Unlock()

	log.Printf("llama-server started (pid %d), waiting for readiness...", cmd.Process.Pid)

	// Poll until healthy or timeout
	deadline := time.Now().Add(120 * time.Second)
	for time.Now().Before(deadline) {
		if m.isServerHealthy() {
			m.mu.Lock()
			m.status.ServerRunning = true
			m.mu.Unlock()
			log.Println("llama-server is ready.")
			return nil
		}
		time.Sleep(2 * time.Second)
	}

	return fmt.Errorf("llama-server did not become ready within 120s")
}

func (m *Manager) isServerHealthy() bool {
	resp, err := m.client.httpClient.Get(m.cfg.LlamaServerURL + "/health")
	if err != nil {
		return false
	}
	resp.Body.Close()
	return resp.StatusCode == 200
}

func (m *Manager) setError(msg string) {
	m.mu.Lock()
	m.status.Error = msg
	m.mu.Unlock()
}

func fileExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && !info.IsDir()
}
