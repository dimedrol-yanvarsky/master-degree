// Пакет collaboration — доменная модель терапевтической связи специалист↔клиент,
// которая разграничивает доступ к данным клиента.
package collaboration

import "time"

// Status — жизненный цикл заявки на сотрудничество.
type Status string

const (
	StatusPending           Status = "pending"
	StatusPendingClient     Status = "pending_client"
	StatusPendingSpecialist Status = "pending_specialist"
	StatusAccepted          Status = "accepted"
	StatusRejected          Status = "rejected"
	StatusFinished          Status = "finished"
)

// Collaboration связывает специалиста и клиента. Принятое сотрудничество
// открывает специалисту результаты и граф эмоционального состояния клиента.
type Collaboration struct {
	ID           string
	SpecialistID string
	ClientID     string
	StartedAt    time.Time
	Status       Status
}

// GrantsAccess сообщает, открывает ли сотрудничество специалисту доступ к
// защищённым данным клиента в данный момент.
func (c Collaboration) GrantsAccess() bool {
	return c.Status == StatusAccepted
}

func (c Collaboration) Pending() bool {
	return c.Status == StatusPending || c.Status == StatusPendingClient || c.Status == StatusPendingSpecialist
}

type ClientSpecialist struct {
	ID                    string
	SpecialistID          string
	SpecialistName        string
	SpecialistExperience  string
	SpecialistDescription string
	StartedAt             time.Time
	Status                Status
}

type WorkRequest struct {
	ID                     string
	SpecialistID           string
	ClientID               string
	CounterpartID          string
	CounterpartName        string
	CounterpartEmail       string
	CounterpartRole        string
	CounterpartDescription string
	StartedAt              time.Time
	Status                 Status
	Direction              string
	CanRespond             bool
}
