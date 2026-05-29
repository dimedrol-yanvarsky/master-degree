import { validateRegistrationValues } from './registrationValidation';

const AUTH_STORAGE_KEY = 'lumen_auth_user';

export const TEST_AUTH_USER = {
    id: 'test-user',
    name: 'Тестовый пользователь',
    patronymic: 'Демо',
    email: 'test@lumen.local',
    password: 'lumen123',
    accountType: 'client',
    status: 'client',
    role: 'user',
};

export const TEST_COMPLETED_USER = {
    id: 'test-completed-user',
    surname: 'Голубев',
    name: 'Дмитрий',
    patronymic: 'Викторович',
    email: 'completed@demo.local',
    password: 'lumen123',
    accountType: 'client',
    status: 'client',
    role: 'user',
};

export const TEST_SPECIALIST_USER = {
    id: 'test-specialist',
    name: 'Марина',
    patronymic: 'Игоревна',
    email: 'specialist@lumen.local',
    password: 'lumen123',
    accountType: 'specialist',
    status: 'specialist',
    role: 'doctor',
};

export const TEST_ADMIN_USER = {
    id: 'test-admin',
    name: 'Администратор',
    patronymic: 'Системы',
    email: 'admin@lumen.local',
    password: 'lumen123',
    accountType: 'admin',
    status: 'admin',
    role: 'admin',
};

export const TEST_YANDEX_USER = {
    id: 'yandex-user',
    name: 'Яндекс',
    patronymic: 'Пользователь',
    email: 'yandex.user@yandex.local',
    accountType: 'client',
    status: 'client',
    role: 'user',
    authProvider: 'yandex',
    yandexLinked: true,
};

const TEST_USERS = [
    TEST_AUTH_USER,
    TEST_COMPLETED_USER,
    TEST_SPECIALIST_USER,
    TEST_ADMIN_USER,
];

function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}

function toPublicUser(user) {
    return {
        id: user.id,
        surname: user.surname || '',
        name: user.name,
        patronymic: user.patronymic || '',
        email: normalizeEmail(user.email),
        accountType: user.accountType || 'client',
        status: user.status || user.accountType || 'client',
        role: user.role || 'user',
        about: user.about || '',
        experience: user.experience || '',
        authProvider: user.authProvider || 'password',
        yandexLinked: Boolean(user.yandexLinked || user.authProvider === 'yandex'),
    };
}

export function readAuthUser() {
    if (typeof window === 'undefined') return null;

    try {
        const rawUser = window.localStorage.getItem(AUTH_STORAGE_KEY);
        return rawUser ? JSON.parse(rawUser) : null;
    } catch {
        return null;
    }
}

export function saveAuthUser(user) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(toPublicUser(user)));
}

export function clearAuthUser() {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function signInClient({ email, password }) {
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
        return { ok: false, message: 'Введите почту и пароль.' };
    }

    const user = TEST_USERS.find((testUser) => testUser.email === normalizedEmail && testUser.password === password);

    if (!user) {
        return { ok: false, message: 'Неверная почта или пароль.' };
    }

    return { ok: true, user: toPublicUser(user) };
}

export function signInWithYandex({ acceptedTerms = true, acceptedPersonalData = true } = {}) {
    if (!acceptedTerms || !acceptedPersonalData) {
        return { ok: false, message: 'Подтвердите пользовательское соглашение и обработку персональных данных.' };
    }

    return { ok: true, user: toPublicUser(TEST_YANDEX_USER) };
}

export function registerClientUser({
    surname,
    name,
    patronymic,
    email,
    password,
    accountType,
    about,
    experience,
    acceptedTerms,
    acceptedPersonalData,
}) {
    const validation = validateRegistrationValues({
        surname,
        name,
        patronymic,
        email,
        password,
        accountType,
        about,
        experience,
        acceptedTerms,
        acceptedPersonalData,
    });

    if (!validation.ok) {
        return { ok: false, message: validation.message, errors: validation.errors };
    }

    const normalizedEmail = normalizeEmail(email);
    const trimmedSurname = String(surname || '').trim();
    const trimmedName = String(name || '').trim();
    const trimmedPatronymic = String(patronymic || '').trim();
    const trimmedAbout = String(about || '').trim();
    const trimmedExperience = String(experience || '').trim();
    const normalizedAccountType = accountType === 'specialist' ? 'specialist' : 'client';

    return {
        ok: true,
        user: {
            id: `local-${Date.now()}`,
            surname: trimmedSurname,
            name: trimmedName,
            patronymic: trimmedPatronymic,
            email: normalizedEmail,
            accountType: normalizedAccountType,
            status: normalizedAccountType,
            role: normalizedAccountType === 'specialist' ? 'doctor' : 'user',
            about: trimmedAbout,
            experience: normalizedAccountType === 'specialist' ? trimmedExperience : '',
        },
    };
}
