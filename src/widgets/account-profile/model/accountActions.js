export function getDisplayName(user) {
    return [user?.surname, user?.name, user?.patronymic].filter(Boolean).join(' ');
}

export function getAccountInitials(user) {
    return ([user?.name, user?.surname]
        .map((part) => (part || '').trim().charAt(0))
        .filter(Boolean)
        .join('') || (user?.email || '?').charAt(0)).toUpperCase();
}
