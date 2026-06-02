import { Badge, KitIcon } from '../../shared/ui/kit';
import { RecommendationEditorPanel } from '../../features/recommendation-editor';
import { useRecommendationBase } from './model/useRecommendationBase';
import styles from './RecommendationBase.module.css';
import { RecommendationPagination } from './ui/RecommendationPagination';
import { RecommendationSection } from './ui/RecommendationSection';

export function RecommendationBase({ status = null }) {
    const {
        editingId,
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
    } = useRecommendationBase(status);

    return (
        <section className={styles.root}>
            <header className={styles.hero}>
                <div>
                    {permissions.roleLabel !== 'Просмотр' && (
                        <Badge tone={status === 'admin' ? 'warning' : 'success'}>
                            {permissions.roleLabel}
                        </Badge>
                    )}
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

            {isLoading && <p className={styles.statusMessage}>Загружаем рекомендательную базу...</p>}
            {!isLoading && loadError && <p className={styles.statusMessage}>{loadError}</p>}
            {!isLoading && !loadError && paginatedBase.totalBlocks === 0 && (
                <p className={styles.statusMessage}>В базе пока нет опубликованных рекомендаций.</p>
            )}

            {!isLoading && !loadError && paginatedBase.totalBlocks > 0 && (
                <div className={styles.tree}>
                    {paginatedBase.sections.map((section) => (
                        <RecommendationSection
                            key={section.id}
                            section={section}
                            number={section.number}
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
            )}

            {!isLoading && !loadError && paginatedBase.totalBlocks > 0 && (
                <RecommendationPagination
                    page={paginatedBase.page}
                    pageCount={paginatedBase.pageCount}
                    onPageChange={setCurrentPage}
                />
            )}
        </section>
    );
}
