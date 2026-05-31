// Тонкий слой доступа к бэкенду (Go API). Хранит JWT-токен доступа, добавляет его
// к защищённым запросам и нормализует ошибки. Базовый URL берётся из
// REACT_APP_API_URL, по умолчанию — локальный сервер.

const API_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:8080/api/v1').replace(/\/+$/, '');
const TOKEN_KEY = 'lumen_access_token';

// Технические роли клиента соответствуют доменным ролям сервера.
const SERVER_ROLE_TO_TECH = { client: 'user', specialist: 'doctor', admin: 'admin' };

export class ApiError extends Error {
    constructor(message, status) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

export function getAccessToken() {
    try {
        return window.localStorage.getItem(TOKEN_KEY) || '';
    } catch {
        return '';
    }
}

export function setAccessToken(token) {
    try {
        if (token) {
            window.localStorage.setItem(TOKEN_KEY, token);
        } else {
            window.localStorage.removeItem(TOKEN_KEY);
        }
    } catch {
        /* недоступный localStorage не должен ронять приложение */
    }
}

export function clearAccessToken() {
    setAccessToken('');
}

// yandexLoginUrl — точка входа серверного OAuth-потока (полноценный редирект).
export function yandexLoginUrl() {
    return `${API_BASE}/auth/oauth/yandex/login`;
}

async function apiFetch(path, { method = 'GET', body, auth = false } = {}) {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (auth) {
        const token = getAccessToken();
        if (token) headers.Authorization = `Bearer ${token}`;
    }

    let response;
    try {
        response = await fetch(`${API_BASE}${path}`, {
            method,
            headers,
            body: body !== undefined ? JSON.stringify(body) : undefined,
        });
    } catch {
        throw new ApiError('Сервер недоступен. Проверьте, что бэкенд запущен.', 0);
    }

    if (response.status === 204) return null;

    const text = await response.text();
    let payload = null;
    if (text) {
        try {
            payload = JSON.parse(text);
        } catch {
            payload = { raw: text };
        }
    }

    if (!response.ok) {
        const message = (payload && (payload.error || payload.message)) || `Ошибка запроса (${response.status})`;
        throw new ApiError(message, response.status);
    }

    return payload;
}

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
        experience: '',
        accountType,
        status: accountType, // клиент использует status как роль (getAccountStatus)
        role: SERVER_ROLE_TO_TECH[accountType] || 'user',
        authProvider: serverUser.yandexLinked ? 'yandex' : 'password',
        yandexLinked: Boolean(serverUser.yandexLinked),
    };
}

export async function apiLogin({ email, password }) {
    const payload = await apiFetch('/auth/login', { method: 'POST', body: { email, password } });
    setAccessToken(payload.accessToken);
    return { user: mapServerUser(payload.user), expiresAt: payload.expiresAt };
}

export async function apiRegister({ surname, name, patronymic, about, email, password, accountType }) {
    await apiFetch('/auth/register', {
        method: 'POST',
        body: {
            surname,
            name,
            patronymic,
            about,
            email,
            password,
            role: accountType === 'specialist' ? 'specialist' : 'client',
        },
    });
    // Сервер не выдаёт токен при регистрации — сразу выполняем вход.
    return apiLogin({ email, password });
}

export async function apiMe() {
    const payload = await apiFetch('/auth/me', { auth: true });
    return mapServerUser(payload);
}

export async function apiLogout() {
    try {
        await apiFetch('/auth/logout', { method: 'POST', auth: true });
    } catch {
        /* выход локально всё равно выполнится */
    }
    clearAccessToken();
}

// apiSubmitTestResult отправляет завершённый тест на сервер. Сервер сам решит,
// появилась ли новая вершина графа, и оповестит сотрудничающих специалистов.
export async function apiSubmitTestResult({ testCode, score, level, answers }) {
    return apiFetch('/me/test-results', {
        method: 'POST',
        auth: true,
        body: { testCode, score, level, answers },
    });
}

export async function apiEmotionGraph() {
    return apiFetch('/me/emotion-graph', { auth: true });
}
