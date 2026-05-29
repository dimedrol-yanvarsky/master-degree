export const CUSTOM_TESTS_STORAGE_KEY = 'lumen_custom_tests';

export function getCustomTests() {
    if (typeof window === 'undefined') return [];

    try {
        const parsed = JSON.parse(window.localStorage.getItem(CUSTOM_TESTS_STORAGE_KEY) || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export function saveCustomTests(customTests) {
    if (typeof window === 'undefined') return;

    try {
        window.localStorage.setItem(CUSTOM_TESTS_STORAGE_KEY, JSON.stringify(customTests));
    } catch {
    }
}

export function makeCustomTest({ title, code, questions }) {
    const fallbackCode = code || 'CUSTOM';
    const slug = fallbackCode
        .toLowerCase()
        .replace(/[^a-z0-9а-яё-]+/gi, '-')
        .replace(/^-+|-+$/g, '');

    return {
        id: `custom-${slug || Date.now()}`,
        code: fallbackCode.toUpperCase(),
        title,
        accent: 'Добавлен вручную',
        meta: `${questions.length} утверждений · ручной тест`,
        scale: '1 - совсем нет, 5 - полностью да',
        sourceNote: 'Тест добавлен вручную администратором или врачом.',
        description: 'Пользовательский опросник для сценариев, которые специалист добавляет без изменения кода приложения.',
        details: ['Ручной список вопросов', 'Единая 5-балльная шкала ответов', 'Можно использовать как основу будущей админ-панели'],
        questions,
    };
}
