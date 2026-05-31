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
export function formatAccountDate(value) {
    if (!value) return 'Не зафиксировано';
    return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(value));
}
