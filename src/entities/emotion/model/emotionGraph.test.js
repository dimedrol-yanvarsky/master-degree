import { buildEmotionGraphPoints } from './emotionGraph';

test('builds secondary emotion graph nodes with balanced truth degrees', () => {
    const points = buildEmotionGraphPoints();

    expect(points.map((point) => point.secondarySupportNeedLevel)).toEqual([2, 3, 2, 1, 3]);
    expect(points.map((point) => point.supportNeedLabel)).toEqual(['средняя', 'высокая', 'очень высокая', 'высокая', 'высокая']);
    points.forEach((point) => {
        const totalTruth = Number(point.truth) + Number(point.secondaryTruth);
        expect(totalTruth).toBeCloseTo(1, 2);
        expect(Number(point.secondaryTruth)).toBeLessThan(Number(point.truth));
    });
});

test('preserves graph values returned by API', () => {
    const [point] = buildEmotionGraphPoints([
        {
            date: '2025-09-23T09:00:00Z',
            supportNeed: 75,
            supportNeedLevel: 2,
            secondarySupportNeedLevel: 3,
            score: 62,
            secondaryScore: 38,
            truth: 0.59,
        },
    ]);

    expect(point.label).toBe('23.09.2025');
    expect(point.weekday).toBe('Вторник');
    expect(point.activeRow).toBe(3);
    expect(point.secondaryRow).toBe(2);
    expect(point.score).toBe(62);
    expect(point.secondaryScore).toBe(38);
    expect(point.truth).toBe('0.59');
    expect(point.secondaryTruth).toBe('0.41');
});

test('rounds support scores up for graph display', () => {
    const [point] = buildEmotionGraphPoints([
        {
            date: '2025-09-23T09:00:00Z',
            supportNeed: 61.12,
            score: 62.5,
            secondaryScore: 38.1,
            truth: 0.59,
        },
    ]);

    expect(point.supportNeed).toBe(62);
    expect(point.score).toBe(63);
    expect(point.secondaryScore).toBe(39);
});

test('adds weekday labels for new API points and seeded labels', () => {
    const [apiPoint, seededPoint] = buildEmotionGraphPoints([
        {
            date: '2026-06-03T09:00:00Z',
            supportNeedLevel: 2,
            secondarySupportNeedLevel: 3,
            score: 62,
            secondaryScore: 38,
            truth: 0.59,
        },
        {
            label: '02.10.2025',
            supportNeedLevel: 2,
            secondarySupportNeedLevel: 3,
            score: 60,
            secondaryScore: 40,
            truth: 0.57,
        },
    ]);

    expect(apiPoint.label).toBe('03.06.2026');
    expect(apiPoint.weekday).toBe('Среда');
    expect(seededPoint.weekday).toBe('Четверг');
});
