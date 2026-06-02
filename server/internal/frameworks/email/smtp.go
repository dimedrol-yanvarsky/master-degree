// Пакет email — инфраструктурная реализация оповещения специалистов по почте
// (порт port.SpecialistNotifier). Если SMTP не настроен, письмо не теряется, а
// пишется в лог — это позволяет демонстрировать логику без реального почтового
// сервера.
package email

import (
	"context"
	"encoding/base64"
	"fmt"
	"log"
	"net/smtp"
	"strings"
	"time"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/usecases/port"
)

// Проверка на этапе компиляции: нотификатор удовлетворяет порту приложения.
var _ port.SpecialistNotifier = (*SMTPNotifier)(nil)
var _ port.PasswordResetNotifier = (*SMTPNotifier)(nil)

// SMTPNotifier отправляет письма специалистам через SMTP.
type SMTPNotifier struct {
	host     string
	port     int
	username string
	password string
	from     string
}

// NewSMTPNotifier собирает нотификатор. Пустые host/from означают «не настроено»:
// письма уйдут в лог (фоллбэк).
func NewSMTPNotifier(host string, port int, username, password, from string) *SMTPNotifier {
	return &SMTPNotifier{
		host:     strings.TrimSpace(host),
		port:     port,
		username: username,
		password: password,
		from:     strings.TrimSpace(from),
	}
}

func (n *SMTPNotifier) configured() bool {
	return n.host != "" && n.from != ""
}

// NotifyNewGraphPoint рассылает оповещение всем указанным специалистам.
func (n *SMTPNotifier) NotifyNewGraphPoint(_ context.Context, notification port.SpecialistNotification) error {
	if len(notification.Recipients) == 0 {
		return nil
	}

	subject := fmt.Sprintf("Новая точка в графе клиента: %s", strings.TrimSpace(notification.ClientName))
	body := composeBody(notification)

	if !n.configured() {
		log.Printf("[email:fallback] кому=%s | тема=%q\n%s", strings.Join(notification.Recipients, ", "), subject, body)
		return nil
	}

	message := buildMessage(n.from, notification.Recipients, subject, body)
	address := fmt.Sprintf("%s:%d", n.host, n.port)
	auth := smtp.PlainAuth("", n.username, n.password, n.host)

	return smtp.SendMail(address, auth, n.from, notification.Recipients, message)
}

func (n *SMTPNotifier) SendPasswordReset(_ context.Context, notification port.PasswordResetNotification) error {
	recipient := strings.TrimSpace(notification.Recipient)
	if recipient == "" {
		return nil
	}

	subject := "Восстановление пароля"
	body := composePasswordResetBody(notification)
	recipients := []string{recipient}

	if !n.configured() {
		log.Printf("[email:fallback] кому=%s | тема=%q\n%s", recipient, subject, body)
		return nil
	}

	message := buildMessage(n.from, recipients, subject, body)
	address := fmt.Sprintf("%s:%d", n.host, n.port)
	auth := smtp.PlainAuth("", n.username, n.password, n.host)

	return smtp.SendMail(address, auth, n.from, recipients, message)
}

func composeBody(n port.SpecialistNotification) string {
	name := strings.TrimSpace(n.ClientName)
	if name == "" {
		name = n.ClientEmail
	}

	var builder strings.Builder
	builder.WriteString(fmt.Sprintf("В графе эмоционального состояния клиента %s появилась новая вершина.\n\n", name))
	builder.WriteString(fmt.Sprintf("Дата: %s\n", n.Date.Format("02.01.2006 15:04")))
	builder.WriteString(fmt.Sprintf("Степень необходимости в поддержке (балл): %.2f\n", n.Score))
	if strings.TrimSpace(n.Level) != "" {
		builder.WriteString(fmt.Sprintf("Уровень: %s\n", n.Level))
	}
	if strings.TrimSpace(n.ClientEmail) != "" {
		builder.WriteString(fmt.Sprintf("Почта клиента: %s\n", n.ClientEmail))
	}
	builder.WriteString("\nВершина появляется после повторного прохождения теста на психотип и теста на текущее эмоциональное состояние.\n")
	return builder.String()
}

// buildMessage собирает письмо RFC 5322 с заголовками в UTF-8 (RFC 2047), чтобы
// корректно передавать кириллицу.
func composePasswordResetBody(n port.PasswordResetNotification) string {
	name := strings.TrimSpace(n.Name)
	if name == "" {
		name = strings.TrimSpace(n.Recipient)
	}

	var builder strings.Builder
	if name != "" {
		builder.WriteString(fmt.Sprintf("Здравствуйте, %s.\n\n", name))
	}
	builder.WriteString("Для восстановления пароля перейдите по ссылке:\n")
	builder.WriteString(strings.TrimSpace(n.ResetURL))
	builder.WriteString("\n\n")
	if !n.ExpiresAt.IsZero() {
		builder.WriteString(fmt.Sprintf("Ссылка действует до %s.\n", n.ExpiresAt.Format("02.01.2006 15:04")))
	}
	builder.WriteString("Если вы не запрашивали восстановление пароля, просто игнорируйте это письмо.\n")
	return builder.String()
}

func buildMessage(from string, to []string, subject, body string) []byte {
	headers := []string{
		"From: " + from,
		"To: " + strings.Join(to, ", "),
		"Subject: " + encodeHeader(subject),
		"MIME-Version: 1.0",
		"Content-Type: text/plain; charset=UTF-8",
		"Content-Transfer-Encoding: base64",
		"Date: " + time.Now().Format(time.RFC1123Z),
	}
	encodedBody := base64.StdEncoding.EncodeToString([]byte(body))

	var builder strings.Builder
	builder.WriteString(strings.Join(headers, "\r\n"))
	builder.WriteString("\r\n\r\n")
	// Тело base64 принято разбивать на строки по 76 символов.
	for len(encodedBody) > 76 {
		builder.WriteString(encodedBody[:76])
		builder.WriteString("\r\n")
		encodedBody = encodedBody[76:]
	}
	builder.WriteString(encodedBody)
	builder.WriteString("\r\n")
	return []byte(builder.String())
}

func encodeHeader(value string) string {
	return "=?UTF-8?B?" + base64.StdEncoding.EncodeToString([]byte(value)) + "?="
}
