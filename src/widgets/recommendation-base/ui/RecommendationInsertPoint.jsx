import { useState } from 'react';
import { Button, Input, KitIcon, Textarea } from '../../../shared/ui/kit';
import styles from '../RecommendationBase.module.css';

const emptyDraft = {
    number: '',
    title: '',
    content: '',
};

export function RecommendationInsertPoint({
    sectionId,
    sectionParentId,
    nextSectionNumber,
    canAddSection = false,
    onAddSection,
    onAddBlock,
}) {
    const [mode, setMode] = useState('');
    const [draft, setDraft] = useState(emptyDraft);
    const canCreateSection = Boolean(onAddSection) && (canAddSection || Boolean(nextSectionNumber) || Boolean(sectionParentId));
    const canCreateBlock = Boolean(sectionId) && Boolean(onAddBlock);

    const updateDraft = (field, value) => {
        setDraft((current) => ({ ...current, [field]: value }));
    };

    const reset = () => {
        setMode('');
        setDraft(emptyDraft);
    };

    const startSection = () => {
        setDraft({ ...emptyDraft, number: nextSectionNumber || '' });
        setMode('section');
    };

    const startBlock = () => {
        setDraft(emptyDraft);
        setMode('block');
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        const title = draft.title.trim();
        const content = draft.content.trim();

        if (mode === 'section') {
            if (!title) return;
            onAddSection?.(sectionParentId || sectionId || 'root', {
                number: draft.number.trim(),
                title,
                description: '',
            });
            reset();
            return;
        }

        if (!sectionId || !title || !content) return;
        onAddBlock?.(sectionId, { title, summary: '', content, tags: '' });
        reset();
    };

    return (
        <div className={styles.insertPoint}>
            <div className={styles.insertLine} aria-hidden="true">
                <span>
                    <KitIcon name="plus" size={16} />
                </span>
            </div>

            {!mode && (
                <div className={styles.insertMenu}>
                    {canCreateSection && (
                        <button type="button" onClick={startSection}>
                            Добавить раздел
                        </button>
                    )}
                    {canCreateBlock && (
                        <button type="button" onClick={startBlock}>
                            Добавить рекомендацию
                        </button>
                    )}
                </div>
            )}

            {mode && (
                <form className={styles.insertForm} onSubmit={handleSubmit}>
                    {mode === 'section' ? (
                        <>
                            <Input
                                label="Номер"
                                hint="Измените номер, чтобы вставить раздел в нужную позицию."
                                value={draft.number}
                                onChange={(event) => updateDraft('number', event.target.value)}
                                required
                            />
                            <Input
                                label="Заголовок"
                                value={draft.title}
                                onChange={(event) => updateDraft('title', event.target.value)}
                                required
                            />
                        </>
                    ) : (
                        <>
                            <Input
                                label="Заголовок рекомендации"
                                value={draft.title}
                                onChange={(event) => updateDraft('title', event.target.value)}
                                required
                            />
                            <Textarea
                                label="Содержимое"
                                value={draft.content}
                                onChange={(event) => updateDraft('content', event.target.value)}
                                autoGrow
                                required
                            />
                        </>
                    )}
                    <div className={styles.insertActions}>
                        <Button type="submit" size="sm" variant="secondary" iconRight={<KitIcon name="check" />}>
                            Сохранить
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={reset}>
                            Отмена
                        </Button>
                    </div>
                </form>
            )}
        </div>
    );
}
