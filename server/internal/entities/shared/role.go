package shared

// Role — категории пользователей из модели разграничения доступа (ТЗ §3.2):
// гость, клиент, специалист и администратор.
type Role string

const (
	RoleGuest      Role = "guest"
	RoleClient     Role = "client"
	RoleSpecialist Role = "specialist"
	RoleAdmin      Role = "admin"
)

// Assignable сообщает, можно ли присвоить роль реальному аккаунту
// (гость — это отсутствие аутентифицированного аккаунта).
func (r Role) Assignable() bool {
	switch r {
	case RoleClient, RoleSpecialist, RoleAdmin:
		return true
	default:
		return false
	}
}

// AccountStatus — состояние жизненного цикла аккаунта.
type AccountStatus string

const (
	AccountActive  AccountStatus = "active"
	AccountBlocked AccountStatus = "blocked"
	AccountDeleted AccountStatus = "deleted"
)

// CanAuthenticate сообщает, может ли аккаунт в этом статусе войти в систему.
func (s AccountStatus) CanAuthenticate() bool {
	return s == AccountActive
}
