// Период блокировки повторного прохождения. Оставшееся время считается как разница
// между текущей датой и датой последнего прохождения теста.
const TEST_COOLDOWN_DAYS = {
    'bfi-2': 7,
    bds: 1,
};

export function getRemainingCooldownDays(testId, completedAt) {
    const cooldown = TEST_COOLDOWN_DAYS[testId] ?? 0;
    if (!cooldown || !completedAt) return 0;

    const elapsedDays = Math.floor((Date.now() - new Date(completedAt).getTime()) / 86400000);
    return Math.max(0, cooldown - elapsedDays);
}
