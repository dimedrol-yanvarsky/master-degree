import { generateStrongPassword } from './passwordGenerator';

test('generates a strong password with required character groups', () => {
    const password = generateStrongPassword();

    expect(password).toHaveLength(16);
    expect(password).toMatch(/[a-z]/);
    expect(password).toMatch(/[A-Z]/);
    expect(password).toMatch(/[0-9]/);
    expect(password).toMatch(/[!@#$%&*?]/);
});

test('keeps generated password length at least twelve characters', () => {
    expect(generateStrongPassword(6)).toHaveLength(12);
});
