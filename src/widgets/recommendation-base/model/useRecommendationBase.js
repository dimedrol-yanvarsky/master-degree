import { useEffect, useMemo, useState } from 'react';
import {
    addRecommendationBlock,
    addRecommendationSection,
    deleteRecommendationBlock,
    deleteRecommendationSection,
    getRecommendationSectionOptions,
    paginateRecommendationBase,
    RECOMMENDATION_BLOCKS_PER_PAGE,
    readRecommendationBase,
    saveRecommendationBase,
    updateRecommendationBlock,
    updateRecommendationSection,
} from '../../../entities/recommendation';
import { getRecommendationPermissions } from '../../../features/recommendation-editor';

export function useRecommendationBase(status) {
    const [sections, setSections] = useState(readRecommendationBase);
    const [editingId, setEditingId] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const permissions = getRecommendationPermissions(status);
    const sectionOptions = useMemo(() => getRecommendationSectionOptions(sections), [sections]);
    const paginatedBase = useMemo(
        () => paginateRecommendationBase(sections, currentPage, RECOMMENDATION_BLOCKS_PER_PAGE),
        [sections, currentPage],
    );

    useEffect(() => {
        saveRecommendationBase(sections);
    }, [sections]);

    useEffect(() => {
        if (currentPage !== paginatedBase.page) {
            setCurrentPage(paginatedBase.page);
        }
    }, [currentPage, paginatedBase.page]);

    const handleAddSection = (parentId, draft) => {
        setSections((current) => addRecommendationSection(current, parentId, draft));
    };

    const handleAddBlock = (sectionId, draft) => {
        setSections((current) => addRecommendationBlock(current, sectionId, draft));
    };

    const handleDeleteSection = (sectionId, title) => {
        if (typeof window !== 'undefined' && !window.confirm('Удалить раздел «' + title + '» вместе с подразделами и блоками?')) {
            return;
        }

        setEditingId(null);
        setSections((current) => deleteRecommendationSection(current, sectionId));
    };

    const handleDeleteBlock = (blockId, title) => {
        if (typeof window !== 'undefined' && !window.confirm('Удалить блок рекомендации «' + title + '»?')) {
            return;
        }

        setEditingId(null);
        setSections((current) => deleteRecommendationBlock(current, blockId));
    };

    const handleSaveSection = (sectionId, draft) => {
        setSections((current) => updateRecommendationSection(current, sectionId, draft));
        setEditingId(null);
    };

    const handleSaveBlock = (blockId, draft) => {
        setSections((current) => updateRecommendationBlock(current, blockId, draft));
        setEditingId(null);
    };

    return {
        editingId,
        currentPage,
        permissions,
        sectionOptions,
        paginatedBase,
        setCurrentPage,
        setEditingId,
        handleAddSection,
        handleAddBlock,
        handleDeleteSection,
        handleDeleteBlock,
        handleSaveSection,
        handleSaveBlock,
    };
}
