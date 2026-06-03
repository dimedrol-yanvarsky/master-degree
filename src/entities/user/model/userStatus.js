const USER_STATUS_PREFIX = 'lumen_user_status';

export const DEFAULT_USER_STATUS = {
    bfi2: 'not_started',
    bds: 'not_started',
};

// Демо-ответы для предзаполненного аккаунта: детерминированный паттерн по числу вопросов теста.
function buildPresetAnswers(count, pattern) {
    return Array.from({ length: count }, (_, index) => ({
        questionIndex: index,
        value: pattern[index % pattern.length],
    }));
}

export const COMPLETED_TEST_USER_STATUS = {
    bfi2: 'completed',
    bds: 'completed',
    bfi2Result: {
        completedAt: '2026-05-20T10:00:00.000Z',
        score: 3.6,
        scoreLabel: '3.6 из 5',
        maxAnswerValue: 5,
        level: 'Сбалансированный профиль ответов',
        summary: 'Профиль показывает выраженную способность к саморегуляции и восстановлению опоры.',
        domains: [
            { label: 'Экстраверсия', score: 3.8 },
            { label: 'Доброжелательность', score: 4.2 },
            { label: 'Добросовестность', score: 3.5 },
            { label: 'Нейротизм', score: 2.4 },
            { label: 'Открытость опыту', score: 4.0 },
        ],
        answers: buildPresetAnswers(60, [4, 3, 2, 4, 5, 3, 4, 2, 4, 3]),
    },
    bdsResult: {
        completedAt: '2026-05-21T10:00:00.000Z',
        score: 1.9,
        scoreLabel: '30 из 64',
        maxAnswerValue: 4,
        level: 'Умеренная выраженность дистресса',
        summary: 'Состояние остается чувствительным, но уже достаточно стабилизированным для мягких практик восстановления.',
        answers: buildPresetAnswers(16, [2, 1, 2, 3, 2, 1, 2, 2]),
    },
};

function getUserStatusKey(user) {
    const userKey = String(user?.email || user?.id || 'guest').trim().toLowerCase();
    return `${USER_STATUS_PREFIX}:${userKey}`;
}

export function getTestStatusKey(testId) {
    return String(testId || '').replace(/-/g, '');
}

export function readUserStatus(user) {
    if (typeof window === 'undefined' || !user) return DEFAULT_USER_STATUS;

    try {
        const rawStatus = window.localStorage.getItem(getUserStatusKey(user));
        if (rawStatus) return { ...DEFAULT_USER_STATUS, ...JSON.parse(rawStatus) };

        return DEFAULT_USER_STATUS;
    } catch {
        return DEFAULT_USER_STATUS;
    }
}

export function saveUserStatus(user, status) {
    if (typeof window === 'undefined' || !user) return;
    window.localStorage.setItem(getUserStatusKey(user), JSON.stringify({
        ...DEFAULT_USER_STATUS,
        ...status,
    }));
}

export function markTestCompleted(status, testId, result = {}) {
    const testStatusKey = getTestStatusKey(testId);
    const { answers: rawAnswers, completedAt, ...resultMeta } = result;
    const answers = rawAnswers
        ? Object.entries(rawAnswers)
            .sort(([leftIndex], [rightIndex]) => Number(leftIndex) - Number(rightIndex))
            .map(([questionIndex, value]) => ({
                questionIndex: Number(questionIndex),
                value,
            }))
        : [];

    return {
        ...DEFAULT_USER_STATUS,
        ...status,
        [testStatusKey]: 'completed',
        [`${testStatusKey}Result`]: {
            completedAt: completedAt || new Date().toISOString(),
            ...resultMeta,
            score: result.score ?? null,
            answers,
        },
    };
}

export function hasCompletedTest(status, testId) {
    return status?.[getTestStatusKey(testId)] === 'completed';
}
