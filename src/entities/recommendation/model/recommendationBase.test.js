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

test('paginates recommendation blocks by preserving parent sections', () => {
    const sections = [{
        id: 'section',
        title: 'Раздел',
        description: '',
        blocks: Array.from({ length: 12 }, (_, index) => ({
            id: `block-${index + 1}`,
            title: `Блок ${index + 1}`,
            summary: '',
            content: '',
            tags: [],
        })),
        children: [],
    }];
    const firstPage = paginateRecommendationBase(sections, 1, 10);
    const secondPage = paginateRecommendationBase(sections, 2, 10);

    expect(firstPage.pageCount).toBe(2);
    expect(firstPage.sections[0].blocks).toHaveLength(10);
    expect(secondPage.sections[0].title).toBe('Раздел');
    expect(secondPage.sections[0].blocks.map((block) => block.id)).toEqual(['block-11', 'block-12']);
});
