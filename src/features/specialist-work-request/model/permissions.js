export function getSpecialistWorkRequestState({ isAuth, status, targetRole = 'specialist' }) {
    const label = targetRole === 'client' ? 'Предложить работу' : 'Работать';

    if (!isAuth) {
        return {
            disabled: false,
            requiresAuth: true,
            label,
        };
    }

    if (status === 'admin') {
        return {
            disabled: true,
            requiresAuth: false,
            label,
        };
    }

    if (targetRole === 'specialist' && status === 'specialist') {
        return {
            disabled: true,
            requiresAuth: false,
            label,
        };
    }

    if (targetRole === 'client' && status === 'client') {
        return {
            disabled: true,
            requiresAuth: false,
            label,
        };
    }

    return {
        disabled: false,
        requiresAuth: false,
        label,
    };
}
