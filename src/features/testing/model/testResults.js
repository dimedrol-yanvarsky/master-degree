const BFI2_DOMAIN_KEYS = [
    { label: 'Экстраверсия', items: ['1', '6', '11R', '16R', '21', '26R', '31R', '36R', '41', '46', '51R', '56'] },
    { label: 'Доброжелательность', items: ['2', '7', '12R', '17R', '22R', '27', '32', '37R', '42R', '47R', '52', '57'] },
    { label: 'Добросовестность', items: ['3R', '8R', '13', '18', '23R', '28R', '33', '38', '43', '48R', '53', '58R'] },
    { label: 'Негативная эмоциональность', items: ['4R', '9R', '14', '19', '24R', '29R', '34', '39', '44R', '49R', '54', '59'] },
    { label: 'Открытость опыту', items: ['5R', '10', '15', '20', '25R', '30R', '35', '40', '45R', '50R', '55R', '60'] },
];

export function formatResultDate(value) {
    if (!value) return 'Не зафиксировано';
    return new Intl.DateTimeFormat('ru-RU', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
}

function getResultLevel(testId, averageScore) {
    if (averageScore === null || averageScore === undefined) {
        return {
            level: 'Результат сохранен',
            summary: 'Ответы сохранены и доступны в истории тестирования.',
        };
    }

    if (testId === 'bds') {
        if (averageScore <= 28) {
            return {
                level: 'Низкая выраженность дистресса',
                summary: 'Ответы указывают на умеренно спокойный эмоциональный фон после расставания.',
            };
        }

        if (averageScore <= 40) {
            return {
                level: 'Умеренная выраженность дистресса',
                summary: 'Есть заметные переживания; полезно продолжать самонаблюдение и поддержку.',
            };
        }

        if (averageScore <= 52) {
            return {
                level: 'Высокая выраженность дистресса',
                summary: 'Переживания выражены сильно; стоит обсудить состояние со специалистом.',
            };
        }

        return {
            level: 'Очень высокая выраженность дистресса',
            summary: 'Ответы показывают интенсивные переживания; желательно не оставаться с этим состоянием в одиночку.',
        };
    }

    if (testId === 'bfi-2') {
        if (averageScore <= 2.3) {
            return {
                level: 'Низкая средняя выраженность признаков',
                summary: 'Профиль ответов смещен к несогласию с большинством утверждений.',
            };
        }

        if (averageScore <= 3.6) {
            return {
                level: 'Сбалансированный профиль ответов',
                summary: 'Ответы распределены вокруг середины шкалы; результат полезен как базовая точка для дальнейшей интерпретации.',
            };
        }

        return {
            level: 'Высокая средняя выраженность признаков',
            summary: 'Профиль ответов смещен к согласию с большинством утверждений.',
        };
    }

    return {
        level: 'Результат рассчитан',
        summary: 'Средний балл сохранен вместе с выбранными ответами.',
    };
}

export function buildTestResult(test, answers) {
    const values = Object.entries(answers || {})
        .sort(([leftIndex], [rightIndex]) => Number(leftIndex) - Number(rightIndex))
        .map(([, value]) => Number(value));
    const total = values.reduce((sum, value) => sum + value, 0);
    const maxAnswerValue = test.id === 'bds' ? 4 : 5;
    const maxTotal = values.length * maxAnswerValue;
    const averageScore = values.length ? Math.round((total / values.length) * 10) / 10 : null;
    const score = values.length ? (test.id === 'bds' ? total : averageScore) : null;
    const { level, summary } = getResultLevel(test.id, score);
    const domains = test.id === 'bfi-2'
        ? BFI2_DOMAIN_KEYS.map((domain) => {
            const domainValues = domain.items.map((item) => {
                const isReverse = item.endsWith('R');
                const itemIndex = Number(item.replace('R', '')) - 1;
                const value = Number(answers[itemIndex]);

                return isReverse ? 6 - value : value;
            });
            const domainAverage = Math.round((domainValues.reduce((sum, value) => sum + value, 0) / domainValues.length) * 10) / 10;

            return {
                label: domain.label,
                score: domainAverage,
            };
        })
        : null;

    return {
        total,
        maxTotal,
        score,
        scoreLabel: test.id === 'bds'
            ? `${total} из ${maxTotal}`
            : `${score ?? 'не рассчитан'} из ${maxAnswerValue}`,
        answeredCount: values.length,
        maxAnswerValue,
        level,
        summary,
        domains,
    };
}
