import { getSpecialistsPage } from './pagination';

const specialists = Array.from({ length: 20 }, (_, index) => ({ id: index + 1 }));

test('returns first page of specialists', () => {
    const page = getSpecialistsPage(specialists, 1, 10);

    expect(page.page).toBe(1);
    expect(page.pageCount).toBe(2);
    expect(page.items.map((item) => item.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test('clamps specialists page to valid range', () => {
    expect(getSpecialistsPage(specialists, 10, 10).page).toBe(2);
    expect(getSpecialistsPage(specialists, -1, 10).page).toBe(1);
});

test('normalizes invalid page values', () => {
    expect(getSpecialistsPage(specialists, 'abc', 10).page).toBe(1);
    expect(getSpecialistsPage(specialists, 1.8, 10).page).toBe(1);
});
