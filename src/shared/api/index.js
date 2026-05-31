// Базовый HTTP-клиент бэкенда (Go API): базовый URL, хранилище JWT-токена
// доступа, нормализация ошибок и низкоуровневый запрос. Доменные эндпоинты и
// мапперы DTO живут в api-сегментах сущностей и фич (entities/*/api,
// features/*/api), которые опираются на этот клиент.

const API_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:8080/api/v1').replace(/\/+$/, '');
const TOKEN_KEY = 'lumen_access_token';

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

// apiFetch — единственный низкоуровневый запрос к API. Доменные функции в
// api-сегментах сущностей вызывают его и приводят ответ к своим типам.
export async function apiFetch(path, { method = 'GET', body, auth = false, credentials } = {}) {
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
            credentials,
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
