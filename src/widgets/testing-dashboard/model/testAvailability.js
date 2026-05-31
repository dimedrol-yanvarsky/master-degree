import { hasCompletedTest } from '../../../entities/user';
import { getRemainingCooldownDays, getStoredResult } from '../../../features/testing';

export function canViewCompletedTests(isAuth, status) {
    return isAuth && (status === 'client' || status === 'specialist');
}

export function getTestAvailability(test, testStatus) {
    const isCompleted = hasCompletedTest(testStatus, test.id);
    const isPersonalityLocked = isCompleted && test.id === 'bfi-2';
    const remainingDays = isCompleted && !isPersonalityLocked
        ? getRemainingCooldownDays(test.id, getStoredResult(testStatus, test.id)?.completedAt)
        : 0;
    const isLocked = isPersonalityLocked || remainingDays > 0;
    const lockLabel = isPersonalityLocked ? 'Повторное прохождение недоступно' : '';

    return { isCompleted, isLocked, lockLabel, remainingDays };
}
