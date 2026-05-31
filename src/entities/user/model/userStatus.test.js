import {
    DEFAULT_USER_STATUS,
    hasCompletedTest,
    markTestCompleted,
    readUserStatus,
    saveUserStatus,
} from './userStatus';

const user = {
    id: 'test-user',
    email: 'test@lumen.local',
};

const completedUser = {
    id: 'test-completed-user',
    email: 'completed@demo.local',
};

beforeEach(() => {
    window.localStorage.clear();
});

test('returns default user status before tests are completed', () => {
    expect(readUserStatus(user)).toEqual(DEFAULT_USER_STATUS);
    expect(hasCompletedTest(readUserStatus(user), 'bfi-2')).toBe(false);
});

test('does not inject completed test presets for known demo accounts', () => {
    const status = readUserStatus(completedUser);

    expect(status).toEqual(DEFAULT_USER_STATUS);
    expect(hasCompletedTest(status, 'bfi-2')).toBe(false);
    expect(hasCompletedTest(status, 'bds')).toBe(false);
});

test('marks known tests as completed and stores answers', () => {
    const completedAt = '2026-05-27T10:00:00.000Z';
    const nextStatus = markTestCompleted(DEFAULT_USER_STATUS, 'bfi-2', {
        completedAt,
        score: 4.2,
        answers: {
            1: 3,
            0: 5,
        },
    });

    expect(nextStatus.bfi2).toBe('completed');
    expect(nextStatus.bfi2Result).toMatchObject({
        completedAt,
        score: 4.2,
    });
    expect(nextStatus.bfi2Result.answers).toEqual([
        { questionIndex: 0, value: 5 },
        { questionIndex: 1, value: 3 },
    ]);
    expect(hasCompletedTest(nextStatus, 'bfi-2')).toBe(true);
});

test('persists status per user', () => {
    const status = markTestCompleted(DEFAULT_USER_STATUS, 'bds', { score: 2.1 });
    saveUserStatus(user, status);

    expect(readUserStatus(user)).toMatchObject({
        bds: 'completed',
        bdsResult: {
            score: 2.1,
        },
    });
});
