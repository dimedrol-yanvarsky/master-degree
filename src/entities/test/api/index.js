// API сущности «тест»: каталог тестов, ручное управление тестами, отправка и
// чтение результатов, а также маппинг серверных DTO теста/результата.
import { apiFetch } from '../../../shared/api';

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

function normalizeDomainLabel(label) {
    const rawLabel = String(label || '').trim();
    const normalizedLabel = rawLabel.toLowerCase();
    const legacyNeuroticismMarker = '\u043d\u0435\u0433\u0430\u0442\u0438\u0432';

    if (normalizedLabel.includes('negative') || normalizedLabel.includes(legacyNeuroticismMarker)) {
        return 'Нейротизм';
    }

    return rawLabel;
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
    if (!test) return null;

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
        authorId: test.authorId || '',
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
            ? result.domains.map((domain) => ({ label: normalizeDomainLabel(domain.label), score: domain.score })).filter((domain) => domain.label)
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

export async function apiTests() {
    const payload = await apiFetch('/tests');
    return Array.isArray(payload?.items) ? payload.items.map(mapServerTest).filter(Boolean) : [];
}

export async function apiCreateTest({ title, code, description, questions }) {
    const payload = await apiFetch('/tests', {
        method: 'POST',
        auth: true,
        body: { title, code, description, questions },
    });
    return mapServerTest(payload?.item);
}

export async function apiUpdateTest(testId, { title, code, description, questions }) {
    const payload = await apiFetch(`/tests/${encodeURIComponent(testId)}`, {
        method: 'PATCH',
        auth: true,
        body: { title, code, description, questions },
    });
    return mapServerTest(payload?.item);
}

export async function apiDeleteTest(testId) {
    await apiFetch(`/tests/${encodeURIComponent(testId)}`, {
        method: 'DELETE',
        auth: true,
    });
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

export async function apiMyTestResults() {
    const payload = await apiFetch('/me/test-results', { auth: true });
    return Array.isArray(payload?.items) ? payload.items.map(mapServerTestResult) : [];
}

export async function apiClientTestResults(clientId) {
    const payload = await apiFetch(`/clients/${encodeURIComponent(clientId)}/test-results`, { auth: true });
    return Array.isArray(payload?.items) ? payload.items.map(mapServerTestResult) : [];
}
