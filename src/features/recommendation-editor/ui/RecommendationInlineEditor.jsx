import { useState } from 'react';
import { Button, Input, KitIcon, Textarea } from '../../../shared/ui/kit';
import styles from './RecommendationInlineEditor.module.css';

export function RecommendationInlineEditor({ kind, initialValue, onCancel, onSave }) {
    const isBlock = kind === 'block';
    const [draft, setDraft] = useState({
        title: initialValue.title || '',
        description: initialValue.description || '',
        summary: initialValue.summary || '',
        content: initialValue.content || '',
        tags: Array.isArray(initialValue.tags) ? initialValue.tags.join(', ') : '',
    });

    const updateDraft = (field, value) => {
        setDraft((current) => ({ ...current, [field]: value }));
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        if (!draft.title.trim()) return;
        onSave(draft);
    };

    return (
        <form className={styles.root} onSubmit={handleSubmit}>
            <Input
                label="Название"
                value={draft.title}
                onChange={(event) => updateDraft('title', event.target.value)}
                required
            />
            {isBlock ? (
                <>
                    <Input
                        label="Краткое описание"
                        value={draft.summary}
                        onChange={(event) => updateDraft('summary', event.target.value)}
                    />
                    <Textarea
                        label="Текст рекомендации"
                        value={draft.content}
                        onChange={(event) => updateDraft('content', event.target.value)}
                        autoGrow
                        required
                    />
                    <Input
                        label="Теги"
                        value={draft.tags}
                        onChange={(event) => updateDraft('tags', event.target.value)}
                    />
                </>
            ) : (
                <Textarea
                    label="Описание"
                    value={draft.description}
                    onChange={(event) => updateDraft('description', event.target.value)}
                    autoGrow
                />
            )}
            <div className={styles.actions}>
                <Button type="submit" variant="gradient" gradient="radial" iconRight={<KitIcon name="check" />}>
                    Сохранить
                </Button>
                <Button type="button" variant="secondary" onClick={onCancel}>
                    Отменить
                </Button>
            </div>
        </form>
    );
}
