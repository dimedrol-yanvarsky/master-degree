import { useEffect, useMemo, useState } from 'react';
import {
    apiCreateRecommendationBlock,
    apiCreateRecommendationSection,
    apiDeleteRecommendationBlock,
    apiDeleteRecommendationSection,
    apiRecommendations,
    apiRecommendationsPage,
    apiUpdateRecommendationBlock,
    apiUpdateRecommendationSection,
    getRecommendationSectionOptions,
    paginateRecommendationBase,
    RECOMMENDATION_BLOCKS_PER_PAGE,
} from '../../../entities/recommendation';
import { getRecommendationPermissions } from '../../../features/recommendation-editor';

export function useRecommendationBase(status, currentPage = 1) {
    const [sections, setSections] = useState([]);
    const [pageMeta, setPageMeta] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [editingId, setEditingId] = useState(null);
    const permissions = getRecommendationPermissions(status);
    const shouldUsePagedRequest = !permissions.canCreate && !permissions.canEdit && !permissions.canDelete;
    const requestPage = shouldUsePagedRequest ? currentPage : 1;
    const sectionOptions = useMemo(() => getRecommendationSectionOptions(sections), [sections]);
    const paginatedBase = useMemo(() => {
        if (pageMeta) {
            return {
                ...pageMeta,
                sections,
            };
        }
        return paginateRecommendationBase(sections, currentPage, RECOMMENDATION_BLOCKS_PER_PAGE);
    }, [sections, currentPage, pageMeta]);

    useEffect(() => {
        let active = true;
        setIsLoading(true);
        setLoadError('');
        const request = shouldUsePagedRequest ? apiRecommendationsPage(requestPage) : apiRecommendations();
        request
            .then((result) => {
                if (!active) return;
                if (shouldUsePagedRequest) {
                    setSections(result.items);
                    setPageMeta({
                        page: result.page,
                        pageCount: result.pageCount,
                        totalBlocks: result.totalBlocks,
                        startBlock: result.startBlock,
                        endBlock: result.endBlock,
                        perPage: result.perPage,
                    });
                    return;
                }
                setSections(result);
                setPageMeta(null);
            })
            .catch((error) => {
                if (!active) return;
                setSections([]);
                setPageMeta(null);
                setLoadError(error.message || 'Не удалось загрузить рекомендательную базу.');
            })
            .finally(() => {
                if (active) setIsLoading(false);
            });

        return () => {
            active = false;
        };
    }, [requestPage, shouldUsePagedRequest]);

    const applyMutation = async (request) => {
        try {
            setLoadError('');
            const nextSections = await request();
            setSections(nextSections);
            setPageMeta(null);
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
        isLoading,
        loadError,
        permissions,
        sectionOptions,
        paginatedBase,
        setEditingId,
        handleAddSection,
        handleAddBlock,
        handleDeleteSection,
        handleDeleteBlock,
        handleSaveSection,
        handleSaveBlock,
    };
}
