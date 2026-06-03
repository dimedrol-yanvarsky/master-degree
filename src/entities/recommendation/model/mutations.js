function createId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function normalizeTags(tags) {
    if (Array.isArray(tags)) return tags.map((tag) => String(tag).trim()).filter(Boolean);
    return String(tags || '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
}

function createSection(draft) {
    return {
        id: createId('section'),
        number: String(draft.number || '').trim(),
        title: String(draft.title || '').trim(),
        description: String(draft.description || '').trim(),
        blocks: [],
        children: [],
    };
}

function createBlock(draft) {
    return {
        id: createId('block'),
        title: String(draft.title || '').trim(),
        summary: String(draft.summary || '').trim(),
        content: String(draft.content || '').trim(),
        tags: normalizeTags(draft.tags),
    };
}

function mapSections(sections, sectionId, mapper) {
    return sections.map((section) => {
        if (section.id === sectionId) return mapper(section);

        return {
            ...section,
            children: mapSections(section.children || [], sectionId, mapper),
        };
    });
}
export function addRecommendationSection(sections, parentId, draft) {
    const nextSection = createSection(draft);
    if (!parentId || parentId === 'root') return [...sections, nextSection];

    return mapSections(sections, parentId, (section) => ({
        ...section,
        children: [...(section.children || []), nextSection],
    }));
}

export function updateRecommendationSection(sections, sectionId, draft) {
    return mapSections(sections, sectionId, (section) => ({
        ...section,
        title: String(draft.title || '').trim(),
        description: String(draft.description || '').trim(),
    }));
}

export function deleteRecommendationSection(sections, sectionId) {
    return sections
        .filter((section) => section.id !== sectionId)
        .map((section) => ({
            ...section,
            children: deleteRecommendationSection(section.children || [], sectionId),
        }));
}

export function addRecommendationBlock(sections, sectionId, draft) {
    const nextBlock = createBlock(draft);

    return mapSections(sections, sectionId, (section) => ({
        ...section,
        blocks: [...(section.blocks || []), nextBlock],
    }));
}

export function updateRecommendationBlock(sections, blockId, draft) {
    return sections.map((section) => ({
        ...section,
        blocks: (section.blocks || []).map((block) => (
            block.id === blockId
                ? {
                    ...block,
                    title: String(draft.title || '').trim(),
                    summary: String(draft.summary || '').trim(),
                    content: String(draft.content || '').trim(),
                    tags: normalizeTags(draft.tags),
                }
                : block
        )),
        children: updateRecommendationBlock(section.children || [], blockId, draft),
    }));
}

export function deleteRecommendationBlock(sections, blockId) {
    return sections.map((section) => ({
        ...section,
        blocks: (section.blocks || []).filter((block) => block.id !== blockId),
        children: deleteRecommendationBlock(section.children || [], blockId),
    }));
}
