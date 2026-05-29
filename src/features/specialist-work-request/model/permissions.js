export function getSpecialistWorkRequestState({ isAuth, status }) {
    if (!isAuth) {
        return {
            disabled: false,
            requiresAuth: true,
            label: 'Работать',
        };
    }

    if (status === 'admin' || status === 'specialist') {
        return {
            disabled: true,
            requiresAuth: false,
            label: 'Работать',
        };
    }

    return {
        disabled: false,
        requiresAuth: false,
        label: 'Работать',
    };
}
