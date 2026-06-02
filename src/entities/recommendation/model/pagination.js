export const RECOMMENDATION_BLOCKS_PER_PAGE = 10;

// Иерархический номер раздела берётся из БД (section_number, приходит как
// section.number). Если его нет (офлайн-база по умолчанию, свежесозданный узел) —
// номер вычисляется по позиции узла в полном дереве. Нумерация считается ОДИН раз
// по всему дереву до пагинации, поэтому номер раздела стабилен и не сбрасывается
// при переходе на соседнюю страницу.
export function annotateRecommendationNumbers(sections, prefix = '') {
    return sections.map((section, index) => {
        const computed = prefix ? `${prefix}.${index + 1}` : String(index + 1);
        const number = typeof section.number === 'string' && section.number.trim()
            ? section.number.trim()
            : computed;

        return {
            ...section,
            number,
            children: annotateRecommendationNumbers(section.children || [], number),
        };
    });
}

// Блок для пагинации — это раздел ИЛИ рекомендация (как и определено в постановке).
// Узлы собираются в порядке обхода в глубину: раздел, затем его рекомендации, затем
// дочерние разделы.
function collectRecommendationNodeIds(sections) {
    return sections.flatMap((section) => [
        section.id,
        ...(section.blocks || []).map((block) => block.id),
        ...collectRecommendationNodeIds(section.children || []),
    ]);
}

// Сохраняем раздел, если он сам попал в окно страницы, либо если в окне есть его
// рекомендации или вложенные разделы (родитель остаётся для контекста).
function filterSectionsByVisibleIds(sections, visibleIds) {
    return sections
        .map((section) => {
            const blocks = (section.blocks || []).filter((block) => visibleIds.has(block.id));
            const children = filterSectionsByVisibleIds(section.children || [], visibleIds);

            if (!visibleIds.has(section.id) && !blocks.length && !children.length) return null;

            return {
                ...section,
                blocks,
                children,
            };
        })
        .filter(Boolean);
}

export function paginateRecommendationBase(sections, page = 1, perPage = RECOMMENDATION_BLOCKS_PER_PAGE) {
    const numbered = annotateRecommendationNumbers(sections);
    const allNodeIds = collectRecommendationNodeIds(numbered);
    const totalBlocks = allNodeIds.length;
    const pageCount = Math.max(1, Math.ceil(totalBlocks / perPage));
    const currentPage = Math.min(pageCount, Math.max(1, Number(page) || 1));
    const startIndex = (currentPage - 1) * perPage;
    const visibleIds = new Set(allNodeIds.slice(startIndex, startIndex + perPage));

    return {
        sections: filterSectionsByVisibleIds(numbered, visibleIds),
        page: currentPage,
        pageCount,
        totalBlocks,
        startBlock: totalBlocks ? startIndex + 1 : 0,
        endBlock: Math.min(totalBlocks, startIndex + perPage),
        perPage,
    };
}
