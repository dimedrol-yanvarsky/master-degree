package mongodb

import (
	"math"
	"testing"
	"time"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/emotion"
)

func TestEmotionLevelDocumentToDomainPointPreservesGraphValues(t *testing.T) {
	measuredAt := time.Date(2025, time.September, 23, 9, 0, 0, 0, time.UTC)

	point := emotionLevelDocument{
		MeasuredAt:                measuredAt,
		SupportNeed:               75.25,
		SupportNeedLevel:          2,
		SecondarySupportNeedLevel: 3,
		Score:                     62.75,
		SecondaryScore:            37.25,
		Truth:                     0.59,
		Level:                     "Высокая необходимость",
	}.toDomainPoint()

	if !point.Date.Equal(measuredAt) {
		t.Fatalf("date = %s, want %s", point.Date, measuredAt)
	}
	if point.SupportNeedLevel != 2 {
		t.Fatalf("support need level = %d, want 2", point.SupportNeedLevel)
	}
	if point.SecondarySupportNeedLevel != 3 {
		t.Fatalf("secondary support need level = %d, want 3", point.SecondarySupportNeedLevel)
	}
	approxGraphFloat(t, "support need", point.SupportNeed, 75.25)
	approxGraphFloat(t, "score", point.Score, 62.75)
	approxGraphFloat(t, "secondary score", point.SecondaryScore, 37.25)
	approxGraphFloat(t, "truth", point.Truth, 0.59)
}

func TestPointToDocumentWritesCalculatedGraphValues(t *testing.T) {
	measuredAt := time.Date(2026, time.June, 3, 11, 30, 0, 0, time.UTC)

	document := pointToDocument(emotion.Point{
		Date:                      measuredAt,
		SupportNeed:               64,
		SupportNeedLevel:          2,
		SecondarySupportNeedLevel: 3,
		Score:                     64,
		SecondaryScore:            36,
		Truth:                     0.61,
		Level:                     "высокая",
	})

	if !document.MeasuredAt.Equal(measuredAt) {
		t.Fatalf("measured_at = %s, want %s", document.MeasuredAt, measuredAt)
	}
	if document.Label != "03.06.2026" {
		t.Fatalf("label = %q, want 03.06.2026", document.Label)
	}
	if document.SupportNeedLevel != 2 {
		t.Fatalf("support_need_level = %d, want 2", document.SupportNeedLevel)
	}
	if document.SecondarySupportNeedLevel != 3 {
		t.Fatalf("secondary_support_need_level = %d, want 3", document.SecondarySupportNeedLevel)
	}
	approxGraphFloat(t, "support_need", numberAsGraphFloat(document.SupportNeed), 64)
	approxGraphFloat(t, "score", numberAsGraphFloat(document.Score), 64)
	approxGraphFloat(t, "secondary_score", numberAsGraphFloat(document.SecondaryScore), 36)
	approxGraphFloat(t, "truth", numberAsGraphFloat(document.Truth), 0.61)
}

func approxGraphFloat(t *testing.T, label string, got, want float64) {
	t.Helper()
	if math.Abs(got-want) > 0.0001 {
		t.Fatalf("%s = %.4f, want %.4f", label, got, want)
	}
}
