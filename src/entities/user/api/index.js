// API сущности «пользователь»: текущий профиль, управление пользователями (админ)
// и маппинг серверного DTO в клиентскую форму пользователя. Базовый HTTP-клиент и
// хранилище токена — из shared/api (нижний слой).
import { apiFetch, clearAccessToken } from '../../../shared/api';

// Технические роли клиента соответствуют доменным ролям сервера.
const SERVER_ROLE_TO_TECH = { client: 'user', specialist: 'doctor', admin: 'admin' };

// mapServerUser приводит ответ сервера к форме пользователя, принятой на клиенте.
export function mapServerUser(serverUser) {
    if (!serverUser) return null;

    const accountType = serverUser.role || 'client';
    return {
        id: serverUser.id,
        email: serverUser.email || '',
        name: serverUser.name || '',
        surname: serverUser.surname || '',
        patronymic: serverUser.patronymic || '',
        about: serverUser.about || '',
        experience: serverUser.experience ? String(serverUser.experience).trim() : '',
        accountType,
        status: accountType, // клиент использует status как роль (getAccountStatus)
        role: SERVER_ROLE_TO_TECH[accountType] || 'user',
        authProvider: serverUser.yandexLinked ? 'yandex' : 'password',
        yandexLinked: Boolean(serverUser.yandexLinked),
    };
}

function getAccountName(account) {
    const name = [account.surname, account.name, account.patronymic]
        .map((part) => String(part || '').trim())
        .filter(Boolean)
        .join(' ');
    return name || account.email || 'Пользователь';
}

function mapServerAccount(account) {
    return {
        id: account.id || account.email,
        email: account.email || '',
        name: account.name || '',
        surname: account.surname || '',
        patronymic: account.patronymic || '',
        about: account.about || '',
        role: account.role || 'client',
        status: account.status || 'active',
        createdAt: account.createdAt || '',
        displayName: getAccountName(account),
    };
}

export async function apiMe() {
    const payload = await apiFetch('/auth/me', { auth: true });
    return mapServerUser(payload);
}

export async function apiUpdateProfile(profile) {
    const payload = await apiFetch('/auth/me', {
        method: 'PATCH',
        auth: true,
        body: {
            surname: profile.surname || '',
            name: profile.name || '',
            patronymic: profile.patronymic || '',
            email: profile.email || '',
            about: profile.about || '',
            experience: profile.accountType === 'specialist' || profile.status === 'specialist'
                ? String(profile.experience || '').trim()
                : '',
        },
    });
    return mapServerUser(payload);
}

export async function apiChangePassword({ currentPassword, newPassword }) {
    await apiFetch('/auth/me/password', {
        method: 'PATCH',
        auth: true,
        body: { currentPassword, newPassword },
    });
}

export async function apiStartYandexLink() {
    return apiFetch('/auth/oauth/yandex/link', {
        method: 'POST',
        auth: true,
        credentials: 'include',
    });
}

export async function apiUnlinkYandex() {
    const payload = await apiFetch('/auth/me/yandex-link', {
        method: 'DELETE',
        auth: true,
    });
    return mapServerUser(payload);
}

export async function apiDeleteOwnAccount() {
    await apiFetch('/auth/me', { method: 'DELETE', auth: true });
    clearAccessToken();
}

export async function apiLogout() {
    try {
        await apiFetch('/auth/logout', { method: 'POST', auth: true });
    } catch {
        /* выход локально всё равно выполнится */
    }
    clearAccessToken();
}

export async function apiUsers() {
    const payload = await apiFetch('/admin/users', { auth: true });
    return Array.isArray(payload?.items) ? payload.items.map(mapServerAccount) : [];
}

export async function apiCreateUser({ email, name, surname, patronymic, role }) {
    const payload = await apiFetch('/admin/users', {
        method: 'POST',
        auth: true,
        body: { email, name, surname, patronymic, role },
    });
    return Array.isArray(payload?.items) ? payload.items.map(mapServerAccount) : [];
}

export async function apiClients() {
    const payload = await apiFetch('/clients', { auth: true });
    return Array.isArray(payload?.items) ? payload.items.map(mapServerAccount) : [];
}

export async function apiSetUserStatus(userId, status) {
    const payload = await apiFetch(`/admin/users/${encodeURIComponent(userId)}/status`, {
        method: 'PATCH',
        auth: true,
        body: { status },
    });
    return Array.isArray(payload?.items) ? payload.items.map(mapServerAccount) : [];
}

export async function apiDeleteUser(userId) {
    const payload = await apiFetch(`/admin/users/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        auth: true,
    });
    return Array.isArray(payload?.items) ? payload.items.map(mapServerAccount) : [];
}
