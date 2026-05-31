import { hasCompletedTest } from '../../../entities/user';
import { getRemainingCooldownDays, getStoredResult } from '../../../features/testing';

export function canViewCompletedTests(isAuth, status) {
    return isAuth && (status === 'client' || status === 'specialist');
}

export function getTestAvailability(test, testStatus) {
    const isCompleted = hasCompletedTest(testStatus, test.id);
    const remainingDays = isCompleted
        ? getRemainingCooldownDays(test.id, getStoredResult(testStatus, test.id)?.completedAt)
        : 0;

    return { isCompleted, remainingDays };
}
