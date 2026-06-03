// Команда sendtest — разовая отправка тестового письма о новой вершине графа,
// чтобы вживую посмотреть вёрстку в почтовом клиенте. Не часть приложения.
package main

import (
	"context"
	"log"
	"os"
	"time"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/frameworks/config"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/frameworks/email"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/usecases/port"
)

func main() {
	recipient := "golubevdv2003@gmail.com"
	if len(os.Args) > 1 && os.Args[1] != "" {
		recipient = os.Args[1]
	}

	cfg := config.Load()
	log.Printf("SMTP host=%s port=%d from=%s user=%s -> %s",
		cfg.SMTP.Host, cfg.SMTP.Port, cfg.SMTP.From, cfg.SMTP.Username, recipient)

	notifier := email.NewSMTPNotifier(
		cfg.SMTP.Host, cfg.SMTP.Port, cfg.SMTP.Username, cfg.SMTP.Password, cfg.SMTP.From,
	)

	err := notifier.NotifyNewGraphPoint(context.Background(), port.SpecialistNotification{
		ClientName:  "Голубев Дмитрий Викторович",
		ClientEmail: "golubevdv2003@gmail.com",
		Recipients:  []string{recipient},
		Score:       62,
		Level:       "средняя необходимость",
		Date:        time.Now(),
	})
	if err != nil {
		log.Fatalf("NotifyNewGraphPoint вернул ошибку: %v", err)
	}

	// Реальная отправка идёт в фоновой горутине (таймаут 15s) — ждём её.
	time.Sleep(20 * time.Second)
	log.Printf("sendtest: завершено")
}
