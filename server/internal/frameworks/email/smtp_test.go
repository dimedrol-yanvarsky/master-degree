package email

import (
	"context"
	"encoding/base64"
	"strings"
	"testing"
	"time"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/usecases/port"
)

func TestComposeHTMLBodyContainsBrandAndResult(t *testing.T) {
	body := composeHTMLBody(port.SpecialistNotification{
		ClientName: "Голубев Дмитрий Викторович",
		Score:      12.34,
		Level:      "очень малая",
		Date:       time.Date(2026, 6, 2, 12, 31, 0, 0, time.UTC),
	}, true)

	for _, want := range []string{"cid:lumen-brand-logo", "Lumen", "Граф эмоционального состояния", "Голубев Дмитрий Викторович", "Новая вершина графа", "Набранный балл", "12", "очень малая"} {
		if !strings.Contains(body, want) {
			t.Fatalf("html body does not contain %q:\n%s", want, body)
		}
	}
	for _, unwanted := range []string{"BDS", "bds", "Результат BDS", "16 из 64", "дистресс", "тест", "тестирование", "прохождение"} {
		if strings.Contains(body, unwanted) {
			t.Fatalf("html body must not contain %q:\n%s", unwanted, body)
		}
	}
}

func TestGraphPointEmailSubjectAndPlainBodyDoNotMentionSourceTests(t *testing.T) {
	notification := port.SpecialistNotification{
		ClientName:  "Голубев Дмитрий Викторович",
		ClientEmail: "client@example.com",
		Score:       38,
		Level:       "средняя необходимость",
		Date:        time.Date(2026, 6, 3, 19, 30, 0, 0, time.UTC),
	}
	content := graphPointSubject(notification.ClientName) + "\n" + composeBody(notification)

	for _, want := range []string{"Новая вершина графа клиента: Голубев Дмитрий Викторович", "Набранный балл: 38", "Степень необходимости в поддержке: средняя необходимость"} {
		if !strings.Contains(content, want) {
			t.Fatalf("email content does not contain %q:\n%s", want, content)
		}
	}
	for _, unwanted := range []string{"BDS", "bds", "из 64", "дистресс", "тест", "тестирование", "прохождение"} {
		if strings.Contains(content, unwanted) {
			t.Fatalf("email content must not contain %q:\n%s", unwanted, content)
		}
	}
}

func TestNotifyNewGraphPointDoesNotReturnSMTPError(t *testing.T) {
	notifier := NewSMTPNotifier("127.0.0.1", 1, "user", "password", "from@example.com")

	err := notifier.NotifyNewGraphPoint(context.Background(), port.SpecialistNotification{
		ClientName: "Голубев Дмитрий Викторович",
		Recipients: []string{
			"specialist@example.com",
		},
		Date: time.Date(2026, 6, 3, 19, 5, 0, 0, time.UTC),
	})
	if err != nil {
		t.Fatalf("NotifyNewGraphPoint returned SMTP error: %v", err)
	}
}

func TestBuildMessageWithHTMLUsesMultipartAlternative(t *testing.T) {
	message := string(buildMessage(
		"from@example.com",
		[]string{"to@example.com"},
		"Тема",
		"plain body",
		"<strong>html body</strong>",
		[]byte("png"),
	))

	if !strings.Contains(message, "Content-Type: multipart/related; boundary=") {
		t.Fatalf("message must be multipart related:\n%s", message)
	}
	if !strings.Contains(message, "Content-Type: multipart/alternative; boundary=") {
		t.Fatalf("message must contain multipart alternative:\n%s", message)
	}
	if !strings.Contains(message, "Content-Type: text/plain; charset=UTF-8") {
		t.Fatalf("message must contain text part:\n%s", message)
	}
	if !strings.Contains(message, "Content-Type: text/html; charset=UTF-8") {
		t.Fatalf("message must contain html part:\n%s", message)
	}
	if !strings.Contains(message, base64.StdEncoding.EncodeToString([]byte("plain body"))) {
		t.Fatalf("message must contain encoded plain body:\n%s", message)
	}
	if !strings.Contains(message, "Content-ID: <lumen-brand-logo>") {
		t.Fatalf("message must contain inline logo content id:\n%s", message)
	}
}
