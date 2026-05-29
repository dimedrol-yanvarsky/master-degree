const requiredEmotionTests = [
    { statusKey: 'bfi2', label: 'BFI-2' },
    { statusKey: 'bds', label: 'BDS' },
];

export function getMissingEmotionGraphTests(testStatus) {
    return requiredEmotionTests
        .filter((test) => testStatus?.[test.statusKey] !== 'completed')
        .map((test) => test.label);
}
