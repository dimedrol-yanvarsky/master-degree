import { hasCompletedTest } from '../../../entities/user';
import { getRemainingCooldownDays } from '../../../features/testing/model/cooldown';
import { getStoredResult } from '../../../features/testing/model/testResultStatus';

export function canViewCompletedTests(isAuth, status) {
    return isAuth && (status === 'client' || status === 'specialist');
}

export function getTestAvailability(test, testStatus) {
    const isCompleted = hasCompletedTest(testStatus, test.id);
    const remainingDays = isCompleted
        ? getRemainingCooldownDays(test.id, getStoredResult(testStatus, test.id)?.completedAt)
        : 0;
    const isLocked = remainingDays > 0;
    const lockLabel = '';

    return { isCompleted, isLocked, lockLabel, remainingDays };
}
