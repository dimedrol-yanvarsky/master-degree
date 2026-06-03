import { Button, KitIcon } from '../../../shared/ui/kit';
import { RecommendationInlineEditor } from '../../../features/recommendation-editor';
import styles from '../RecommendationBase.module.css';
import { RecommendationBlock } from './RecommendationBlock';
import { RecommendationInsertPoint } from './RecommendationInsertPoint';

export function RecommendationSection({
    section,
    number,
    permissions,
    editingId,
    selectionMode = false,
    selectedBlockIds = [],
    getAssignmentState,
    onDeleteBlock,
    onDeleteAssignment,
    onDeleteSection,
    onEdit,
    onEditCancel,
    onAddSection,
    onAddBlock,
    onSaveBlock,
    onSaveSection,
    onToggleBlockSelection,
}) {
    const isEditing = editingId === section.id;
    const hasBlocks = section.blocks?.length > 0;
    const hasChildren = section.children?.length > 0;
    const canInsert = permissions.canCreate && !selectionMode;
    const nextChildNumber = `${number}.${(section.children?.length || 0) + 1}`;

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

                {!selectionMode && !isEditing && (permissions.canEdit || permissions.canDelete) && (
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
                    {section.blocks.map((block) => {
                        const assignmentState = getAssignmentState?.(block) || {};

                        return (
                            <div className={styles.blockSlot} key={block.id}>
                                <RecommendationBlock
                                    block={block}
                                    permissions={permissions}
                                    editingId={editingId}
                                    selectionMode={selectionMode}
                                    isSelected={selectedBlockIds.includes(block.id)}
                                    assignedAssignment={assignmentState.assignedAssignment}
                                    isFullyAssigned={assignmentState.isFullyAssigned}
                                    isPartiallyAssigned={assignmentState.isPartiallyAssigned}
                                    onDelete={onDeleteBlock}
                                    onDeleteAssignment={onDeleteAssignment}
                                    onEdit={onEdit}
                                    onEditCancel={onEditCancel}
                                    onEditSave={onSaveBlock}
                                    onToggleSelect={onToggleBlockSelection}
                                />
                                {canInsert && (
                                    <RecommendationInsertPoint
                                        sectionId={section.id}
                                        nextSectionNumber={nextChildNumber}
                                        canAddSection
                                        onAddSection={onAddSection}
                                        onAddBlock={onAddBlock}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {canInsert && !hasBlocks && (
                <RecommendationInsertPoint
                    sectionId={section.id}
                    nextSectionNumber={nextChildNumber}
                    canAddSection
                    onAddSection={onAddSection}
                    onAddBlock={onAddBlock}
                />
            )}

            {hasChildren && (
                <div className={styles.children}>
                    {section.children.map((child) => (
                        <RecommendationSection
                            key={child.id}
                            section={child}
                            number={child.number}
                            permissions={permissions}
                            editingId={editingId}
                            selectionMode={selectionMode}
                            selectedBlockIds={selectedBlockIds}
                            getAssignmentState={getAssignmentState}
                            onDeleteBlock={onDeleteBlock}
                            onDeleteAssignment={onDeleteAssignment}
                            onDeleteSection={onDeleteSection}
                            onEdit={onEdit}
                            onEditCancel={onEditCancel}
                            onAddSection={onAddSection}
                            onAddBlock={onAddBlock}
                            onSaveBlock={onSaveBlock}
                            onSaveSection={onSaveSection}
                            onToggleBlockSelection={onToggleBlockSelection}
                        />
                    ))}
                </div>
            )}

        </article>
    );
}
