import {
    clearAuthUser,
    readAuthUser,
    registerClientUser,
    saveAuthUser,
    signInClient,
    signInWithYandex,
    TEST_AUTH_USER,
    TEST_COMPLETED_USER,
} from './clientAuth';

beforeEach(() => {
    window.localStorage.clear();
});

test('signs in with demo credentials', () => {
    const result = signInClient({
        email: TEST_AUTH_USER.email,
        password: TEST_AUTH_USER.password,
    });

    expect(result.ok).toBe(true);
    expect(result.user.email).toBe(TEST_AUTH_USER.email);
    expect(result.user.password).toBeUndefined();
});

test('signs in with completed tests credentials', () => {
    const result = signInClient({
        email: TEST_COMPLETED_USER.email,
        password: TEST_COMPLETED_USER.password,
    });

    expect(result.ok).toBe(true);
    expect(result.user).toMatchObject({
        email: TEST_COMPLETED_USER.email,
        status: 'client',
        role: 'user',
    });
    expect(result.user.password).toBeUndefined();
});

test('rejects wrong demo credentials', () => {
    const result = signInClient({
        email: TEST_AUTH_USER.email,
        password: 'wrong',
    });

    expect(result.ok).toBe(false);
    expect(result.message).toBe('Неверная почта или пароль.');
});

test('requires email and password for sign in', () => {
    const result = signInClient({
        email: '',
        password: '',
    });

    expect(result.ok).toBe(false);
    expect(result.message).toBe('Введите почту и пароль.');
});

test('persists and clears auth user', () => {
    saveAuthUser({ email: TEST_AUTH_USER.email, name: 'Demo' });
    expect(readAuthUser()).toMatchObject({ email: TEST_AUTH_USER.email });

    clearAuthUser();
    expect(readAuthUser()).toBeNull();
});

test('registers a client user without storing password in public object', () => {
    const result = registerClientUser({
        surname: 'Иванова',
        name: 'Анна',
        patronymic: 'Сергеевна',
        email: 'anna@example.com',
        password: 'Strong123',
        accountType: 'specialist',
        about: 'Работаю с кризисными состояниями.',
        experience: '7',
        acceptedTerms: true,
        acceptedPersonalData: true,
    });

    expect(result.ok).toBe(true);
    expect(result.user).toMatchObject({
        surname: 'Иванова',
        name: 'Анна',
        patronymic: 'Сергеевна',
        email: 'anna@example.com',
        accountType: 'specialist',
        status: 'specialist',
        about: 'Работаю с кризисными состояниями.',
        experience: '7',
    });
    expect(result.user.password).toBeUndefined();
});

test('rejects registration without legal consents', () => {
    const result = registerClientUser({
        surname: 'Иванова',
        name: 'Анна',
        patronymic: 'Сергеевна',
        email: 'anna@example.com',
        password: 'Strong123',
        accountType: 'client',
        about: 'Меня беспокоят переживания после расставания.',
    });

    expect(result.ok).toBe(false);
    expect(result.message).toBe('Подтвердите пользовательское соглашение и обработку персональных данных.');
});

test('signs in with yandex mock account', () => {
    const result = signInWithYandex();

    expect(result.ok).toBe(true);
    expect(result.user.authProvider).toBe('yandex');
    expect(result.user.yandexLinked).toBe(true);
});

test('rejects yandex sign in without legal consents', () => {
    const result = signInWithYandex({
        acceptedTerms: false,
        acceptedPersonalData: true,
    });

    expect(result.ok).toBe(false);
    expect(result.message).toBe('Подтвердите пользовательское соглашение и обработку персональных данных.');
});
