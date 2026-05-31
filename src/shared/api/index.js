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
export async function apiSubmitTestResult({ testCode, score, scoreLabel, level, summary, domains, answers }) {
    return apiFetch('/me/test-results', {
        method: 'POST',
        auth: true,
        body: { testCode, score, scoreLabel, level, summary, domains, answers },
    });
}

export async function apiTests() {
    const payload = await apiFetch('/tests');
    return Array.isArray(payload?.items) ? payload.items.map(mapServerTest) : [];
}

export async function apiMyTestResults() {
    const payload = await apiFetch('/me/test-results', { auth: true });
    return Array.isArray(payload?.items) ? payload.items.map(mapServerTestResult) : [];
}

export async function apiCollaboratingSpecialists() {
    const payload = await apiFetch('/me/collaborations', { auth: true });
    return Array.isArray(payload?.items) ? payload.items.map(mapServerCollaboration) : [];
}

export async function apiEmotionGraph() {
    return apiFetch('/me/emotion-graph', { auth: true });
}

export async function apiSpecialists() {
    const payload = await apiFetch('/specialists');
    return Array.isArray(payload?.items) ? payload.items.map(mapServerSpecialist) : [];
}

function mapServerSpecialist(specialist) {
    return {
        id: specialist.id || specialist.name,
        name: specialist.name || '',
        experience: specialist.experience || '',
        description: specialist.description || '',
        color: specialist.color || 'var(--accent)',
    };
}

function normalizeTestCode(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (raw.includes('bfi') || raw.includes('big five')) return 'bfi-2';
    if (raw.includes('bds') || raw.includes('breakup distress')) return 'bds';
    return raw;
}

function displayTestCode(code) {
    if (code === 'bfi-2') return 'BFI-2';
    if (code === 'bds') return 'BDS';
    return String(code || '').toUpperCase();
}

function stripTestCodeFromTitle(title) {
    return String(title || '').replace(/\s*\((BFI-2|BDS)\)\s*$/i, '').trim();
}

function formatTestMeta(questionCount, passingMinutes) {
    const count = Number(questionCount) || 0;
    const minutes = Number(passingMinutes) || 0;
    if (!count && !minutes) return '';
    if (!minutes) return `${count} вопросов`;
    return `${count} вопросов · примерно ${minutes} минут(-ы)`;
}

function scaleText(scaleOptions) {
    if (!Array.isArray(scaleOptions) || scaleOptions.length === 0) return '';
    const sorted = [...scaleOptions].sort((left, right) => Number(left.value) - Number(right.value));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    return `${first.value} - ${first.label}, ${last.value} - ${last.label}`;
}

function mapServerTest(test) {
    const code = normalizeTestCode(test.code || test.id || test.title);
    const questions = Array.isArray(test.questions) ? test.questions.filter(Boolean) : [];
    const questionCount = Number(test.questionCount) || questions.length;
    const passingMinutes = Number(test.passingMinutes) || 0;
    const scaleOptions = Array.isArray(test.scale)
        ? test.scale.map((option) => ({
            value: Number(option.value),
            label: option.label || '',
        })).filter((option) => Number.isFinite(option.value))
        : [];

    return {
        id: code,
        serverId: test.serverId || test.id || '',
        code: displayTestCode(code),
        title: stripTestCodeFromTitle(test.title) || displayTestCode(code),
        meta: formatTestMeta(questionCount, passingMinutes),
        description: test.description || '',
        questionCount,
        passingMinutes,
        sourceNote: test.sourceNote || '',
        questions,
        scaleOptions,
        scale: scaleText(scaleOptions),
        status: test.status || '',
    };
}

function mapServerTestResult(result) {
    const testCode = normalizeTestCode(result.testCode || result.testId);
    return {
        id: result.id || `${testCode}-${result.completedAt || ''}`,
        testId: result.testId || '',
        testCode,
        completedAt: result.completedAt || '',
        score: result.score ?? null,
        scoreLabel: result.scoreLabel || '',
        level: result.level || '',
        summary: result.summary || '',
        domains: Array.isArray(result.domains)
            ? result.domains.map((domain) => ({ label: domain.label || '', score: domain.score })).filter((domain) => domain.label)
            : [],
        answers: Array.isArray(result.answers)
            ? result.answers.map((answer) => ({
                questionIndex: Number(answer.questionIndex),
                value: Number(answer.value),
            })).filter((answer) => Number.isFinite(answer.questionIndex) && Number.isFinite(answer.value))
            : [],
        answeredCount: Number(result.answeredCount) || 0,
    };
}

function mapServerCollaboration(item) {
    return {
        id: item.id || item.specialistId || item.name,
        specialistId: item.specialistId || '',
        name: item.name || '',
        experience: item.experience || '',
        description: item.description || '',
        startedAt: item.startedAt || '',
        status: item.status || '',
    };
}
