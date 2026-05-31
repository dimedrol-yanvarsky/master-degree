import { answerScale } from '../../../entities/test';

export function resolveScale(testOrId) {
    const testId = typeof testOrId === 'string' ? testOrId : testOrId?.id;
    if (Array.isArray(testOrId?.scaleOptions) && testOrId.scaleOptions.length > 0) {
        return testOrId.scaleOptions;
    }

    if (testId === 'bds') {
        return answerScale.slice(0, 4).map((item, index) => ({
            ...item,
            label: ['Совсем нет', 'Немного', 'Довольно сильно', 'Очень сильно'][index],
        }));
    }

    return answerScale;
}
