package support

import "math"

// RoundScore normalizes the support-need score for all public system outputs.
func RoundScore(score float64) float64 {
	if math.IsNaN(score) || math.IsInf(score, 0) {
		return score
	}
	return math.Ceil(score)
}
