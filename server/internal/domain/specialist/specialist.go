// Пакет specialist описывает публичный профиль специалиста в каталоге.
package specialist

// Profile — карточка специалиста, видимая клиенту в каталоге.
type Profile struct {
	ID          string
	Name        string
	Experience  string
	Description string
	Color       string
}
