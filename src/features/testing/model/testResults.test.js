import { buildTestResult } from './testResults';

test('rounds BFI-2 domain scores to hundredths', () => {
    const values = [
        5, 4, 1, 5, 1, 4, 5, 4, 3, 5,
        1, 3, 5, 1, 5, 4, 1, 4, 3, 4,
        4, 2, 2, 4, 4, 2, 4, 1, 4, 2,
        1, 4, 5, 1, 4, 2, 4, 4, 2, 4,
        4, 1, 4, 4, 2, 5, 2, 2, 3, 2,
        5, 4, 4, 1, 3, 4, 3, 4, 2, 4,
    ];
    const answers = Object.fromEntries(values.map((value, index) => [index, value]));

    const result = buildTestResult({ id: 'bfi-2' }, answers);

    expect(result.domains[0].score).toBe(3.92);
});
