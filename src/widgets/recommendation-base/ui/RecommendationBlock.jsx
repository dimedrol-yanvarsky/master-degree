import { Badge, Button, KitIcon } from '../../../shared/ui/kit';
import { RecommendationInlineEditor } from '../../../features/recommendation-editor';
import styles from '../RecommendationBase.module.css';

export function RecommendationBlock({
    block,
    permissions,
    editingId,
    selectionMode = false,
    isSelected = false,
    assignedAssignment = null,
    isFullyAssigned = false,
    isPartiallyAssigned = false,
    onDelete,
    onDeleteAssignment,
    onEdit,
    onEditCancel,
    onEditSave,
    onToggleSelect,
}) {
    const isEditing = editingId === block.id;
    const hasTitle = Boolean(block.title);
    const canManage = permissions.canEdit || permissions.canDelete;
    const deleteLabel = block.title || 'рекомендацию';
    const canSelectAssignment = selectionMode && !isFullyAssigned;

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
                        <div className={styles.blockBody}>
                            {hasTitle && <strong>{block.title}</strong>}
                            {block.summary && <p className={styles.blockSummary}>{block.summary}</p>}
                            {block.content && <p className={styles.blockContent}>{block.content}</p>}
                        </div>
                        {selectionMode && (
                            <div className={styles.selectionActions}>
                                {canSelectAssignment && (
                                    <label className={styles.assignmentCheckbox}>
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => onToggleSelect?.(block.id)}
                                        />
                                        <span>Выбрать</span>
                                    </label>
                                )}
                                {assignedAssignment && (
                                    <>
                                        <Badge tone="success">
                                            {isPartiallyAssigned ? 'Назначена части клиентов' : 'Уже назначена'}
                                        </Badge>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            iconLeft={<KitIcon name="trash" />}
                                            onClick={() => onDeleteAssignment?.(assignedAssignment)}>
                                            Удалить
                                        </Button>
                                    </>
                                )}
                            </div>
                        )}
                        {!selectionMode && canManage && (
                            <div className={styles.actions}>
                                {permissions.canEdit && (
                                    <Button size="sm" variant="secondary" iconLeft={<KitIcon name="edit" />} onClick={() => onEdit(block.id)}>
                                        Изменить
                                    </Button>
                                )}
                                {permissions.canDelete && (
                                    <Button size="sm" variant="destructive" iconLeft={<KitIcon name="trash" />} onClick={() => onDelete(block.id, deleteLabel)}>
                                        Удалить
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
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
