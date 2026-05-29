import { validateRegistrationValues } from './registrationValidation';

const baseValues = {
    surname: 'Иванова',
    name: 'Анна',
    patronymic: 'Сергеевна',
    email: 'anna@example.com',
    password: 'Strong123',
    accountType: 'client',
    about: 'Меня беспокоят переживания после расставания.',
    acceptedTerms: true,
    acceptedPersonalData: true,
};

test('accepts meaningful client registration values', () => {
    expect(validateRegistrationValues(baseValues)).toMatchObject({
        ok: true,
        errors: {},
    });
});

test('requires specialist experience', () => {
    const validation = validateRegistrationValues({
        ...baseValues,
        accountType: 'specialist',
        about: 'Опыт консультирования взрослых клиентов.',
        experience: '',
    });

    expect(validation.ok).toBe(false);
    expect(validation.errors.experience).toBe('Стаж обязателен для специалиста.');
});

test('rejects meaningless registration values', () => {
    const validation = validateRegistrationValues({
        ...baseValues,
        surname: '111',
        about: 'аааааааааааааааааааа',
        password: '123',
    });

    expect(validation.ok).toBe(false);
    expect(validation.errors.surname).toBe('Фамилия должна содержать только буквы, пробел или дефис.');
    expect(validation.errors.about).toBe('Описание проблемы должно быть осмысленным текстом.');
    expect(validation.errors.password).toBe('Пароль должен быть не короче 8 символов.');
});
