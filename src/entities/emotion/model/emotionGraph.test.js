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
