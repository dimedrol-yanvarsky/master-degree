// Пакет email — инфраструктурная реализация оповещения специалистов по почте
// (порт port.SpecialistNotifier). Если SMTP не настроен, письмо не теряется, а
// пишется в лог — это позволяет демонстрировать логику без реального почтового
// сервера.
package email

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"html"
	"io"
	"log"
	"net"
	"net/http"
	"net/smtp"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/usecases/port"
)

const brandLogoContentID = "lumen-brand-logo"
const smtpSendTimeout = 30 * time.Second
const defaultResendEndpoint = "https://api.resend.com/emails"

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
	return n.host != "" && n.from != "" && n.username != "" && n.password != ""
}

func (n *SMTPNotifier) resendEnabled() bool {
	return strings.EqualFold(strings.TrimSpace(os.Getenv("EMAIL_TRANSPORT")), "resend") ||
		strings.TrimSpace(os.Getenv("RESEND_API_KEY")) != ""
}

func (n *SMTPNotifier) deliveryFrom() string {
	return firstNonEmpty(
		strings.TrimSpace(os.Getenv("RESEND_FROM")),
		strings.TrimSpace(os.Getenv("EMAIL_FROM")),
		n.from,
	)
}

// NotifyNewGraphPoint ставит оповещение всем указанным специалистам в отправку.
// Ошибка SMTP не должна ломать сохранение результата и вершины графа.
func (n *SMTPNotifier) NotifyNewGraphPoint(_ context.Context, notification port.SpecialistNotification) error {
	recipients := cleanRecipients(notification.Recipients)
	if len(recipients) == 0 {
		return nil
	}

	subject := graphPointSubject(notification.ClientName)
	body := composeBody(notification)
	logo, hasLogo := readBrandLogo()
	htmlBody := composeHTMLBody(notification, hasLogo)
	from := n.deliveryFrom()

	if n.resendEnabled() {
		message := buildMessage(from, recipients, subject, body, htmlBody, logo)
		log.Printf("[email:queued] transport=resend кому=%s | тема=%q", strings.Join(recipients, ", "), subject)
		go func() {
			ctx, cancel := context.WithTimeout(context.Background(), smtpSendTimeout)
			defer cancel()

			if err := n.sendResend(ctx, recipients, subject, body, htmlBody, logo); err != nil {
				log.Printf("[email:error] resend: %v", err)
				logOutboxCopy(subject, message)
				return
			}
			log.Printf("[email:sent] transport=resend кому=%s | тема=%q", strings.Join(recipients, ", "), subject)
		}()
		return nil
	}

	if !n.configured() {
		log.Printf("[email:fallback] кому=%s | тема=%q\n%s", strings.Join(recipients, ", "), subject, body)
		logOutboxCopy(subject, buildMessage(from, recipients, subject, body, htmlBody, logo))
		return nil
	}

	message := buildMessage(from, recipients, subject, body, htmlBody, logo)

	log.Printf("[email:queued] кому=%s | тема=%q", strings.Join(recipients, ", "), subject)
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), smtpSendTimeout)
		defer cancel()

		if err := n.send(ctx, recipients, message); err != nil {
			log.Printf("[email:error] не удалось отправить уведомление о новой вершине графа: %v", err)
			logOutboxCopy(subject, message)
			return
		}
		log.Printf("[email:sent] кому=%s | тема=%q", strings.Join(recipients, ", "), subject)
	}()
	return nil
}

func (n *SMTPNotifier) SendPasswordReset(ctx context.Context, notification port.PasswordResetNotification) error {
	recipient := strings.TrimSpace(notification.Recipient)
	if recipient == "" {
		return nil
	}

	subject := "Восстановление пароля"
	body := composePasswordResetBody(notification)
	recipients := []string{recipient}
	from := n.deliveryFrom()

	if n.resendEnabled() {
		message := buildMessage(from, recipients, subject, body, "", nil)
		ctx, cancel := context.WithTimeout(ctx, smtpSendTimeout)
		defer cancel()

		if err := n.sendResend(ctx, recipients, subject, body, "", nil); err != nil {
			logOutboxCopy(subject, message)
			return err
		}
		return nil
	}

	if !n.configured() {
		log.Printf("[email:fallback] кому=%s | тема=%q\n%s", recipient, subject, body)
		return nil
	}

	message := buildMessage(from, recipients, subject, body, "", nil)

	ctx, cancel := context.WithTimeout(ctx, smtpSendTimeout)
	defer cancel()

	if err := n.send(ctx, recipients, message); err != nil {
		logOutboxCopy(subject, message)
		return err
	}
	return nil
}

type resendEmailRequest struct {
	From        string             `json:"from"`
	To          []string           `json:"to"`
	Subject     string             `json:"subject"`
	Text        string             `json:"text,omitempty"`
	HTML        string             `json:"html,omitempty"`
	Attachments []resendAttachment `json:"attachments,omitempty"`
}

type resendAttachment struct {
	Filename           string `json:"filename"`
	Content            string `json:"content"`
	ContentType        string `json:"content_type,omitempty"`
	ContentID          string `json:"content_id,omitempty"`
	ContentDisposition string `json:"content_disposition,omitempty"`
}

func (n *SMTPNotifier) sendResend(ctx context.Context, recipients []string, subject, textBody, htmlBody string, inlineLogo []byte) error {
	apiKey := strings.TrimSpace(os.Getenv("RESEND_API_KEY"))
	if apiKey == "" {
		return errors.New("resend api key is not configured")
	}
	from := n.deliveryFrom()
	if from == "" {
		return errors.New("email sender is not configured")
	}

	payload := resendEmailRequest{
		From:    from,
		To:      recipients,
		Subject: subject,
		Text:    textBody,
		HTML:    htmlBody,
	}
	if len(inlineLogo) > 0 {
		payload.Attachments = []resendAttachment{{
			Filename:           "brand-logo.png",
			Content:            base64.StdEncoding.EncodeToString(inlineLogo),
			ContentType:        "image/png",
			ContentID:          brandLogoContentID,
			ContentDisposition: "inline",
		}}
	}

	content, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	endpoint := firstNonEmpty(strings.TrimSpace(os.Getenv("RESEND_ENDPOINT")), defaultResendEndpoint)
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(content))
	if err != nil {
		return err
	}
	request.Header.Set("Authorization", "Bearer "+apiKey)
	request.Header.Set("Content-Type", "application/json")

	response, err := http.DefaultClient.Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()

	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		body, _ := io.ReadAll(io.LimitReader(response.Body, 4096))
		return fmt.Errorf("resend api returned %s: %s", response.Status, strings.TrimSpace(string(body)))
	}
	return nil
}

func (n *SMTPNotifier) send(ctx context.Context, recipients []string, message []byte) error {
	primary := n.port
	if primary == 0 {
		primary = 587
	}

	// Пробуем основной порт, затем альтернативный порт Gmail. Многие сети режут
	// 587 (STARTTLS), но пропускают 465 (implicit TLS) — и наоборот, поэтому при
	// таймауте на одном порту автоматически пробуем второй.
	ports := []int{primary}
	switch primary {
	case 587:
		ports = append(ports, 465)
	case 465:
		ports = append(ports, 587)
	}

	var lastErr error
	for _, port := range ports {
		attemptCtx, cancel := context.WithTimeout(ctx, 12*time.Second)
		err := n.sendVia(attemptCtx, port, recipients, message)
		cancel()
		if err == nil {
			return nil
		}
		lastErr = err
		log.Printf("[email:retry] порт %d не сработал: %v", port, err)
	}
	return lastErr
}

func (n *SMTPNotifier) sendVia(ctx context.Context, port int, recipients []string, message []byte) error {
	address := fmt.Sprintf("%s:%d", n.host, port)
	if port == 465 {
		return n.sendImplicitTLS(ctx, address, recipients, message)
	}
	return n.sendStartTLS(ctx, address, recipients, message)
}

func (n *SMTPNotifier) sendStartTLS(ctx context.Context, address string, recipients []string, message []byte) error {
	var dialer net.Dialer
	conn, err := dialer.DialContext(ctx, "tcp", address)
	if err != nil {
		return err
	}
	if deadline, ok := ctx.Deadline(); ok {
		_ = conn.SetDeadline(deadline)
	}

	client, err := smtp.NewClient(conn, n.host)
	if err != nil {
		_ = conn.Close()
		return err
	}
	defer client.Close()

	if ok, _ := client.Extension("STARTTLS"); ok {
		if err := client.StartTLS(&tls.Config{ServerName: n.host, MinVersion: tls.VersionTLS12}); err != nil {
			return err
		}
	}

	return n.sendWithClient(client, smtp.PlainAuth("", n.username, n.password, n.host), recipients, message)
}

func (n *SMTPNotifier) sendImplicitTLS(ctx context.Context, address string, recipients []string, message []byte) error {
	var dialer net.Dialer
	tlsDialer := tls.Dialer{
		NetDialer: &dialer,
		Config:    &tls.Config{ServerName: n.host, MinVersion: tls.VersionTLS12},
	}
	conn, err := tlsDialer.DialContext(ctx, "tcp", address)
	if err != nil {
		return err
	}
	if deadline, ok := ctx.Deadline(); ok {
		_ = conn.SetDeadline(deadline)
	}

	client, err := smtp.NewClient(conn, n.host)
	if err != nil {
		_ = conn.Close()
		return err
	}
	defer client.Close()

	return n.sendWithClient(client, plainTLSAuth{username: n.username, password: n.password}, recipients, message)
}

func (n *SMTPNotifier) sendWithClient(client *smtp.Client, auth smtp.Auth, recipients []string, message []byte) error {
	if err := client.Auth(auth); err != nil {
		return err
	}
	if err := client.Mail(n.from); err != nil {
		return err
	}
	for _, recipient := range recipients {
		if err := client.Rcpt(recipient); err != nil {
			return err
		}
	}

	writer, err := client.Data()
	if err != nil {
		return err
	}
	if _, err := writer.Write(message); err != nil {
		_ = writer.Close()
		return err
	}
	if err := writer.Close(); err != nil {
		return err
	}

	return client.Quit()
}

type plainTLSAuth struct {
	username string
	password string
}

func (a plainTLSAuth) Start(_ *smtp.ServerInfo) (string, []byte, error) {
	return "PLAIN", []byte("\x00" + a.username + "\x00" + a.password), nil
}

func (a plainTLSAuth) Next(_ []byte, more bool) ([]byte, error) {
	if more {
		return nil, errors.New("unexpected SMTP auth challenge")
	}
	return nil, nil
}

func cleanRecipients(recipients []string) []string {
	cleaned := make([]string, 0, len(recipients))
	for _, recipient := range recipients {
		recipient = strings.TrimSpace(recipient)
		if recipient != "" {
			cleaned = append(cleaned, recipient)
		}
	}
	return cleaned
}

func graphPointSubject(clientName string) string {
	name := strings.TrimSpace(clientName)
	if name == "" {
		return "Новая вершина графа"
	}
	return fmt.Sprintf("Новая вершина графа клиента: %s", name)
}

func composeBody(n port.SpecialistNotification) string {
	name := strings.TrimSpace(n.ClientName)
	if name == "" {
		name = n.ClientEmail
	}

	var builder strings.Builder
	builder.WriteString("В графе эмоционального состояния появилась новая вершина.\n\n")
	if strings.TrimSpace(name) != "" {
		builder.WriteString(fmt.Sprintf("Клиент: %s\n", name))
	}
	if strings.TrimSpace(n.ClientEmail) != "" {
		builder.WriteString(fmt.Sprintf("Почта клиента: %s\n", n.ClientEmail))
	}
	builder.WriteString(fmt.Sprintf("Дата вершины: %s\n", n.Date.Format("02.01.2006 15:04")))
	builder.WriteString(fmt.Sprintf("Набранный балл: %.0f\n", n.Score))
	if strings.TrimSpace(n.Level) != "" {
		builder.WriteString(fmt.Sprintf("Степень необходимости в поддержке: %s\n", n.Level))
	}
	return builder.String()
}

func composeHTMLBody(n port.SpecialistNotification, hasLogo bool) string {
	name := strings.TrimSpace(n.ClientName)
	if name == "" {
		name = strings.TrimSpace(n.ClientEmail)
	}
	if name == "" {
		name = "клиента"
	}

	pointDate := n.Date.Format("02.01.2006 15:04")
	level := firstNonEmpty(strings.TrimSpace(n.Level), "Уровень не указан")
	logoHTML := `<span style="display:inline-block;width:48px;height:48px;color:#2f7d3b;font-size:24px;font-weight:700;line-height:48px;text-align:center;">Л</span>`
	if hasLogo {
		logoHTML = `<img src="cid:` + brandLogoContentID + `" width="48" height="48" alt="Lumen" style="display:block;width:48px;height:48px;border:0;border-radius:11px;">`
	}

	return fmt.Sprintf(`<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Новая вершина графа эмоционального состояния</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body, table, td, div, h1, p, span, a { font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif !important; }
  </style>
</head>
<body style="margin:0;padding:0;background:#f4f6f1;font-family:'Geist',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#151714;">
  <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="background:#f4f6f1;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e3eadd;border-radius:24px;overflow:hidden;box-shadow:0 18px 50px rgba(34,48,29,.10);">
          <tr>
            <td style="padding:24px 30px;background:#ffffff;border-bottom:1px solid #eef2ea;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <table role="presentation" cellspacing="0" cellpadding="0" style="background:#ffffff;border:1px solid #e7efe2;border-radius:14px;box-shadow:0 8px 20px rgba(47,125,59,.10);">
                      <tr><td style="padding:5px;line-height:0;font-size:0;">%s</td></tr>
                    </table>
                  </td>
                  <td style="padding-left:13px;vertical-align:middle;font-size:14px;font-weight:600;letter-spacing:.01em;color:#3f463a;">Граф эмоционального состояния</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:30px 30px 0;">
              <h1 style="margin:0 0 12px;font-size:27px;line-height:1.16;font-weight:700;color:#111411;">Новая вершина графа</h1>
              <p style="margin:0;font-size:15px;line-height:1.62;color:#6f766a;">В графе эмоционального состояния клиента <strong style="color:#151714;font-weight:700;">%s</strong> рассчитана новая вершина.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 30px 6px;">
              <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="border:1px solid #d6e7d2;border-radius:18px;background:#f2f8f0;">
                <tr>
                  <td style="padding:22px 24px;">
                    <div style="font-size:11.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#2f7d3b;">%s</div>
                    <div style="margin-top:16px;font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#7f8a78;">Набранный балл</div>
                    <div style="margin-top:5px;">
                      <span style="font-size:48px;line-height:1;font-weight:700;letter-spacing:-1px;color:#2f7d3b;">%.0f</span>
                      <span style="font-size:17px;font-weight:600;color:#8a9085;">&nbsp;/ 100</span>
                    </div>
                    <div style="margin-top:16px;font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#7f8a78;">Степень необходимости в поддержке</div>
                    <div style="margin-top:7px;">
                      <span style="display:inline-block;padding:7px 16px;border-radius:999px;background:#e3f1e0;border:1px solid #c7e0c2;font-size:14px;font-weight:700;color:#246b30;">%s</span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 30px 30px;">
              <p style="margin:0;padding-top:18px;border-top:1px solid #eef2ea;font-size:12.5px;line-height:1.55;color:#9aa093;">Письмо отправлено автоматически специалистам, с которыми клиент сейчас сотрудничает.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
		logoHTML,
		html.EscapeString(name),
		html.EscapeString(pointDate),
		n.Score,
		html.EscapeString(level),
	)
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

func buildMessage(from string, to []string, subject, body, htmlBody string, inlineLogo []byte) []byte {
	headers := []string{
		"From: " + from,
		"To: " + strings.Join(to, ", "),
		"Subject: " + encodeHeader(subject),
		"MIME-Version: 1.0",
		"Date: " + time.Now().Format(time.RFC1123Z),
	}

	var builder strings.Builder

	// Только текст — простое письмо text/plain.
	if strings.TrimSpace(htmlBody) == "" {
		headers = append(headers,
			"Content-Type: text/plain; charset=UTF-8",
			"Content-Transfer-Encoding: base64",
		)
		builder.WriteString(strings.Join(headers, "\r\n"))
		builder.WriteString("\r\n\r\n")
		writeBase64Lines(&builder, body)
		return []byte(builder.String())
	}

	// Каноническая структура для HTML-письма с встроенными картинками:
	//   multipart/alternative
	//   ├── text/plain                (запасной текст)
	//   └── multipart/related         (HTML + ресурсы, на которые он ссылается)
	//       ├── text/html
	//       └── image/png (inline, cid:)
	// Именно вложенность related ВНУТРИ html-ветки alternative заставляет
	// почтовые клиенты (Gmail, Yandex, Mail.ru, Outlook) рисовать письмо в теле,
	// а не прикладывать HTML отдельным файлом.
	now := time.Now()
	altBoundary := "lumen-alt-" + strconvTime(now)
	relatedBoundary := "lumen-rel-" + strconvTime(now)

	headers = append(headers, "Content-Type: multipart/alternative; boundary="+altBoundary)
	builder.WriteString(strings.Join(headers, "\r\n"))
	builder.WriteString("\r\n\r\n")

	// Запасная текстовая версия.
	builder.WriteString("--" + altBoundary + "\r\n")
	builder.WriteString("Content-Type: text/plain; charset=UTF-8\r\n")
	builder.WriteString("Content-Transfer-Encoding: base64\r\n\r\n")
	writeBase64Lines(&builder, body)
	builder.WriteString("\r\n")

	if len(inlineLogo) > 0 {
		// HTML вместе со встроенным логотипом.
		builder.WriteString("--" + altBoundary + "\r\n")
		builder.WriteString("Content-Type: multipart/related; boundary=" + relatedBoundary + "; type=\"text/html\"\r\n\r\n")

		builder.WriteString("--" + relatedBoundary + "\r\n")
		builder.WriteString("Content-Type: text/html; charset=UTF-8\r\n")
		builder.WriteString("Content-Transfer-Encoding: base64\r\n\r\n")
		writeBase64Lines(&builder, htmlBody)
		builder.WriteString("\r\n")

		builder.WriteString("--" + relatedBoundary + "\r\n")
		builder.WriteString("Content-Type: image/png\r\n")
		builder.WriteString("Content-Transfer-Encoding: base64\r\n")
		builder.WriteString("Content-ID: <" + brandLogoContentID + ">\r\n")
		builder.WriteString("Content-Disposition: inline; filename=\"brand-logo.png\"\r\n\r\n")
		writeBase64Bytes(&builder, inlineLogo)
		builder.WriteString("\r\n--" + relatedBoundary + "--\r\n")
	} else {
		// HTML без встроенных ресурсов.
		builder.WriteString("--" + altBoundary + "\r\n")
		builder.WriteString("Content-Type: text/html; charset=UTF-8\r\n")
		builder.WriteString("Content-Transfer-Encoding: base64\r\n\r\n")
		writeBase64Lines(&builder, htmlBody)
		builder.WriteString("\r\n")
	}

	builder.WriteString("--" + altBoundary + "--\r\n")
	return []byte(builder.String())
}

func writeBase64Lines(builder *strings.Builder, value string) {
	writeWrappedBase64(builder, base64.StdEncoding.EncodeToString([]byte(value)))
}

func writeBase64Bytes(builder *strings.Builder, value []byte) {
	writeWrappedBase64(builder, base64.StdEncoding.EncodeToString(value))
}

func writeWrappedBase64(builder *strings.Builder, encoded string) {
	for len(encoded) > 76 {
		builder.WriteString(encoded[:76])
		builder.WriteString("\r\n")
		encoded = encoded[76:]
	}
	builder.WriteString(encoded)
	builder.WriteString("\r\n")
}

func readBrandLogo() ([]byte, bool) {
	for _, path := range []string{
		"../src/shared/assets/brand-logo.png",
		"src/shared/assets/brand-logo.png",
	} {
		content, err := os.ReadFile(path)
		if err == nil && len(content) > 0 {
			return content, true
		}
	}
	return nil, false
}

func logOutboxCopy(subject string, message []byte) {
	path, err := writeOutboxMessage(subject, message)
	if err != nil {
		log.Printf("[email:outbox:error] failed to save email copy: %v", err)
		return
	}
	log.Printf("[email:outbox] saved email copy: %s", path)
}

func writeOutboxMessage(subject string, message []byte) (string, error) {
	dir := strings.TrimSpace(os.Getenv("EMAIL_OUTBOX_DIR"))
	if dir == "" {
		dir = filepath.Join("tmp", "email-outbox")
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}

	name := fmt.Sprintf("email-%s-%s.eml", time.Now().Format("20060102-150405.000000000"), safeFilenamePart(subject))
	path := filepath.Join(dir, name)
	if err := os.WriteFile(path, message, 0o644); err != nil {
		return "", err
	}
	return path, nil
}

func safeFilenamePart(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	var builder strings.Builder
	for _, r := range value {
		switch {
		case r >= 'a' && r <= 'z':
			builder.WriteRune(r)
		case r >= '0' && r <= '9':
			builder.WriteRune(r)
		case r == '-' || r == '_':
			builder.WriteRune(r)
		case r == ' ' || r == '.' || r == ':':
			builder.WriteRune('-')
		}
		if builder.Len() >= 48 {
			break
		}
	}
	part := strings.Trim(builder.String(), "-")
	if part == "" {
		return "message"
	}
	return part
}

func encodeHeader(value string) string {
	return "=?UTF-8?B?" + base64.StdEncoding.EncodeToString([]byte(value)) + "?="
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}

func strconvTime(value time.Time) string {
	return fmt.Sprintf("%d", value.UnixNano())
}
