package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadDotEnvFileReadsValues(t *testing.T) {
	t.Setenv("SMTP_HOST", "")
	t.Setenv("SMTP_PASSWORD", "")

	path := filepath.Join(t.TempDir(), ".env")
	if err := os.WriteFile(path, []byte("SMTP_HOST=smtp.gmail.com\nSMTP_PASSWORD=\"secret value\"\n"), 0o600); err != nil {
		t.Fatalf("write env file: %v", err)
	}

	loadDotEnvFile(path)

	if got := os.Getenv("SMTP_HOST"); got != "smtp.gmail.com" {
		t.Fatalf("SMTP_HOST = %q, want smtp.gmail.com", got)
	}
	if got := os.Getenv("SMTP_PASSWORD"); got != "secret value" {
		t.Fatalf("SMTP_PASSWORD = %q, want secret value", got)
	}
}

func TestLoadDotEnvFileKeepsExistingEnvironment(t *testing.T) {
	t.Setenv("SMTP_HOST", "already-set")

	path := filepath.Join(t.TempDir(), ".env")
	if err := os.WriteFile(path, []byte("SMTP_HOST=smtp.gmail.com\n"), 0o600); err != nil {
		t.Fatalf("write env file: %v", err)
	}

	loadDotEnvFile(path)

	if got := os.Getenv("SMTP_HOST"); got != "already-set" {
		t.Fatalf("SMTP_HOST = %q, want already-set", got)
	}
}
