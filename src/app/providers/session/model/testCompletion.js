import { DEFAULT_USER_STATUS, getTestStatusKey } from '../../../../entities/user';

export const SERVER_TEST_CODES = ['bfi-2', 'bds'];

export function testStatusFromServerResults(results) {
    const nextStatus = { ...DEFAULT_USER_STATUS };
    const seenTests = new Set();

    for (const result of results || []) {
        const testCode = result.testCode || result.testId;
        const statusKey = getTestStatusKey(testCode);
        if (!statusKey || seenTests.has(statusKey)) continue;

        seenTests.add(statusKey);
        nextStatus[statusKey] = 'completed';
        nextStatus[`${statusKey}Result`] = {
            completedAt: result.completedAt,
            score: result.score,
            scoreLabel: result.scoreLabel,
            level: result.level,
            summary: result.summary,
            domains: result.domains || [],
            answers: result.answers || [],
            answeredCount: result.answeredCount || result.answers?.length || 0,
        };
    }

    return nextStatus;
}
