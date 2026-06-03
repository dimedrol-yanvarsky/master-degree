package email

import (
	"encoding/base64"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/usecases/port"
)

// TestGeneratePreviewArtifact — служебный генератор превью письма. Запуск:
//
//	GEN_PREVIEW=1 go test ./internal/frameworks/email/ -run TestGeneratePreviewArtifact
func TestGeneratePreviewArtifact(t *testing.T) {
	if os.Getenv("GEN_PREVIEW") == "" {
		t.Skip("служебный генератор превью; запускается только с GEN_PREVIEW=1")
	}

	notification := port.SpecialistNotification{
		ClientName:  "Голубев Дмитрий Викторович",
		ClientEmail: "golubevdv2003@gmail.com",
		Score:       62,
		Level:       "средняя необходимость",
		Date:        time.Now(),
	}

	html := composeHTMLBody(notification, true)

	logoPath := filepath.FromSlash("../../../../src/shared/assets/brand-logo.png")
	if logo, err := os.ReadFile(logoPath); err == nil && len(logo) > 0 {
		dataURI := "data:image/png;base64," + base64.StdEncoding.EncodeToString(logo)
		html = strings.Replace(html, "cid:"+brandLogoContentID, dataURI, 1)
	} else {
		t.Logf("логотип не найден (%v) — превью без картинки", err)
	}

	outDir := filepath.FromSlash("../../../../demo-email-preview")
	if err := os.MkdirAll(outDir, 0o755); err != nil {
		t.Fatalf("не удалось создать каталог превью: %v", err)
	}
	outPath := filepath.Join(outDir, "graph-point-notification.html")
	if err := os.WriteFile(outPath, []byte(html), 0o644); err != nil {
		t.Fatalf("не удалось записать превью: %v", err)
	}

	abs, _ := filepath.Abs(outPath)
	t.Logf("превью записано: %s", abs)
}
