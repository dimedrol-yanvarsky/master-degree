// Пакет test — доменная модель подсистемы тестирования: психодиагностические
// опросники (BFI-2, BDS, ...) и их пройденные результаты.
package test

import "time"

// AnswerOption — вариант на шкале ответов теста.
type AnswerOption struct {
	Value int
	Label string
}

// Question — один пункт опросника.
type Question struct {
	Index int
	Text  string
}

// Test — карточка опросника. Вопросы встроены, т.к. вне своего теста не имеют
// смысла (документоориентированная модель, РПЗ §2.2.1).
type Test struct {
	ID          string
	Code        string
	Title       string
	Description string
	AuthorID    string
	Questions   []Question
	Scale       []AnswerOption
	Status      string
	CreatedAt   time.Time
}

// Answer — вариант, выбранный пользователем для конкретного вопроса.
type Answer struct {
	QuestionIndex int
	Value         int
}

// TestResult — сохранённое прохождение теста пользователем: выбранные ответы и
// вычисленные балл/интерпретация.
type TestResult struct {
	ID          string
	UserID      string
	TestID      string
	Answers     []Answer
	Score       float64
	Level       string
	CompletedAt time.Time
}
