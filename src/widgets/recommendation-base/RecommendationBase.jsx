import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, KitIcon } from '../../shared/ui/kit';
import { RecommendationEditorPanel } from '../../features/recommendation-editor';
import {
    apiAssignRecommendation,
    apiDeleteAssignedRecommendation,
    apiMyAssignedRecommendations,
    apiSpecialistAssignedRecommendations,
} from '../../entities/recommendation';
import { apiCollaborationRequests } from '../../entities/collaboration';
import { useRecommendationBase } from './model/useRecommendationBase';
import styles from './RecommendationBase.module.css';
import { RecommendationPagination } from './ui/RecommendationPagination';
import { RecommendationSection } from './ui/RecommendationSection';
import { RecommendationInsertPoint } from './ui/RecommendationInsertPoint';

const HERO_DESCRIPTION = 'База рекомендаций позволит Вам быстрее прожить горевание и вернуться в спокойную, размеренную жизнь.';

function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function buildAssignedText(block) {
    const title = String(block?.title || '').trim();
    const content = String(block?.content || block?.summary || '').trim();
    if (!title) return content;
    if (!content || content.startsWith(title)) return content || title;
    const separator = /[.!?:;]$/.test(title) ? ' ' : '. ';
    return `${title}${separator}${content}`.trim();
}

function collectBlocks(sections = []) {
    return sections.flatMap((section) => [
        ...(section.blocks || []),
        ...collectBlocks(section.children || []),
    ]);
}

function acceptedClientOptions(requests = []) {
    const seen = new Set();
    return requests
        .filter((request) => (
            (request?.direction === 'accepted' || request?.status === 'accepted')
            && request.counterpartId
        ))
        .filter((request) => {
            if (seen.has(request.counterpartId)) return false;
            seen.add(request.counterpartId);
            return true;
        })
        .map((request) => ({
            value: request.counterpartId,
            label: request.counterpartName || request.counterpartEmail || 'Клиент',
            description: request.counterpartEmail || 'Сотрудничество активно',
        }));
}

function specialistOptions(assignments = []) {
    const seen = new Set();
    return assignments
        .filter((assignment) => assignment.specialistId)
        .filter((assignment) => {
            if (seen.has(assignment.specialistId)) return false;
            seen.add(assignment.specialistId);
            return true;
        })
        .map((assignment) => ({
            value: assignment.specialistId,
            label: assignment.specialistName || assignment.specialistEmail || 'Специалист',
            description: assignment.specialistEmail || 'Персональные рекомендации',
        }));
}

function ChecklistDropdown({ label, options, selectedValues, onToggle, emptyText }) {
    const selectedLabels = options
        .filter((option) => selectedValues.includes(option.value))
        .map((option) => option.label);

    return (
        <details className={styles.assignmentDropdown}>
            <summary>
                <span>{label}</span>
                {selectedLabels.length > 0 && <strong>{selectedLabels.join(', ')}</strong>}
                <KitIcon name="chevron" size={14} />
            </summary>
            <div className={styles.assignmentDropdownList}>
                {options.length > 0 ? options.map((option) => (
                    <label key={option.value} className={styles.assignmentOption}>
                        <input
                            type="checkbox"
                            checked={selectedValues.includes(option.value)}
                            onChange={() => onToggle(option.value)}
                        />
                        <span>
                            <strong>{option.label}</strong>
                            {option.description && <small>{option.description}</small>}
                        </span>
                    </label>
                )) : (
                    <p>{emptyText}</p>
                )}
            </div>
        </details>
    );
}

function PersonalRecommendationList({ assignments }) {
    return (
        <div className={styles.personalList}>
            {assignments.map((assignment) => (
                <article className={styles.personalCard} key={assignment.id}>
                    <div>
                        <span>{assignment.specialistName || assignment.specialistEmail || 'Специалист'}</span>
                        <p>{assignment.text || 'Текст рекомендации не заполнен.'}</p>
                    </div>
                    {assignment.assignedAt && (
                        <small>
                            Назначена {new Intl.DateTimeFormat('ru-RU', {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                            }).format(new Date(assignment.assignedAt))}
                        </small>
                    )}
                </article>
            ))}
        </div>
    );
}

export function RecommendationBase({ status = null }) {
    const [searchParams, setSearchParams] = useSearchParams();
    const [collaborationRequests, setCollaborationRequests] = useState([]);
    const [assignedRecommendations, setAssignedRecommendations] = useState([]);
    const [clientAssignments, setClientAssignments] = useState([]);
    const [selectedClientIds, setSelectedClientIds] = useState([]);
    const [selectedBlockIds, setSelectedBlockIds] = useState([]);
    const [selectedSpecialistIds, setSelectedSpecialistIds] = useState([]);
    const [assignmentError, setAssignmentError] = useState('');
    const [isSavingAssignments, setIsSavingAssignments] = useState(false);
    const pageParam = searchParams.get('page');
    const requestedPage = Number(pageParam || 1);
    const {
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
    } = useRecommendationBase(status, requestedPage);

    const allBlocks = useMemo(() => collectBlocks(paginatedBase.sections), [paginatedBase.sections]);
    const clientOptions = useMemo(() => acceptedClientOptions(collaborationRequests), [collaborationRequests]);
    const specialistFilterOptions = useMemo(() => specialistOptions(clientAssignments), [clientAssignments]);
    const selectionMode = status === 'specialist' && selectedClientIds.length > 0;
    const canUseInsertPoints = permissions.canCreate && !selectionMode && paginatedBase.totalBlocks > 0;

    const assignedLookup = useMemo(() => {
        const lookup = new Map();
        assignedRecommendations.forEach((assignment) => {
            const key = `${assignment.clientId}|${normalizeText(assignment.text)}`;
            if (!lookup.has(key)) lookup.set(key, assignment);
        });
        return lookup;
    }, [assignedRecommendations]);

    const filteredPersonalAssignments = useMemo(() => {
        if (!selectedSpecialistIds.length) return [];
        return clientAssignments.filter((assignment) => selectedSpecialistIds.includes(assignment.specialistId));
    }, [clientAssignments, selectedSpecialistIds]);

    const showPersonalOnly = status === 'client' && selectedSpecialistIds.length > 0;

    useEffect(() => {
        if (isLoading && pageParam) return;
        if (pageParam) {
            const pageNumber = Number(pageParam);
            const isValidPage = Number.isFinite(pageNumber) && pageNumber >= 1 && pageNumber <= paginatedBase.pageCount;
            const isWaitingForRequestedPage = isValidPage && pageNumber !== paginatedBase.page;
            if (isWaitingForRequestedPage) return;
        }
        if (pageParam !== String(paginatedBase.page)) {
            setSearchParams({ page: String(paginatedBase.page) }, { replace: true });
        }
    }, [isLoading, pageParam, paginatedBase.page, paginatedBase.pageCount, setSearchParams]);

    useEffect(() => {
        if (status !== 'specialist') return undefined;
        let active = true;

        Promise.all([apiCollaborationRequests(), apiSpecialistAssignedRecommendations()])
            .then(([requests, assignments]) => {
                if (!active) return;
                setCollaborationRequests(requests);
                setAssignedRecommendations(assignments);
                setAssignmentError('');
            })
            .catch((error) => {
                if (!active) return;
                setCollaborationRequests([]);
                setAssignedRecommendations([]);
                setAssignmentError(error.message || 'Не удалось загрузить данные для назначения рекомендаций.');
            });

        return () => {
            active = false;
        };
    }, [status]);

    useEffect(() => {
        if (status !== 'client') return undefined;
        let active = true;

        apiMyAssignedRecommendations()
            .then((assignments) => {
                if (!active) return;
                setClientAssignments(assignments);
                setAssignmentError('');
            })
            .catch((error) => {
                if (!active) return;
                setClientAssignments([]);
                setAssignmentError(error.message || 'Не удалось загрузить персональные рекомендации.');
            });

        return () => {
            active = false;
        };
    }, [status]);

    useEffect(() => {
        setSelectedClientIds((current) => current.filter((clientId) => clientOptions.some((option) => option.value === clientId)));
    }, [clientOptions]);

    useEffect(() => {
        setSelectedSpecialistIds((current) => current.filter((specialistId) => (
            specialistFilterOptions.some((option) => option.value === specialistId)
        )));
    }, [specialistFilterOptions]);

    const goToPage = (page) => {
        const nextPage = Math.min(paginatedBase.pageCount, Math.max(1, page));
        setSearchParams({ page: String(nextPage) });
    };

    const toggleClient = (clientId) => {
        setSelectedClientIds((current) => (
            current.includes(clientId)
                ? current.filter((item) => item !== clientId)
                : [...current, clientId]
        ));
        setAssignmentError('');
    };

    const toggleSpecialist = (specialistId) => {
        setSelectedSpecialistIds((current) => (
            current.includes(specialistId)
                ? current.filter((item) => item !== specialistId)
                : [...current, specialistId]
        ));
        setAssignmentError('');
    };

    const toggleBlockSelection = (blockId) => {
        setSelectedBlockIds((current) => (
            current.includes(blockId)
                ? current.filter((item) => item !== blockId)
                : [...current, blockId]
        ));
        setAssignmentError('');
    };

    const getAssignmentState = useCallback((block) => {
        const text = normalizeText(buildAssignedText(block));
        const emptyState = {
            assignedAssignment: null,
            isFullyAssigned: false,
            isPartiallyAssigned: false,
        };
        if (!text || !selectedClientIds.length) return emptyState;

        let assignedAssignment = null;
        let assignedCount = 0;
        for (const clientId of selectedClientIds) {
            const assignment = assignedLookup.get(`${clientId}|${text}`);
            if (assignment) {
                assignedAssignment = assignedAssignment || assignment;
                assignedCount += 1;
            }
        }
        return {
            assignedAssignment,
            isFullyAssigned: assignedCount === selectedClientIds.length,
            isPartiallyAssigned: assignedCount > 0 && assignedCount < selectedClientIds.length,
        };
    }, [assignedLookup, selectedClientIds]);

    useEffect(() => {
        setSelectedBlockIds((current) => {
            if (!current.length) return current;
            if (!selectionMode) return [];

            const selectableBlockIds = new Set(
                allBlocks
                    .filter((block) => !getAssignmentState(block).isFullyAssigned)
                    .map((block) => block.id),
            );
            const next = current.filter((blockId) => selectableBlockIds.has(blockId));
            return next.length === current.length ? current : next;
        });
    }, [allBlocks, getAssignmentState, selectionMode]);

    const reloadSpecialistAssignments = async () => {
        const assignments = await apiSpecialistAssignedRecommendations();
        setAssignedRecommendations(assignments);
    };

    const handleDeleteAssignment = async (assignment) => {
        if (!assignment?.id) return;
        try {
            const assignments = await apiDeleteAssignedRecommendation(assignment.id);
            setAssignedRecommendations(assignments);
            setAssignmentError('');
        } catch (error) {
            setAssignmentError(error.message || 'Не удалось удалить персональную рекомендацию.');
        }
    };

    const handleSaveAssignments = async () => {
        const selectedBlocks = allBlocks.filter((block) => selectedBlockIds.includes(block.id));
        if (!selectedClientIds.length || !selectedBlocks.length) {
            setAssignmentError('Выберите хотя бы одного клиента и одну рекомендацию.');
            return;
        }

        const requests = [];
        selectedClientIds.forEach((clientId) => {
            selectedBlocks.forEach((block) => {
                const text = buildAssignedText(block);
                if (!text.trim()) return;
                const lookupKey = `${clientId}|${normalizeText(text)}`;
                if (!assignedLookup.has(lookupKey)) {
                    requests.push(apiAssignRecommendation({ clientId, text }));
                }
            });
        });

        if (!requests.length) {
            setAssignmentError('Выбранные рекомендации уже назначены выбранным клиентам.');
            return;
        }

        setIsSavingAssignments(true);
        try {
            await Promise.all(requests);
            await reloadSpecialistAssignments();
            setSelectedBlockIds([]);
            setAssignmentError('');
        } catch (error) {
            setAssignmentError(error.message || 'Не удалось сохранить персональные рекомендации.');
        } finally {
            setIsSavingAssignments(false);
        }
    };

    return (
        <section className={styles.root}>
            <header className={styles.hero}>
                <div>
                    <h1>Рекомендательная база</h1>
                    <p>{HERO_DESCRIPTION}</p>
                </div>
            </header>

            {status === 'specialist' && (
                <section className={styles.assignmentPanel}>
                    <div className={styles.assignmentPanelHead}>
                        <div>
                            <h2>Персональные рекомендации</h2>
                            <p>Выберите клиентов, затем отметьте рекомендации в базе и сохраните назначение.</p>
                        </div>
                        <Button
                            variant="secondary"
                            iconRight={<KitIcon name="check" />}
                            disabled={!selectedClientIds.length || !selectedBlockIds.length || isSavingAssignments}
                            onClick={handleSaveAssignments}>
                            {isSavingAssignments ? 'Сохраняем...' : 'Сохранить'}
                        </Button>
                    </div>
                    <ChecklistDropdown
                        label="Выбрать клиента"
                        emptyText="Нет клиентов с активным сотрудничеством."
                        options={clientOptions}
                        selectedValues={selectedClientIds}
                        onToggle={toggleClient}
                    />
                    {selectedClientIds.length > 0 && (
                        <p className={styles.assignmentHint}>
                            Режим назначения рекомендаций включен
                        </p>
                    )}
                    {assignmentError && <p className={styles.assignmentError}>{assignmentError}</p>}
                </section>
            )}

            {status === 'client' && clientAssignments.length > 0 && (
                <section className={styles.assignmentPanel}>
                    <div className={styles.assignmentPanelHead}>
                        <div>
                            <h2>Рекомендации специалиста</h2>
                            <p>Выберите специалиста, чтобы увидеть только его персональные рекомендации.</p>
                        </div>
                    </div>
                    <ChecklistDropdown
                        label="Выбрать специалиста"
                        emptyText="Персональных рекомендаций пока нет."
                        options={specialistFilterOptions}
                        selectedValues={selectedSpecialistIds}
                        onToggle={toggleSpecialist}
                    />
                    {assignmentError && <p className={styles.assignmentError}>{assignmentError}</p>}
                </section>
            )}

            {permissions.canCreate && !isLoading && !loadError && paginatedBase.totalBlocks === 0 && (
                <RecommendationEditorPanel
                    sectionOptions={sectionOptions}
                    onAddSection={handleAddSection}
                    onAddBlock={handleAddBlock}
                />
            )}

            {status === 'admin' && (
                <div className={styles.adminNote}>
                    <KitIcon name="shield" size={18} />
                    <span>Администратор выполняет только управляющее воздействие: может удалять разделы и блоки рекомендаций, но не добавляет и не редактирует содержимое.</span>
                </div>
            )}

            {isLoading && <p className={styles.statusMessage}>Загружаем рекомендательную базу...</p>}
            {!isLoading && loadError && <p className={styles.statusMessage}>{loadError}</p>}
            {!isLoading && !loadError && !showPersonalOnly && paginatedBase.totalBlocks === 0 && (
                <p className={styles.statusMessage}>В базе пока нет опубликованных рекомендаций.</p>
            )}

            {!isLoading && !loadError && showPersonalOnly && (
                filteredPersonalAssignments.length > 0 ? (
                    <PersonalRecommendationList assignments={filteredPersonalAssignments} />
                ) : (
                    <p className={styles.statusMessage}>У выбранных специалистов пока нет персональных рекомендаций.</p>
                )
            )}

            {!isLoading && !loadError && !showPersonalOnly && paginatedBase.totalBlocks > 0 && (
                <div className={styles.tree}>
                    {canUseInsertPoints && (
                        <RecommendationInsertPoint
                            nextSectionNumber={String((paginatedBase.sections?.length || 0) + 1)}
                            canAddSection
                            onAddSection={handleAddSection}
                        />
                    )}
                    {paginatedBase.sections.map((section) => (
                        <div className={styles.sectionSlot} key={section.id}>
                            <RecommendationSection
                                section={section}
                                number={section.number}
                                permissions={permissions}
                                editingId={editingId}
                                selectionMode={selectionMode}
                                selectedBlockIds={selectedBlockIds}
                                getAssignmentState={getAssignmentState}
                                onDeleteBlock={handleDeleteBlock}
                                onDeleteAssignment={handleDeleteAssignment}
                                onDeleteSection={handleDeleteSection}
                                onEdit={setEditingId}
                                onEditCancel={() => setEditingId(null)}
                                onAddSection={handleAddSection}
                                onAddBlock={handleAddBlock}
                                onSaveBlock={handleSaveBlock}
                                onSaveSection={handleSaveSection}
                                onToggleBlockSelection={toggleBlockSelection}
                            />
                            {canUseInsertPoints && (
                                <RecommendationInsertPoint
                                    sectionId={section.id}
                                    sectionParentId="root"
                                    nextSectionNumber={String((paginatedBase.sections?.length || 0) + 1)}
                                    canAddSection
                                    onAddSection={handleAddSection}
                                    onAddBlock={handleAddBlock}
                                />
                            )}
                        </div>
                    ))}
                </div>
            )}

            {!isLoading && !loadError && !showPersonalOnly && paginatedBase.totalBlocks > 0 && (
                <RecommendationPagination
                    page={paginatedBase.page}
                    pageCount={paginatedBase.pageCount}
                    onPageChange={goToPage}
                />
            )}
        </section>
    );
}
