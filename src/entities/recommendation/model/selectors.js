export function getRecommendationSectionOptions(sections, prefix = '') {
    return sections.flatMap((section, index) => {
        const computed = prefix ? `${prefix}.${index + 1}` : String(index + 1);
        // Тот же принцип, что и на странице: номер раздела берём из БД (section.number),
        // а если его нет — вычисляем по позиции в дереве.
        const path = typeof section.number === 'string' && section.number.trim()
            ? section.number.trim()
            : computed;
        const option = {
            value: section.id,
            label: `${path}. ${section.title}`,
            description: section.description,
        };

        return [
            option,
            ...getRecommendationSectionOptions(section.children || [], path),
        ];
    });
}

export function getRecommendationBaseStats(sections) {
    return sections.reduce((stats, section) => {
        const childStats = getRecommendationBaseStats(section.children || []);

        return {
            sections: stats.sections + 1 + childStats.sections,
            blocks: stats.blocks + (section.blocks || []).length + childStats.blocks,
        };
    }, { sections: 0, blocks: 0 });
}
