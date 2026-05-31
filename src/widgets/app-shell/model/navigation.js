import { ROUTES } from '../../../shared/routes';

export const navItems = [
    { label: 'Мои эмоции', to: ROUTES.home, end: true },
    { label: 'Рекомендации', to: ROUTES.recommendations },
    { id: 'people', label: 'Специалисты', to: ROUTES.specialists },
    { label: 'Отзывы', to: ROUTES.reviews },
    { label: 'Тестирования', to: ROUTES.testing },
];

export function getPeopleNavLabel(status, isAuth) {
    if (!isAuth || status === 'client') return 'Специалисты';
    if (status === 'admin') return 'Пользователи';
    if (status === 'specialist') return 'Клиенты';
    return 'Специалисты';
}
