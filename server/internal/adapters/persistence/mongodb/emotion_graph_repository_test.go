package mongodb

import (
	"math"
	"testing"
	"time"
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

func approxGraphFloat(t *testing.T, label string, got, want float64) {
	t.Helper()
	if math.Abs(got-want) > 0.0001 {
		t.Fatalf("%s = %.4f, want %.4f", label, got, want)
	}
}
