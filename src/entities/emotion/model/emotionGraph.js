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

function formatTruth(value) {
    return value.toFixed(2);
}

export function buildEmotionGraphPoints() {
    return emotionGraphColumns.map((column, index) => {
        const secondaryTruth = 1 - column.truth;

        const activeRow = getRowBySupportNeedLevel(column.supportNeedLevel);
        const secondaryRow = getRowBySupportNeedLevel(column.secondarySupportNeedLevel);

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
