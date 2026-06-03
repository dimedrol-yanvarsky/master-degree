// Пакет email — инфраструктурная реализация оповещения специалистов по почте
// (порт port.SpecialistNotifier). Если SMTP не настроен, письмо не теряется, а
// пишется в лог — это позволяет демонстрировать логику без реального почтового
// сервера.
package email

import (
	"context"
	"crypto/tls"
	"encoding/base64"
	"errors"
	"fmt"
	"html"
	"log"
	"net"
	"net/smtp"
	"os"
	"strings"
	"time"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/usecases/port"
)

const brandLogoContentID = "lumen-brand-logo"
const smtpSendTimeout = 15 * time.Second

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

	if !n.configured() {
		log.Printf("[email:fallback] кому=%s | тема=%q\n%s", strings.Join(recipients, ", "), subject, body)
		return nil
	}

	message := buildMessage(n.from, recipients, subject, body, htmlBody, logo)

	log.Printf("[email:queued] кому=%s | тема=%q", strings.Join(recipients, ", "), subject)
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), smtpSendTimeout)
		defer cancel()

		if err := n.send(ctx, recipients, message); err != nil {
			log.Printf("[email:error] не удалось отправить уведомление о новой вершине графа: %v", err)
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

	if !n.configured() {
		log.Printf("[email:fallback] кому=%s | тема=%q\n%s", recipient, subject, body)
		return nil
	}

	message := buildMessage(n.from, recipients, subject, body, "", nil)

	ctx, cancel := context.WithTimeout(ctx, smtpSendTimeout)
	defer cancel()

	return n.send(ctx, recipients, message)
}

func (n *SMTPNotifier) send(ctx context.Context, recipients []string, message []byte) error {
	port := n.port
	if port == 0 {
		port = 587
	}

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
	logoHTML := `<span style="display:inline-block;color:#2f7d3b;font-size:24px;font-weight:800;line-height:52px;letter-spacing:0;">Л</span>`
	if hasLogo {
		logoHTML = `<img src="cid:` + brandLogoContentID + `" width="52" height="52" alt="Lumen" style="display:block;width:52px;height:52px;border:0;object-fit:cover;">`
	}

	return fmt.Sprintf(`<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Новая вершина графа эмоционального состояния</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#151714;">
  <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="background:#f4f6f1;padding:36px 14px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #dfe6d8;border-radius:20px;overflow:hidden;box-shadow:0 16px 48px rgba(34,48,29,.10);">
          <tr>
            <td style="padding:26px 28px 18px;background:#ffffff;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="width:52px;height:52px;border-radius:16px;background:#e8f5e8;border:1px solid #c7dcc5;text-align:center;vertical-align:middle;">%s</td>
                  <td style="padding-left:14px;vertical-align:middle;">
                    <div style="font-size:18px;font-weight:800;line-height:1.2;color:#151714;letter-spacing:0;">Lumen</div>
                    <div style="font-size:13px;line-height:1.45;color:#6f766a;">Граф эмоционального состояния</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 22px;">
              <h1 style="margin:0 0 10px;font-size:28px;line-height:1.12;color:#111411;letter-spacing:0;">Новая вершина графа</h1>
              <p style="margin:0;font-size:15px;line-height:1.6;color:#6f766a;">В графе эмоционального состояния клиента <strong style="color:#151714;">%s</strong> рассчитана новая вершина.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 24px;">
              <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="border-radius:16px;background:#2f7d3b;">
                <tr>
                  <td style="padding:22px 24px;color:#ffffff;">
                    <div style="font-size:13px;line-height:1.4;color:#d6ecd6;">Новая вершина от %s</div>
                    <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="margin-top:14px;">
                      <tr>
                        <td style="vertical-align:bottom;">
                          <div style="font-size:13px;font-weight:700;color:#d6ecd6;">Набранный балл</div>
                          <div style="margin-top:6px;font-size:44px;line-height:1;font-weight:800;letter-spacing:0;color:#ffffff;">%.0f</div>
                        </td>
                        <td align="right" style="vertical-align:bottom;">
                          <div style="font-size:13px;font-weight:700;color:#d6ecd6;">Степень необходимости</div>
                          <div style="margin-top:8px;">
                            <span style="display:inline-block;padding:8px 16px;border-radius:999px;background:rgba(255,255,255,.16);font-size:15px;font-weight:700;color:#ffffff;">%s</span>
                          </div>
                        </td>
                      </tr>
                    </table>
                    <div style="margin-top:16px;padding-top:14px;border-top:1px solid rgba(255,255,255,.18);font-size:12.5px;line-height:1.45;color:#cfe6d0;">
                      Степень необходимости клиента в поддержке рассчитана алгоритмом по новой вершине графа.
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px;">
              <p style="margin:0;font-size:13px;line-height:1.55;color:#7f8679;">Письмо отправлено автоматически специалистам, с которыми клиент сейчас сотрудничает.</p>
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

	altBoundary := "lumen-alt-" + strconvTime(time.Now())
	relatedBoundary := "lumen-related-" + strconvTime(time.Now())
	if len(inlineLogo) > 0 {
		headers = append(headers, "Content-Type: multipart/related; boundary="+relatedBoundary)
	} else {
		headers = append(headers, "Content-Type: multipart/alternative; boundary="+altBoundary)
	}
	builder.WriteString(strings.Join(headers, "\r\n"))
	builder.WriteString("\r\n\r\n")

	if len(inlineLogo) > 0 {
		builder.WriteString("--" + relatedBoundary + "\r\n")
		builder.WriteString("Content-Type: multipart/alternative; boundary=" + altBoundary + "\r\n\r\n")
	}

	builder.WriteString("--" + altBoundary + "\r\n")
	builder.WriteString("Content-Type: text/plain; charset=UTF-8\r\n")
	builder.WriteString("Content-Transfer-Encoding: base64\r\n\r\n")
	writeBase64Lines(&builder, body)
	builder.WriteString("\r\n")

	builder.WriteString("--" + altBoundary + "\r\n")
	builder.WriteString("Content-Type: text/html; charset=UTF-8\r\n")
	builder.WriteString("Content-Transfer-Encoding: base64\r\n\r\n")
	writeBase64Lines(&builder, htmlBody)
	builder.WriteString("\r\n")
	builder.WriteString("--" + altBoundary + "--\r\n")

	if len(inlineLogo) > 0 {
		builder.WriteString("\r\n--" + relatedBoundary + "\r\n")
		builder.WriteString("Content-Type: image/png; name=\"brand-logo.png\"\r\n")
		builder.WriteString("Content-Transfer-Encoding: base64\r\n")
		builder.WriteString("Content-ID: <" + brandLogoContentID + ">\r\n")
		builder.WriteString("Content-Disposition: inline; filename=\"brand-logo.png\"\r\n\r\n")
		writeBase64Bytes(&builder, inlineLogo)
		builder.WriteString("\r\n--" + relatedBoundary + "--\r\n")
	}
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
