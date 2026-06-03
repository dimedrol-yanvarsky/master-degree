import { getTestAvailability } from './testAvailability';

describe('getTestAvailability', () => {
    beforeEach(() => {
        jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-06-02T12:00:00.000Z').getTime());
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('locks BFI-2 for two weeks after the latest completion', () => {
        const status = {
            bfi2: 'completed',
            bfi2Result: {
                completedAt: '2026-05-23T12:00:00.000Z',
            },
        };

        expect(getTestAvailability({ id: 'bfi-2' }, status)).toMatchObject({
            isCompleted: true,
            isLocked: true,
            remainingDays: 4,
        });
    });

    test('allows BFI-2 retake after two weeks', () => {
        const status = {
            bfi2: 'completed',
            bfi2Result: {
                completedAt: '2026-05-19T12:00:00.000Z',
            },
        };

        expect(getTestAvailability({ id: 'bfi-2' }, status)).toMatchObject({
            isCompleted: true,
            isLocked: false,
            remainingDays: 0,
        });
    });

    test('locks BDS for one day after the latest completion', () => {
        const status = {
            bds: 'completed',
            bdsResult: {
                completedAt: '2026-06-02T08:00:00.000Z',
            },
        };

        expect(getTestAvailability({ id: 'bds' }, status)).toMatchObject({
            isCompleted: true,
            isLocked: true,
            remainingDays: 1,
        });
    });
});
