// Пакет recommendation — доменная модель базы рекомендаций: дерево разделов и
// блоков рекомендаций и их назначения по сотрудничествам.
package recommendation

import "time"

// Block — узел дерева рекомендаций. Это либо раздел (заданы SectionTitle/
// SectionNumber, Text — nil), либо лист-рекомендация (задан Text, поля раздела —
// nil); документоориентированная модель (РПЗ §2.2.1).
type Block struct {
	ID            string
	ParentID      *string
	SectionTitle  *string
	SectionNumber *string
	Text          *string
	AuthorID      string
	Status        string
	SortOrder     int
}

// IsSection сообщает, что блок группирует другие блоки, а не содержит текст
// рекомендации.
func (b Block) IsSection() bool {
	return b.SectionTitle != nil
}

// Assignment связывает блок рекомендации с сотрудничеством специалист↔клиент.
type Assignment struct {
	ID              string
	BlockID         string
	CollaborationID string
	SpecialistID    string
	ClientID        string
	Text            string
	AssignedAt      time.Time
	Status          string
}
