import { DEFAULT_USER_STATUS, getTestStatusKey } from '../../../../entities/user';

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

export function mergePendingCompletedTests(remoteStatus, localStatus) {
    const nextStatus = { ...DEFAULT_USER_STATUS, ...(remoteStatus || {}) };

    ['bfi2', 'bds'].forEach((statusKey) => {
        if (localStatus?.[statusKey] !== 'completed' || nextStatus[statusKey] === 'completed') return;

        nextStatus[statusKey] = 'completed';
        const resultKey = `${statusKey}Result`;
        if (localStatus?.[resultKey]) {
            nextStatus[resultKey] = localStatus[resultKey];
        }
    });

    return nextStatus;
}

export function enqueueTestResultSubmission(currentQueue, submit) {
    return Promise.resolve(currentQueue)
        .catch(() => undefined)
        .then(submit);
}
