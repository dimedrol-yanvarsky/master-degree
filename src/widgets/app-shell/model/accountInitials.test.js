import { getAccountInitials } from './accountInitials';

test('builds account initials from name and patronymic', () => {
    expect(getAccountInitials({ name: 'Дмитрий', patronymic: 'Викторович' })).toBe('ДВ');
});

test('builds account initials from full name fallback', () => {
    expect(getAccountInitials({ name: 'Анна Сергеевна' })).toBe('АС');
});

test('builds account initials from email fallback', () => {
    expect(getAccountInitials({ email: 'demo.user@example.com' })).toBe('DU');
});
