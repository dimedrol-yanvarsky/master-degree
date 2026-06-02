import { Badge, Button, KitIcon } from '../../../shared/ui/kit';
import { RecommendationInlineEditor } from '../../../features/recommendation-editor';
import styles from '../RecommendationBase.module.css';

export function RecommendationBlock({ block, permissions, editingId, onDelete, onEdit, onEditCancel, onEditSave }) {
    const isEditing = editingId === block.id;
    const hasTitle = Boolean(block.title);
    const canManage = permissions.canEdit || permissions.canDelete;
    const deleteLabel = block.title || 'рекомендацию';

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
                            {hasTitle ? (
                                <strong>{block.title}</strong>
                            ) : (
                                <span className={styles.blockEyebrow}>Рекомендация</span>
                            )}
                            {block.summary && <p className={styles.blockSummary}>{block.summary}</p>}
                            {block.content && <p className={styles.blockContent}>{block.content}</p>}
                        </div>
                        {canManage && (
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
