import { Badge, Button, KitIcon } from '../../../shared/ui/kit';
import { RecommendationInlineEditor } from '../../../features/recommendation-editor';
import styles from '../RecommendationBase.module.css';

export function RecommendationBlock({ block, permissions, editingId, onDelete, onEdit, onEditCancel, onEditSave }) {
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
