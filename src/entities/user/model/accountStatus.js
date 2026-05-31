export const statusInfo = {
    client: {
        label: 'Клиент',
        description: 'Проходит тесты, получает рекомендации и выбирает специалиста для персональной работы.',
        badgeTone: 'accent',
    },
    specialist: {
        label: 'Специалист',
        description: 'Работает с клиентами, отслеживает их состояние и назначает персональные рекомендации.',
        badgeTone: 'success',
    },
    admin: {
        label: 'Администратор',
        description: 'Управляет жизненным циклом учетных записей и контролирует корректность пользовательского контента.',
        badgeTone: 'warning',
    },
};
export function getAccountStatus(user, explicitStatus) {
    if (explicitStatus) return explicitStatus;
    if (user?.status) return user.status;
    if (user?.accountType === 'specialist' || user?.role === 'doctor') return 'specialist';
    if (user?.role === 'admin') return 'admin';
    return 'client';
}
