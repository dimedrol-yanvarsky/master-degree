import { defaultRecommendationBase } from './defaultRecommendationBase';

const RECOMMENDATION_STORAGE_KEY = 'psychology_recommendation_base_v2';

export function readRecommendationBase() {
    if (typeof window === 'undefined') return defaultRecommendationBase;

    try {
        const storedBase = window.localStorage.getItem(RECOMMENDATION_STORAGE_KEY);
        const parsedBase = storedBase ? JSON.parse(storedBase) : null;
        return Array.isArray(parsedBase) ? parsedBase : defaultRecommendationBase;
    } catch {
        return defaultRecommendationBase;
    }
}

export function saveRecommendationBase(sections) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(RECOMMENDATION_STORAGE_KEY, JSON.stringify(sections));
}
