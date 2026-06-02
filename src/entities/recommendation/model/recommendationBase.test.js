import {
    addRecommendationBlock,
    addRecommendationSection,
    deleteRecommendationBlock,
    deleteRecommendationSection,
    getRecommendationBaseStats,
    getRecommendationSectionOptions,
    paginateRecommendationBase,
    updateRecommendationBlock,
    updateRecommendationSection,
} from './recommendationBase';

test('creates nested sections and exposes numbered section options', () => {
    const withRoot = addRecommendationSection([], 'root', {
        title: 'Первый раздел',
        description: 'Описание',
    });
    const withChild = addRecommendationSection(withRoot, withRoot[0].id, {
        title: 'Подраздел',
        description: 'Описание подраздела',
    });

    expect(withChild).toHaveLength(1);
    expect(withChild[0].children).toHaveLength(1);
    expect(getRecommendationSectionOptions(withChild).map((option) => option.label)).toEqual([
        '1. Первый раздел',
        '1.1. Подраздел',
    ]);
});

test('updates and deletes sections recursively', () => {
    const [section] = addRecommendationSection([], 'root', { title: 'Раздел' });
    const tree = addRecommendationSection([section], section.id, { title: 'Подраздел' });
    const childId = tree[0].children[0].id;
    const updatedTree = updateRecommendationSection(tree, childId, {
        title: 'Новый подраздел',
        description: 'Новое описание',
    });

    expect(updatedTree[0].children[0]).toMatchObject({
        title: 'Новый подраздел',
        description: 'Новое описание',
    });
    expect(deleteRecommendationSection(updatedTree, childId)[0].children).toEqual([]);
});

test('creates, updates and deletes recommendation blocks', () => {
    const [section] = addRecommendationSection([], 'root', { title: 'Раздел' });
    const withBlock = addRecommendationBlock([section], section.id, {
        title: 'Блок',
        summary: 'Кратко',
        content: 'Текст',
        tags: 'сон, тревога',
    });
    const blockId = withBlock[0].blocks[0].id;
    const updatedTree = updateRecommendationBlock(withBlock, blockId, {
        title: 'Новый блок',
        summary: 'Новое кратко',
        content: 'Новый текст',
        tags: 'границы',
    });

    expect(updatedTree[0].blocks[0]).toMatchObject({
        title: 'Новый блок',
        tags: ['границы'],
    });
    expect(getRecommendationBaseStats(updatedTree)).toEqual({ sections: 1, blocks: 1 });
    expect(deleteRecommendationBlock(updatedTree, blockId)[0].blocks).toEqual([]);
});

test('paginates by sections and recommendations and keeps DB numbering across pages', () => {
    const sections = [
        {
            id: 's1',
            number: '1',
            title: 'Первый',
            description: '',
            blocks: Array.from({ length: 8 }, (_, index) => ({
                id: `a-${index + 1}`, title: '', summary: '', content: `A${index + 1}`, tags: [],
            })),
            children: [],
        },
        {
            id: 's2',
            number: '2',
            title: 'Второй',
            description: '',
            blocks: Array.from({ length: 6 }, (_, index) => ({
                id: `b-${index + 1}`, title: '', summary: '', content: `B${index + 1}`, tags: [],
            })),
            children: [],
        },
    ];
    // Блок = раздел ИЛИ рекомендация. Всего узлов: s1 + 8 + s2 + 6 = 16 → 2 страницы по 10.
    const firstPage = paginateRecommendationBase(sections, 1, 10);
    const secondPage = paginateRecommendationBase(sections, 2, 10);

    expect(firstPage.totalBlocks).toBe(16);
    expect(firstPage.pageCount).toBe(2);
    // Стр.1: s1 + 8 рекомендаций + s2 (как контекст, без своих рекомендаций в окне).
    expect(firstPage.sections.map((section) => section.number)).toEqual(['1', '2']);
    expect(firstPage.sections[0].blocks).toHaveLength(8);
    expect(firstPage.sections[1].blocks).toHaveLength(0);
    // Стр.2: рекомендации второго раздела. Его номер берётся из БД (2) и НЕ сбрасывается на 1.
    expect(secondPage.sections).toHaveLength(1);
    expect(secondPage.sections[0].number).toBe('2');
    expect(secondPage.sections[0].title).toBe('Второй');
    expect(secondPage.sections[0].blocks.map((block) => block.id)).toEqual([
        'b-1', 'b-2', 'b-3', 'b-4', 'b-5', 'b-6',
    ]);
});

test('falls back to computed numbering when DB number is absent', () => {
    const sections = [
        { id: 'x', title: 'Без номера', description: '', blocks: [], children: [
            { id: 'y', title: 'Подраздел', description: '', blocks: [], children: [] },
        ] },
    ];
    const page = paginateRecommendationBase(sections, 1, 10);
    expect(page.sections[0].number).toBe('1');
    expect(page.sections[0].children[0].number).toBe('1.1');
});
