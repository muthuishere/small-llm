package llm

import (
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"sync"
	"time"
)

const (
	defaultModelURL   = "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf"
	defaultModelName  = "qwen2.5-0.5b-instruct-q4_k_m.gguf"
	defaultModelAlias = "qwen2.5-0.5b"
	defaultLlamaPort  = 8081
	defaultContextSize = 2048
)

// managerConfig holds the resolved configuration for a manager.
type managerConfig struct {
	modelURL    string
	modelPath   string
	binPath     string
	llamaPort   int
	contextSize int
	progressFn  func(downloaded, total int64)
}

// Status reports the live state of the managed llama-server process.
type Status struct {
	ModelDownloaded bool   `json:"model_downloaded"`
	ServerRunning   bool   `json:"server_running"`
	ModelName       string `json:"model_name"`
	ModelPath       string `json:"model_path"`
	ServerURL       string `json:"server_url"`
	Error           string `json:"error,omitempty"`
}

// manager owns the llama-server subprocess and exposes a Client to callers.
type manager struct {
	cfg    *managerConfig
	client *Client

	mu     sync.RWMutex
	status Status
	cmd    *exec.Cmd
}

// newManager creates a manager from the resolved config but does not start
// anything yet.
func newManager(cfg *managerConfig) *manager {
	serverURL := fmt.Sprintf("http://127.0.0.1:%d", cfg.llamaPort)
	return &manager{
		cfg:    cfg,
		client: NewClient(serverURL),
		status: Status{
			ModelName: defaultModelAlias,
			ModelPath: cfg.modelPath,
			ServerURL: serverURL,
		},
	}
}

// newManagerForTest creates a minimal manager for use in unit tests.
// It bypasses downloads and server startup, pointing directly at llamaBaseURL.
func newManagerForTest(llamaBaseURL string) *manager {
	return &manager{
		client: NewClient(llamaBaseURL),
		status: Status{
			ModelDownloaded: true,
			ServerRunning:   true,
			ModelName:       "test-model",
			ServerURL:       llamaBaseURL,
		},
	}
}

// Start downloads required assets and starts llama-server.
func (m *manager) Start() error {
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
func (m *manager) Stop() {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.cmd != nil && m.cmd.Process != nil {
		slog.Info("stopping llama-server")
		if err := m.cmd.Process.Kill(); err != nil {
			slog.Error("failed to kill llama-server", "err", err)
		}
	}
}

// GetStatus returns a snapshot of the current status.
func (m *manager) GetStatus() Status {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.status
}

// Client returns the HTTP client used to communicate with llama-server.
func (m *manager) Client() *Client {
	return m.client
}

func (m *manager) ensureModel() error {
	if fileExists(m.cfg.modelPath) {
		slog.Info("model already cached", "path", m.cfg.modelPath)
		m.mu.Lock()
		m.status.ModelDownloaded = true
		m.mu.Unlock()
		return nil
	}

	slog.Info("downloading model", "url", m.cfg.modelURL, "dest", m.cfg.modelPath)
	if err := DownloadFile(m.cfg.modelURL, m.cfg.modelPath, m.cfg.progressFn); err != nil {
		return err
	}

	m.mu.Lock()
	m.status.ModelDownloaded = true
	m.mu.Unlock()
	slog.Info("model download complete")
	return nil
}

func (m *manager) ensureBinary() error {
	if path, err := exec.LookPath("llama-server"); err == nil {
		slog.Info("found llama-server in PATH", "path", path)
		m.cfg.binPath = path
		return nil
	}
	if fileExists(m.cfg.binPath) {
		slog.Info("using cached llama-server", "path", m.cfg.binPath)
		return nil
	}

	slog.Info("llama-server not found; downloading from GitHub releases...")
	if err := DownloadLlamaServer(m.cfg.binPath, m.cfg.progressFn); err != nil {
		return err
	}
	slog.Info("llama-server downloaded", "path", m.cfg.binPath)
	return nil
}

func (m *manager) startServer() error {
	args := []string{
		"--model", m.cfg.modelPath,
		"--port", strconv.Itoa(m.cfg.llamaPort),
		"--ctx-size", strconv.Itoa(m.cfg.contextSize),
		"--host", "127.0.0.1",
		"--log-disable",
	}

	slog.Info("starting llama-server", "bin", m.cfg.binPath, "args", args)

	logFile, logErr := os.OpenFile(
		filepath.Join(filepath.Dir(m.cfg.binPath), "llama-server.log"),
		os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644,
	)
	if logErr != nil {
		slog.Warn("could not open llama-server log file", "err", logErr)
	}

	cmd := exec.Command(m.cfg.binPath, args...) //nolint:gosec
	if logFile != nil {
		cmd.Stdout = logFile
		cmd.Stderr = logFile
	}

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("%w: %v", ErrServerStart, err)
	}

	m.mu.Lock()
	m.cmd = cmd
	m.mu.Unlock()

	slog.Info("llama-server started, waiting for readiness", "pid", cmd.Process.Pid)

	deadline := time.Now().Add(120 * time.Second)
	for time.Now().Before(deadline) {
		if m.isServerHealthy() {
			m.mu.Lock()
			m.status.ServerRunning = true
			m.mu.Unlock()
			slog.Info("llama-server is ready")
			return nil
		}
		time.Sleep(2 * time.Second)
	}

	return ErrHealthTimeout
}

func (m *manager) isServerHealthy() bool {
	resp, err := m.client.httpClient.Get(m.status.ServerURL + "/health")
	if err != nil {
		return false
	}
	resp.Body.Close()
	return resp.StatusCode == 200
}

func (m *manager) setError(msg string) {
	m.mu.Lock()
	m.status.Error = msg
	m.mu.Unlock()
}

func fileExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && !info.IsDir()
}
