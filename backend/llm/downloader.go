package llm

import (
	"archive/zip"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"
)

// DownloadFile downloads a URL to destPath, showing progress.
func DownloadFile(url, destPath string) error {
	if err := os.MkdirAll(filepath.Dir(destPath), 0755); err != nil {
		return fmt.Errorf("mkdir: %w", err)
	}

	tmp := destPath + ".tmp"
	out, err := os.Create(tmp)
	if err != nil {
		return fmt.Errorf("create tmp: %w", err)
	}
	defer out.Close()

	resp, err := http.Get(url) //nolint:gosec
	if err != nil {
		return fmt.Errorf("GET %s: %w", url, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status %d for %s", resp.StatusCode, url)
	}

	total := resp.ContentLength
	counter := &writeCounter{total: total}
	if _, err = io.Copy(out, io.TeeReader(resp.Body, counter)); err != nil {
		if removeErr := os.Remove(tmp); removeErr != nil {
			log.Printf("Failed to remove tmp file %s: %v", tmp, removeErr)
		}
		return fmt.Errorf("download: %w", err)
	}
	out.Close()

	if err := os.Rename(tmp, destPath); err != nil {
		return fmt.Errorf("rename: %w", err)
	}
	fmt.Println() // newline after progress
	return nil
}

type writeCounter struct {
	n     int64
	total int64
}

func (wc *writeCounter) Write(p []byte) (int, error) {
	n := len(p)
	wc.n += int64(n)
	if wc.total > 0 {
		pct := float64(wc.n) / float64(wc.total) * 100
		fmt.Printf("\r  %.1f%% (%d / %d bytes)", pct, wc.n, wc.total)
	} else {
		fmt.Printf("\r  %d bytes downloaded", wc.n)
	}
	return n, nil
}

// DownloadLlamaServer downloads the llama-server binary for the current platform.
func DownloadLlamaServer(destPath string) error {
	tag, zipName, err := resolveLlamaRelease()
	if err != nil {
		return err
	}

	zipURL := fmt.Sprintf("https://github.com/ggml-org/llama.cpp/releases/download/%s/%s", tag, zipName)
	log.Printf("Downloading llama-server from %s", zipURL)

	tmpZip := destPath + ".zip"
	if err := DownloadFile(zipURL, tmpZip); err != nil {
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

	os_ := runtime.GOOS
	arch := runtime.GOARCH

	switch {
	case os_ == "linux" && arch == "amd64":
		zipName = fmt.Sprintf("llama-%s-bin-ubuntu-x64.zip", tag)
	case os_ == "darwin" && arch == "arm64":
		zipName = fmt.Sprintf("llama-%s-bin-macos-arm64.zip", tag)
	case os_ == "darwin" && arch == "amd64":
		zipName = fmt.Sprintf("llama-%s-bin-macos-x64.zip", tag)
	default:
		err = fmt.Errorf("unsupported platform: %s/%s", os_, arch)
	}
	return
}

func fetchLatestLlamaTag() (string, error) {
	client := &http.Client{}
	req, _ := http.NewRequest(http.MethodGet, "https://api.github.com/repos/ggml-org/llama.cpp/releases/latest", nil)
	req.Header.Set("Accept", "application/vnd.github+json")

	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("github API: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	// minimal parse: find "tag_name":"b4xxx"
	s := string(body)
	key := `"tag_name":"`
	idx := strings.Index(s, key)
	if idx < 0 {
		return "", fmt.Errorf("tag_name not found in GitHub response")
	}
	rest := s[idx+len(key):]
	end := strings.Index(rest, `"`)
	if end < 0 {
		return "", fmt.Errorf("malformed tag_name in GitHub response")
	}
	return rest[:end], nil
}

func extractLlamaServer(zipPath, destPath string) error {
	r, err := zip.OpenReader(zipPath)
	if err != nil {
		return err
	}
	defer r.Close()

	for _, f := range r.File {
		// look for build/bin/llama-server or llama-server anywhere
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
		log.Printf("Extracted %s → %s", f.Name, destPath)
		return nil
	}
	return fmt.Errorf("llama-server not found inside zip")
}
