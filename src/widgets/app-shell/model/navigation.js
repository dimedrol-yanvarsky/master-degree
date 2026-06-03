import { ROUTES } from '../../../shared/routes';

export const navItems = [
    { label: 'Мои эмоции', to: ROUTES.home, end: true },
    { label: 'Рекомендации', to: ROUTES.recommendationsPage(1) },
    { id: 'people', label: 'Специалисты', to: ROUTES.specialistsPage(1) },
    { label: 'Отзывы', to: ROUTES.reviews },
    { label: 'Тестирования', to: ROUTES.testing },
];

export function getPeopleNavLabel(status, isAuth) {
    if (!isAuth || status === 'client') return 'Специалисты';
    if (status === 'admin') return 'Пользователи';
    if (status === 'specialist') return 'Клиенты';
    return 'Специалисты';
}
