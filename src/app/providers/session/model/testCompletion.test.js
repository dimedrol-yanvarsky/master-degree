import { enqueueTestResultSubmission, mergePendingCompletedTests, testStatusFromServerResults } from './testCompletion';

test('builds completion status from latest server results', () => {
    const status = testStatusFromServerResults([
        {
            testCode: 'bds',
            completedAt: '2026-06-03T10:00:00.000Z',
            score: 44,
            answers: [{ questionIndex: 0, value: 3 }],
        },
    ]);

    expect(status.bds).toBe('completed');
    expect(status.bdsResult).toMatchObject({
        completedAt: '2026-06-03T10:00:00.000Z',
        score: 44,
        answeredCount: 1,
    });
});

test('preserves locally completed test while server submission queue is catching up', () => {
    const merged = mergePendingCompletedTests(
        {
            bfi2: 'completed',
            bfi2Result: { completedAt: '2026-06-03T09:00:00.000Z' },
            bds: 'not_started',
        },
        {
            bds: 'completed',
            bdsResult: { completedAt: '2026-06-03T09:05:00.000Z', score: 48 },
        },
    );

    expect(merged.bfi2).toBe('completed');
    expect(merged.bds).toBe('completed');
    expect(merged.bdsResult).toMatchObject({ score: 48 });
});

test('queues result submissions so BDS cannot overtake BFI-2', async () => {
    const events = [];
    let finishBfi;
    const bfiSubmission = new Promise((resolve) => {
        finishBfi = resolve;
    });

    const first = enqueueTestResultSubmission(Promise.resolve(), () => {
        events.push('start-bfi');
        return bfiSubmission.then(() => {
            events.push('finish-bfi');
        });
    });
    const second = enqueueTestResultSubmission(first, () => {
        events.push('start-bds');
        return Promise.resolve();
    });

    await Promise.resolve();
    await Promise.resolve();
    expect(events).toEqual(['start-bfi']);

    finishBfi();
    await second;

    expect(events).toEqual(['start-bfi', 'finish-bfi', 'start-bds']);
});
