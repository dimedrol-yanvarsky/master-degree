function getFirstLetter(value) {
    return String(value || '').trim().charAt(0).toUpperCase();
}

function getNameParts(user) {
    if (!user) return [];

    if (user.name && user.patronymic) {
        return [user.name, user.patronymic];
    }

    const fullName = [user.name, user.surname, user.lastName, user.patronymic]
        .filter(Boolean)
        .join(' ')
        .trim();

    if (fullName) return fullName.split(/\s+/);

    return String(user.email || '')
        .split('@')[0]
        .split(/[._-]+/)
        .filter(Boolean);
}

export function getAccountInitials(user) {
    const initials = getNameParts(user)
        .map(getFirstLetter)
        .filter(Boolean)
        .slice(0, 2)
        .join('');

    return initials || 'П';
}
