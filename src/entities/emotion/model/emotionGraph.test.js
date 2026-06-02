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
    expect(point.activeRow).toBe(3);
    expect(point.secondaryRow).toBe(2);
    expect(point.score).toBe(62);
    expect(point.secondaryScore).toBe(38);
    expect(point.truth).toBe('0.59');
    expect(point.secondaryTruth).toBe('0.41');
});
