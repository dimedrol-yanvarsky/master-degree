export const navItems = [
    { label: 'Мои эмоции', to: '/', end: true },
    { label: 'Рекомендации', to: '/recommendations' },
    { id: 'people', label: 'Специалисты', to: '/specialists' },
    { label: 'Отзывы', to: '/reviews' },
    { label: 'Тестирования', to: '/testing' },
];

export function getPeopleNavLabel(status, isAuth) {
    if (!isAuth || status === 'client') return 'Специалисты';
    if (status === 'admin') return 'Пользователи';
    if (status === 'specialist') return 'Клиенты';
    return 'Специалисты';
}
