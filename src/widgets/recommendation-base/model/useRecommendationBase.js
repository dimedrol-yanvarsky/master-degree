import { useEffect, useMemo, useState } from 'react';
import {
    apiCreateRecommendationBlock,
    apiCreateRecommendationSection,
    apiDeleteRecommendationBlock,
    apiDeleteRecommendationSection,
    apiRecommendations,
    apiUpdateRecommendationBlock,
    apiUpdateRecommendationSection,
    getRecommendationSectionOptions,
    paginateRecommendationBase,
    RECOMMENDATION_BLOCKS_PER_PAGE,
} from '../../../entities/recommendation';
import { getRecommendationPermissions } from '../../../features/recommendation-editor';

export function useRecommendationBase(status) {
    const [sections, setSections] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const permissions = getRecommendationPermissions(status);
    const sectionOptions = useMemo(() => getRecommendationSectionOptions(sections), [sections]);
    const paginatedBase = useMemo(
        () => paginateRecommendationBase(sections, currentPage, RECOMMENDATION_BLOCKS_PER_PAGE),
        [sections, currentPage],
    );

    useEffect(() => {
        let active = true;
        setIsLoading(true);
        setLoadError('');
        apiRecommendations()
            .then((items) => {
                if (!active) return;
                setSections(items);
            })
            .catch((error) => {
                if (!active) return;
                setSections([]);
                setLoadError(error.message || 'Не удалось загрузить рекомендательную базу.');
            })
            .finally(() => {
                if (active) setIsLoading(false);
            });

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (currentPage !== paginatedBase.page) {
            setCurrentPage(paginatedBase.page);
        }
    }, [currentPage, paginatedBase.page]);

    const applyMutation = async (request) => {
        try {
            setLoadError('');
            const nextSections = await request();
            setSections(nextSections);
            setEditingId(null);
        } catch (error) {
            setLoadError(error.message || 'Не удалось сохранить изменения в рекомендательной базе.');
        }
    };

    const handleAddSection = (parentId, draft) => {
        applyMutation(() => apiCreateRecommendationSection({ ...draft, parentId }));
    };

    const handleAddBlock = (sectionId, draft) => {
        applyMutation(() => apiCreateRecommendationBlock({ ...draft, sectionId }));
    };

    const handleDeleteSection = (sectionId, title) => {
        if (typeof window !== 'undefined' && !window.confirm('Удалить раздел «' + title + '» вместе с подразделами и блоками?')) {
            return;
        }

        applyMutation(() => apiDeleteRecommendationSection(sectionId));
    };

    const handleDeleteBlock = (blockId, title) => {
        if (typeof window !== 'undefined' && !window.confirm('Удалить блок рекомендации «' + title + '»?')) {
            return;
        }

        applyMutation(() => apiDeleteRecommendationBlock(blockId));
    };

    const handleSaveSection = (sectionId, draft) => {
        applyMutation(() => apiUpdateRecommendationSection(sectionId, draft));
    };

    const handleSaveBlock = (blockId, draft) => {
        applyMutation(() => apiUpdateRecommendationBlock(blockId, draft));
    };

    return {
        editingId,
        currentPage,
        isLoading,
        loadError,
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
