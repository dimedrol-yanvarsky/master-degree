package testing

import (
	stdtesting "testing"

	domaintest "github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/test"
)

func TestBFI2DomainsRoundToHundredths(t *stdtesting.T) {
	values := []int{
		5, 4, 1, 5, 1, 4, 5, 4, 3, 5,
		1, 3, 5, 1, 5, 4, 1, 4, 3, 4,
		4, 2, 2, 4, 4, 2, 4, 1, 4, 2,
		1, 4, 5, 1, 4, 2, 4, 4, 2, 4,
		4, 1, 4, 4, 2, 5, 2, 2, 3, 2,
		5, 4, 4, 1, 3, 4, 3, 4, 2, 4,
	}

	domains, ok := bfi2DomainsFromAnswers(answersFromValues(values))
	if !ok {
		t.Fatal("domains were not calculated")
	}
	if got := domains[0].Score; got != 3.92 {
		t.Fatalf("extraversion = %.2f, want 3.92", got)
	}
}

func answersFromValues(values []int) []domaintest.Answer {
	answers := make([]domaintest.Answer, 0, len(values))
	for index, value := range values {
		answers = append(answers, domaintest.Answer{QuestionIndex: index, Value: value})
	}
	return answers
}
