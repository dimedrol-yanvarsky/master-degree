export const RECOMMENDATION_BLOCKS_PER_PAGE = 10;

function collectRecommendationBlockIds(sections) {
    return sections.flatMap((section) => [
        ...(section.blocks || []).map((block) => block.id),
        ...collectRecommendationBlockIds(section.children || []),
    ]);
}

function filterSectionsByBlockIds(sections, visibleBlockIds) {
    return sections
        .map((section) => {
            const blocks = (section.blocks || []).filter((block) => visibleBlockIds.has(block.id));
            const children = filterSectionsByBlockIds(section.children || [], visibleBlockIds);

            if (!blocks.length && !children.length) return null;

            return {
                ...section,
                blocks,
                children,
            };
        })
        .filter(Boolean);
}

export function paginateRecommendationBase(sections, page = 1, perPage = RECOMMENDATION_BLOCKS_PER_PAGE) {
    const allBlockIds = collectRecommendationBlockIds(sections);
    const totalBlocks = allBlockIds.length;
    const pageCount = Math.max(1, Math.ceil(totalBlocks / perPage));
    const currentPage = Math.min(pageCount, Math.max(1, Number(page) || 1));
    const startIndex = (currentPage - 1) * perPage;
    const visibleBlockIds = new Set(allBlockIds.slice(startIndex, startIndex + perPage));

    return {
        sections: filterSectionsByBlockIds(sections, visibleBlockIds),
        page: currentPage,
        pageCount,
        totalBlocks,
        startBlock: totalBlocks ? startIndex + 1 : 0,
        endBlock: Math.min(totalBlocks, startIndex + perPage),
        perPage,
    };
}
