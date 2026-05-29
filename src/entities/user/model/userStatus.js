const USER_STATUS_PREFIX = 'lumen_user_status';

export const DEFAULT_USER_STATUS = {
    bfi2: 'not_started',
    bds: 'not_started',
};

export const COMPLETED_TEST_USER_STATUS = {
    bfi2: 'completed',
    bds: 'completed',
    bfi2Result: {
        completedAt: '2026-05-20T10:00:00.000Z',
        score: 4.2,
        level: 'Высокий ресурс',
        summary: 'Профиль показывает выраженную способность к саморегуляции и восстановлению опоры.',
        answers: [],
    },
    bdsResult: {
        completedAt: '2026-05-21T10:00:00.000Z',
        score: 1.9,
        level: 'Умеренный дистресс',
        summary: 'Состояние остается чувствительным, но уже достаточно стабилизированным для мягких практик восстановления.',
        answers: [],
    },
};

const PRESET_USER_STATUSES = {
    'completed@demo.local': COMPLETED_TEST_USER_STATUS,
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

        const presetStatus = PRESET_USER_STATUSES[String(user?.email || '').trim().toLowerCase()];
        return presetStatus ? { ...DEFAULT_USER_STATUS, ...presetStatus } : DEFAULT_USER_STATUS;
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
