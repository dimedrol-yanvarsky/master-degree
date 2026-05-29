import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, KitIcon } from '../../shared/ui/kit';
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
} from '../../entities/recommendation';
import {
    getRecommendationPermissions,
    RecommendationEditorPanel,
    RecommendationInlineEditor,
} from '../../features/recommendation-editor';
import styles from './RecommendationBase.module.css';

function RecommendationBlock({ block, permissions, editingId, onDelete, onEdit, onEditCancel, onEditSave }) {
    const isEditing = editingId === block.id;

    return (
        <article className={styles.block}>
            {isEditing ? (
                <RecommendationInlineEditor
                    kind="block"
                    initialValue={block}
                    onCancel={onEditCancel}
                    onSave={(draft) => onEditSave(block.id, draft)}
                />
            ) : (
                <>
                    <div className={styles.blockTop}>
                        <div>
                            <strong>{block.title}</strong>
                            <p>{block.summary}</p>
                        </div>
                        {(permissions.canEdit || permissions.canDelete) && (
                            <div className={styles.actions}>
                                {permissions.canEdit && (
                                    <Button size="sm" variant="secondary" iconLeft={<KitIcon name="edit" />} onClick={() => onEdit(block.id)}>
                                        Изменить
                                    </Button>
                                )}
                                {permissions.canDelete && (
                                    <Button size="sm" variant="destructive" iconLeft={<KitIcon name="trash" />} onClick={() => onDelete(block.id, block.title)}>
                                        Удалить
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                    <p className={styles.blockContent}>{block.content}</p>
                    {block.tags?.length > 0 && (
                        <div className={styles.tags}>
                            {block.tags.map((tag) => (
                                <Badge key={tag} tone="accent" appearance="glass">{tag}</Badge>
                            ))}
                        </div>
                    )}
                </>
            )}
        </article>
    );
}

function RecommendationSection({
    section,
    number,
    permissions,
    editingId,
    onDeleteBlock,
    onDeleteSection,
    onEdit,
    onEditCancel,
    onSaveBlock,
    onSaveSection,
}) {
    const isEditing = editingId === section.id;
    const hasBlocks = section.blocks?.length > 0;
    const hasChildren = section.children?.length > 0;

    return (
        <article className={styles.section}>
            <div className={styles.sectionHead}>
                <div className={styles.sectionTitle}>
                    <span>{number}</span>
                    <div>
                        {isEditing ? (
                            <RecommendationInlineEditor
                                kind="section"
                                initialValue={section}
                                onCancel={onEditCancel}
                                onSave={(draft) => onSaveSection(section.id, draft)}
                            />
                        ) : (
                            <>
                                <h2>{section.title}</h2>
                                {section.description && <p>{section.description}</p>}
                            </>
                        )}
                    </div>
                </div>

                {!isEditing && (permissions.canEdit || permissions.canDelete) && (
                    <div className={styles.actions}>
                        {permissions.canEdit && (
                            <Button size="sm" variant="secondary" iconLeft={<KitIcon name="edit" />} onClick={() => onEdit(section.id)}>
                                Изменить
                            </Button>
                        )}
                        {permissions.canDelete && (
                            <Button size="sm" variant="destructive" iconLeft={<KitIcon name="trash" />} onClick={() => onDeleteSection(section.id, section.title)}>
                                Удалить
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {hasBlocks && (
                <div className={styles.blocks}>
                    {section.blocks.map((block) => (
                        <RecommendationBlock
                            key={block.id}
                            block={block}
                            permissions={permissions}
                            editingId={editingId}
                            onDelete={onDeleteBlock}
                            onEdit={onEdit}
                            onEditCancel={onEditCancel}
                            onEditSave={onSaveBlock}
                        />
                    ))}
                </div>
            )}

            {hasChildren && (
                <div className={styles.children}>
                    {section.children.map((child, index) => (
                        <RecommendationSection
                            key={child.id}
                            section={child}
                            number={`${number}.${index + 1}`}
                            permissions={permissions}
                            editingId={editingId}
                            onDeleteBlock={onDeleteBlock}
                            onDeleteSection={onDeleteSection}
                            onEdit={onEdit}
                            onEditCancel={onEditCancel}
                            onSaveBlock={onSaveBlock}
                            onSaveSection={onSaveSection}
                        />
                    ))}
                </div>
            )}
        </article>
    );
}

export function RecommendationBase({ status = null }) {
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
        if (typeof window !== 'undefined' && !window.confirm(`Удалить раздел «${title}» вместе с подразделами и блоками?`)) {
            return;
        }

        setEditingId(null);
        setSections((current) => deleteRecommendationSection(current, sectionId));
    };

    const handleDeleteBlock = (blockId, title) => {
        if (typeof window !== 'undefined' && !window.confirm(`Удалить блок рекомендации «${title}»?`)) {
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

    return (
        <section className={styles.root}>
            <header className={styles.hero}>
                <div>
                    <Badge tone={status === 'admin' ? 'warning' : status === 'specialist' ? 'success' : 'accent'}>
                        {permissions.roleLabel}
                    </Badge>
                    <h1>Рекомендательная база</h1>
                    <p>
                        Иерархия разделов, подразделов и блоков рекомендаций для работы специалиста с клиентскими сценариями.
                    </p>
                </div>
            </header>

            {permissions.canCreate && (
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

            <div className={styles.tree}>
                <div className={styles.pageMeta}>
                    <span>
                        Показаны блоки {paginatedBase.startBlock}-{paginatedBase.endBlock} из {paginatedBase.totalBlocks}
                    </span>
                    <span>До {RECOMMENDATION_BLOCKS_PER_PAGE} блоков на странице</span>
                </div>

                {paginatedBase.sections.map((section, index) => (
                    <RecommendationSection
                        key={section.id}
                        section={section}
                        number={String(index + 1)}
                        permissions={permissions}
                        editingId={editingId}
                        onDeleteBlock={handleDeleteBlock}
                        onDeleteSection={handleDeleteSection}
                        onEdit={setEditingId}
                        onEditCancel={() => setEditingId(null)}
                        onSaveBlock={handleSaveBlock}
                        onSaveSection={handleSaveSection}
                    />
                ))}
            </div>

            {paginatedBase.pageCount > 1 && (
                <nav className={styles.pagination} aria-label="Пагинация рекомендательных блоков">
                    <Button
                        variant="secondary"
                        iconLeft={<KitIcon name="arrowLeft" size={16} />}
                        disabled={paginatedBase.page === 1}
                        onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>
                        Назад
                    </Button>
                    <div className={styles.pageButtons}>
                        {Array.from({ length: paginatedBase.pageCount }, (_, index) => {
                            const page = index + 1;
                            const isCurrent = page === paginatedBase.page;

                            return (
                                <Button
                                    key={page}
                                    variant={isCurrent ? 'gradient' : 'secondary'}
                                    gradient="radial"
                                    size="sm"
                                    aria-current={isCurrent ? 'page' : undefined}
                                    onClick={() => setCurrentPage(page)}>
                                    {page}
                                </Button>
                            );
                        })}
                    </div>
                    <Button
                        variant="secondary"
                        iconRight={<KitIcon name="arrowRight" size={16} />}
                        disabled={paginatedBase.page === paginatedBase.pageCount}
                        onClick={() => setCurrentPage((page) => Math.min(paginatedBase.pageCount, page + 1))}>
                        Вперед
                    </Button>
                </nav>
            )}
        </section>
    );
}
