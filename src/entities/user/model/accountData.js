const defaultClientStats = [
    { label: 'Записей эмоций', value: '0', meta: 'История появится после первой записи' },
    { label: 'Тестов пройдено', value: '0', meta: 'BFI-2 и BDS готовы к подключению' },
    { label: 'Рекомендаций', value: '0', meta: 'Появятся после анализа динамики' },
];

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

export const clientRecommendations = [
    'Вести короткую вечернюю запись состояния и отмечать главный триггер дня.',
    'Запланировать одну поддерживающую активность без контакта с бывшим партнером.',
    'Вернуться к дыхательной практике при росте тревоги выше привычного уровня.',
];

export const availableSpecialists = [
    { name: 'Марина Игоревна', focus: 'Горевание и расставания', status: 'Доступна' },
    { name: 'Алексей Павлович', focus: 'Тревога и саморегуляция', status: 'Ответ в течение дня' },
];

export const selectedSpecialists = [
    { name: 'Елена Викторовна', period: 'Март - апрель', result: 'Завершена поддерживающая работа' },
    { name: 'Марина Игоревна', period: 'Май', result: 'Запрос ожидает подтверждения' },
];

export const specialistClients = [
    { name: 'Анна Сергеевна', state: 'Высокая потребность', lastTest: 'BFI-2 завершен' },
    { name: 'Дмитрий Валерьевич', state: 'Средняя потребность', lastTest: 'BDS в работе' },
    { name: 'Ольга Андреевна', state: 'Наблюдение', lastTest: 'Нет новых тестов' },
];

export const adminAccounts = [
    { name: 'Анна Сергеевна', status: 'client', condition: 'Активна' },
    { name: 'Марина Игоревна', status: 'specialist', condition: 'Активна' },
    { name: 'demo@blocked.local', status: 'client', condition: 'Заблокирована' },
];

export function getProfileStats(accountStatus, bfiCompleted) {
    if (accountStatus === 'specialist') {
        return [
            { label: 'Клиентов в базе', value: String(specialistClients.length), meta: 'Доступны карточки клиентов и история тестов' },
            { label: 'Выбранных клиентов', value: '2', meta: 'Клиенты, с которыми ведется работа' },
            { label: 'Рекомендаций', value: '4', meta: 'Назначены специалистом клиентам' },
        ];
    }

    if (accountStatus === 'admin') {
        return [
            { label: 'Учетных записей', value: String(adminAccounts.length), meta: 'Создание, блокировка и удаление аккаунтов' },
            { label: 'Активных ролей', value: '3', meta: 'Клиент, специалист и администратор' },
            { label: 'Очередь модерации', value: '2', meta: 'Проверка пользовательского контента' },
        ];
    }

    return defaultClientStats.map((item) => {
        if (item.label === 'Тестов пройдено') {
            return {
                ...item,
                value: bfiCompleted ? '1' : '0',
                meta: bfiCompleted ? 'BFI-2 завершен' : item.meta,
            };
        }

        if (item.label === 'Рекомендаций') {
            return {
                ...item,
                value: bfiCompleted ? String(clientRecommendations.length) : '0',
                meta: bfiCompleted ? 'Подобраны по текущим результатам' : item.meta,
            };
        }

        return item;
    });
}

export function getAccountStatus(user, explicitStatus) {
    if (explicitStatus) return explicitStatus;
    if (user?.status) return user.status;
    if (user?.accountType === 'specialist' || user?.role === 'doctor') return 'specialist';
    if (user?.role === 'admin') return 'admin';
    return 'client';
}

export function formatAccountDate(value) {
    if (!value) return 'Не зафиксировано';
    return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(value));
}
