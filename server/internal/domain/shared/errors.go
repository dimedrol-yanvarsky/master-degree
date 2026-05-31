// Пакет shared содержит общие примитивы домена: ошибки-сигналы, роли и
// статусы аккаунтов.
package shared

import "errors"

// Доменные ошибки-сигналы. HTTP-слой сопоставляет их со статусами
// (см. interfaces/http/middleware.ErrorHandler), поэтому use case остаются
// независимыми от транспорта.
var (
	// ErrValidation — вход нарушает доменное правило (-> 400).
	ErrValidation = errors.New("validation failed")
	// ErrNotFound — запрошенный ресурс не существует (-> 404).
	ErrNotFound = errors.New("resource not found")
	// ErrConflict — конфликт уникальности или состояния (-> 409).
	ErrConflict = errors.New("resource conflict")
	// ErrUnauthorized — отсутствует или неверна личность (-> 401).
	ErrUnauthorized = errors.New("authentication required")
	// ErrForbidden — действие аутентифицировано, но запрещено (-> 403).
	ErrForbidden = errors.New("access denied")
)
