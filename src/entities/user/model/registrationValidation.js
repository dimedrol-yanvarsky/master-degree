const NAME_PATTERN = /^[A-Za-zА-ЯЁа-яё]+(?:[- ][A-Za-zА-ЯЁа-яё]+)?$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REPEATED_CHAR_PATTERN = /(.)\1{4,}/i;
const MEANINGFUL_WORD_PATTERN = /[A-Za-zА-ЯЁа-яё]{2,}/g;

function trimValue(value) {
    return String(value || '').trim();
}

function validateName(value, label) {
    const trimmedValue = trimValue(value);

    if (!trimmedValue) return `${label} обязательна для заполнения.`;
    if (trimmedValue.length < 2 || trimmedValue.length > 40) return `${label} должна быть от 2 до 40 символов.`;
    if (!NAME_PATTERN.test(trimmedValue)) return `${label} должна содержать только буквы, пробел или дефис.`;
    if (REPEATED_CHAR_PATTERN.test(trimmedValue)) return `${label} выглядит некорректно.`;

    return '';
}

function validateAbout(value, accountType) {
    const trimmedValue = trimValue(value);
    const words = trimmedValue.match(MEANINGFUL_WORD_PATTERN) || [];
    const label = accountType === 'specialist' ? 'Описание опыта' : 'Описание проблемы';

    if (!trimmedValue) return `${label} обязательно для заполнения.`;
    if (trimmedValue.length < 20) return `${label} должно быть не короче 20 символов.`;
    if (trimmedValue.length > 320) return `${label} должно быть не длиннее 320 символов.`;
    if (words.length < 3 || REPEATED_CHAR_PATTERN.test(trimmedValue)) return `${label} должно быть осмысленным текстом.`;

    return '';
}

function validateExperience(value, accountType) {
    if (accountType !== 'specialist') return '';

    const trimmedValue = trimValue(value);
    const years = Number(trimmedValue);

    if (!trimmedValue) return 'Стаж обязателен для специалиста.';
    if (!Number.isInteger(years) || years < 1 || years > 80) return 'Укажите стаж целым числом от 1 до 80.';

    return '';
}

function validatePassword(value) {
    const password = String(value || '');

    if (!password) return 'Пароль обязателен для заполнения.';
    if (password.length < 8) return 'Пароль должен быть не короче 8 символов.';
    if (!/[A-Za-zА-ЯЁа-яё]/.test(password) || !/[0-9]/.test(password)) {
        return 'Пароль должен содержать буквы и цифры.';
    }

    return '';
}

export function validateRegistrationValues(values) {
    const accountType = values.accountType === 'specialist' ? 'specialist' : 'client';
    const consentError = !values.acceptedTerms && !values.acceptedPersonalData
        ? 'Подтвердите пользовательское соглашение и обработку персональных данных.'
        : '';
    const errors = {
        surname: validateName(values.surname, 'Фамилия'),
        name: validateName(values.name, 'Имя'),
        patronymic: validateName(values.patronymic, 'Отчество'),
        email: !trimValue(values.email) || !EMAIL_PATTERN.test(trimValue(values.email))
            ? 'Введите корректную электронную почту.'
            : '',
        password: validatePassword(values.password),
        accountType: values.accountType === 'client' || values.accountType === 'specialist'
            ? ''
            : 'Выберите тип аккаунта.',
        about: validateAbout(values.about, accountType),
        experience: validateExperience(values.experience, accountType),
        acceptedTerms: values.acceptedTerms ? '' : consentError || 'Подтвердите пользовательское соглашение.',
        acceptedPersonalData: values.acceptedPersonalData ? '' : consentError || 'Подтвердите обработку персональных данных.',
    };
    const normalizedErrors = Object.fromEntries(
        Object.entries(errors).filter(([, message]) => Boolean(message))
    );
    const firstMessage = Object.values(normalizedErrors)[0] || '';

    return {
        ok: !firstMessage,
        errors: normalizedErrors,
        message: firstMessage,
    };
}
