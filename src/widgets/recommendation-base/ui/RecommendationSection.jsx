import { Button, KitIcon } from '../../../shared/ui/kit';
import { RecommendationInlineEditor } from '../../../features/recommendation-editor';
import styles from '../RecommendationBase.module.css';
import { RecommendationBlock } from './RecommendationBlock';

export function RecommendationSection({
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
