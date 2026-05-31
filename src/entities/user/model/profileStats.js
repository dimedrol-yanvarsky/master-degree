import { adminAccounts, clientRecommendations, specialistClients } from './accountData';

const defaultClientStats = [
    { label: 'Записей эмоций', value: '0', meta: 'История появится после первой записи' },
    { label: 'Тестов пройдено', value: '0', meta: 'BFI-2 и BDS готовы к подключению' },
    { label: 'Рекомендаций', value: '0', meta: 'Появятся после анализа динамики' },
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
