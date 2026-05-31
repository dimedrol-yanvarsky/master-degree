// API фичи «аутентификация»: вход, регистрация, выход и восстановление пароля.
// Управляет токеном сессии (через shared/api) и приводит пользователя к
// клиентской форме (через сущность user).
import { apiFetch, setAccessToken } from '../../../shared/api';
import { mapServerUser } from '../../../entities/user';

export async function apiLogin({ email, password }) {
    const payload = await apiFetch('/auth/login', { method: 'POST', body: { email, password } });
    setAccessToken(payload.accessToken);
    return { user: mapServerUser(payload.user), expiresAt: payload.expiresAt };
}

export async function apiRegister({ surname, name, patronymic, about, email, password, accountType, experience }) {
    await apiFetch('/auth/register', {
        method: 'POST',
        body: {
            surname,
            name,
            patronymic,
            about,
            experience: accountType === 'specialist' ? String(experience || '').trim() : '',
            email,
            password,
            role: accountType === 'specialist' ? 'specialist' : 'client',
        },
    });
    // Сервер не выдаёт токен при регистрации — сразу выполняем вход.
    return apiLogin({ email, password });
}

export async function apiRequestPasswordReset(email) {
    return apiFetch('/auth/password-reset', {
        method: 'POST',
        body: { email },
    });
}

export async function apiConfirmPasswordReset({ token, newPassword }) {
    await apiFetch('/auth/password-reset/confirm', {
        method: 'POST',
        body: { token, newPassword },
    });
}
