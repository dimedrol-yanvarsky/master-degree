export const emotionGraphLevels = [
    { label: 'отличное' },
    { label: 'хорошее' },
    { label: 'нормальное' },
    { label: 'плохое' },
    { label: 'очень плохое' },
];

export const emotionGraphColumns = [
    { label: '20.09.2025', supportNeedLevel: 3, secondarySupportNeedLevel: 2, score: 56, secondaryScore: 44, truth: 0.52 },
    { label: '23.09.2025', supportNeedLevel: 2, secondarySupportNeedLevel: 3, score: 62, secondaryScore: 38, truth: 0.59 },
    { label: '26.09.2025', supportNeedLevel: 1, secondarySupportNeedLevel: 2, score: 71, secondaryScore: 29, truth: 0.67 },
    { label: '29.09.2025', supportNeedLevel: 2, secondarySupportNeedLevel: 1, score: 64, secondaryScore: 36, truth: 0.61 },
    { label: '02.10.2025', supportNeedLevel: 2, secondarySupportNeedLevel: 3, score: 60, secondaryScore: 40, truth: 0.57 },
];

const supportNeedLabelsByRow = [
    'очень низкая',
    'низкая',
    'средняя',
    'высокая',
    'очень высокая',
];

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function getRowBySupportNeedLevel(supportNeedLevel) {
    return clamp(emotionGraphLevels.length - supportNeedLevel, 0, emotionGraphLevels.length - 1);
}

function getRowBySupportNeedScore(score) {
    const normalizedScore = Number(score);
    if (!Number.isFinite(normalizedScore)) return 2;
    const scorePercent = normalizedScore > 0 && normalizedScore <= 5
        ? (normalizedScore / 5) * 100
        : normalizedScore;
    if (scorePercent <= 20) return 0;
    if (scorePercent <= 40) return 1;
    if (scorePercent <= 60) return 2;
    if (scorePercent <= 80) return 3;
    return 4;
}

function formatDateLabel(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(date);
}

function formatTruth(value) {
    const truth = Number(value);
    return Number.isFinite(truth) ? truth.toFixed(2) : '1.00';
}

function normalizeGraphColumn(point = {}) {
    const supportNeedLevel = point.supportNeedLevel ?? point.support_need_level;
    const secondarySupportNeedLevel = point.secondarySupportNeedLevel ?? point.secondary_support_need_level;
    const supportNeed = Number(point.supportNeed ?? point.support_need ?? point.score);
    const hasSupportNeedLevel = Number.isFinite(Number(supportNeedLevel));
    const activeRow = hasSupportNeedLevel
        ? getRowBySupportNeedLevel(Number(supportNeedLevel))
        : getRowBySupportNeedScore(supportNeed);
    const secondaryRow = Number.isFinite(Number(secondarySupportNeedLevel))
        ? getRowBySupportNeedLevel(Number(secondarySupportNeedLevel))
        : activeRow;
    const score = point.score ?? point.supportNeed ?? point.support_need ?? '';
    const secondaryScore = point.secondaryScore ?? point.secondary_score ?? score;

    return {
        ...point,
        label: point.label || formatDateLabel(point.date),
        score,
        supportNeedLevel,
        supportNeed: point.supportNeed ?? point.support_need,
        secondarySupportNeedLevel,
        secondaryScore,
        truth: point.truth ?? 1,
        secondaryRow,
    };
}

export function buildEmotionGraphPoints(points = emotionGraphColumns) {
    const source = Array.isArray(points) ? points : emotionGraphColumns;

    return source.map((rawColumn, index) => {
        const column = normalizeGraphColumn(rawColumn);
        const truth = Number(column.truth);
        const secondaryTruth = Number.isFinite(truth) ? 1 - truth : 0;

        const activeRow = Number.isFinite(Number(column.supportNeedLevel))
            ? getRowBySupportNeedLevel(Number(column.supportNeedLevel))
            : getRowBySupportNeedScore(column.supportNeed ?? column.score);
        const secondaryRow = column.secondaryRow;

        return {
            ...column,
            columnIndex: index,
            truth: formatTruth(column.truth),
            supportNeedLabel: supportNeedLabelsByRow[activeRow],
            activeRow,
            secondaryTruth: formatTruth(secondaryTruth),
            secondarySupportNeedLabel: supportNeedLabelsByRow[secondaryRow],
            secondaryRow,
        };
    });
}
