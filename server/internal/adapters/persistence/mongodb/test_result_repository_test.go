package mongodb

import (
	"testing"
	"time"

	domaintest "github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/test"
	"go.mongodb.org/mongo-driver/v2/bson"
)

func TestTestResultToDocumentUsesStoredTestIDWithoutTestCode(t *testing.T) {
	resultID := bson.NewObjectID()
	userID := bson.NewObjectID()
	storedTestID := bson.NewObjectID()
	completedAt := time.Date(2026, time.June, 3, 12, 0, 0, 0, time.UTC)

	document := testResultToDocument(domaintest.TestResult{
		ID:          resultID.Hex(),
		UserID:      userID.Hex(),
		TestID:      "bfi-2",
		TestCode:    "bfi-2",
		Answers:     []domaintest.Answer{{QuestionIndex: 0, Value: 4}},
		Score:       3.2,
		ScoreLabel:  "3.2 из 5",
		CompletedAt: completedAt,
	}, storedTestID)

	if value, ok := bsonDocumentValue(document, "test_code"); ok {
		t.Fatalf("test_code field = %v, want field to be absent", value)
	}
	if value, _ := bsonDocumentValue(document, "test_id"); value != storedTestID {
		t.Fatalf("test_id = %v, want %v", value, storedTestID)
	}
	if value, _ := bsonDocumentValue(document, "user_id"); value != userID {
		t.Fatalf("user_id = %v, want %v", value, userID)
	}
	if value, _ := bsonDocumentValue(document, "completed_at"); value != completedAt {
		t.Fatalf("completed_at = %v, want %v", value, completedAt)
	}
}

func bsonDocumentValue(document bson.D, key string) (any, bool) {
	for _, element := range document {
		if element.Key == key {
			return element.Value, true
		}
	}
	return nil, false
}
