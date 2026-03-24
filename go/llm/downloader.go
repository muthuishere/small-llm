package llm

import (
	"archive/zip"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
)

// DownloadFile downloads url to destPath, updating a progress counter.
// An optional progressFn receives (downloaded, total) byte counts on each
// write; pass nil to suppress progress output.
func DownloadFile(url, destPath string, progressFn func(downloaded, total int64)) error {
	if err := os.MkdirAll(filepath.Dir(destPath), 0755); err != nil {
		return fmt.Errorf("%w: mkdir: %v", ErrStorage, err)
	}

	tmp := destPath + ".tmp"
	out, err := os.Create(tmp)
	if err != nil {
		return fmt.Errorf("%w: create tmp: %v", ErrStorage, err)
	}
	defer out.Close()

	resp, err := http.Get(url) //nolint:gosec
	if err != nil {
		return fmt.Errorf("%w: GET %s: %v", ErrModelDownload, url, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("%w: unexpected status %d for %s", ErrModelDownload, resp.StatusCode, url)
	}

	total := resp.ContentLength
	counter := &writeCounter{total: total, fn: progressFn}
	if _, err = io.Copy(out, io.TeeReader(resp.Body, counter)); err != nil {
		if removeErr := os.Remove(tmp); removeErr != nil {
			slog.Warn("failed to remove tmp file", "path", tmp, "err", removeErr)
		}
		return fmt.Errorf("%w: download: %v", ErrModelDownload, err)
	}
	out.Close()

	if err := os.Rename(tmp, destPath); err != nil {
		return fmt.Errorf("%w: rename: %v", ErrStorage, err)
	}
	return nil
}

type writeCounter struct {
	n     int64
	total int64
	fn    func(int64, int64)
}

func (wc *writeCounter) Write(p []byte) (int, error) {
	n := len(p)
	wc.n += int64(n)
	if wc.fn != nil {
		wc.fn(wc.n, wc.total)
	}
	return n, nil
}

// DownloadLlamaServer downloads the llama-server binary for the current
// platform from the latest ggml-org/llama.cpp GitHub release.
func DownloadLlamaServer(destPath string, progressFn func(downloaded, total int64)) error {
	tag, zipName, err := resolveLlamaRelease()
	if err != nil {
		return err
	}

	zipURL := fmt.Sprintf("https://github.com/ggml-org/llama.cpp/releases/download/%s/%s", tag, zipName)
	slog.Info("downloading llama-server", "url", zipURL)

	tmpZip := destPath + ".zip"
	if err := DownloadFile(zipURL, tmpZip, progressFn); err != nil {
		return fmt.Errorf("download zip: %w", err)
	}
	defer os.Remove(tmpZip)

	if err := extractLlamaServer(tmpZip, destPath); err != nil {
		return fmt.Errorf("extract: %w", err)
	}
	return os.Chmod(destPath, 0755)
}

func resolveLlamaRelease() (tag, zipName string, err error) {
	tag, err = fetchLatestLlamaTag()
	if err != nil {
		return
	}

	goos := runtime.GOOS
	arch := runtime.GOARCH

	switch {
	case goos == "linux" && arch == "amd64":
		zipName = fmt.Sprintf("llama-%s-bin-ubuntu-x64.zip", tag)
	case goos == "darwin" && arch == "arm64":
		zipName = fmt.Sprintf("llama-%s-bin-macos-arm64.zip", tag)
	case goos == "darwin" && arch == "amd64":
		zipName = fmt.Sprintf("llama-%s-bin-macos-x64.zip", tag)
	default:
		err = fmt.Errorf("unsupported platform: %s/%s", goos, arch)
	}
	return
}

// githubRelease is the subset of the GitHub releases API we need.
type githubRelease struct {
	TagName string `json:"tag_name"`
}

func fetchLatestLlamaTag() (string, error) {
	client := &http.Client{}
	req, err := http.NewRequest(http.MethodGet, "https://api.github.com/repos/ggml-org/llama.cpp/releases/latest", nil)
	if err != nil {
		return "", fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("Accept", "application/vnd.github+json")

	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("github API: %w", err)
	}
	defer resp.Body.Close()

	var release githubRelease
	if err := json.NewDecoder(resp.Body).Decode(&release); err != nil {
		return "", fmt.Errorf("decode github response: %w", err)
	}
	if release.TagName == "" {
		return "", fmt.Errorf("tag_name missing in GitHub response")
	}
	return release.TagName, nil
}

func extractLlamaServer(zipPath, destPath string) error {
	r, err := zip.OpenReader(zipPath)
	if err != nil {
		return err
	}
	defer r.Close()

	for _, f := range r.File {
		base := filepath.Base(f.Name)
		if base != "llama-server" && base != "llama-server.exe" {
			continue
		}
		rc, err := f.Open()
		if err != nil {
			return err
		}
		if err := os.MkdirAll(filepath.Dir(destPath), 0755); err != nil {
			rc.Close()
			return err
		}
		out, err := os.Create(destPath)
		if err != nil {
			rc.Close()
			return err
		}
		_, copyErr := io.Copy(out, rc)
		out.Close()
		rc.Close()
		if copyErr != nil {
			return copyErr
		}
		slog.Info("extracted llama-server", "from", f.Name, "to", destPath)
		return nil
	}
	return fmt.Errorf("llama-server not found inside zip")
}
