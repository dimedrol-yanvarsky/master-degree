export function validateProfileField(key, label, rawValue) {
    const value = String(rawValue || '').trim();

    if (key === 'surname' || key === 'name' || key === 'patronymic') {
        if (!value) return `${label} должна быть заполнена.`;
        if (value.length < 2 || value.length > 40) return `${label} должна быть от 2 до 40 символов.`;
        if (!/^[A-Za-zА-ЯЁа-яё]+(?:[- ][A-Za-zА-ЯЁа-яё]+)?$/.test(value)) return `${label}: только буквы, пробел или дефис.`;
    }

    if (key === 'email' && !/^[^s@]+@[^s@]+.[^s@]+$/.test(value)) {
        return 'Введите корректную электронную почту.';
    }

    if (key === 'experience') {
        const years = Number(value);
        if (!value || !Number.isInteger(years) || years < 1 || years > 80) return 'Укажите стаж целым числом от 1 до 80.';
    }

    if (key === 'about' && value.length > 320) {
        return 'Описание должно быть не длиннее 320 символов.';
    }

    return '';
}
