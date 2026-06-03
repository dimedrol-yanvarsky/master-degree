import { useState } from 'react';
import { Button, Input, KitIcon, Textarea } from '../../../shared/ui/kit';
import styles from './RecommendationInlineEditor.module.css';

export function RecommendationInlineEditor({ kind, initialValue, onCancel, onSave }) {
    const isBlock = kind === 'block';
    const [validationError, setValidationError] = useState('');
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
        const title = draft.title.trim();
        const content = draft.content.trim();

        if (!isBlock && !title) {
            setValidationError('Укажите название раздела.');
            return;
        }
        if (isBlock && !content) {
            setValidationError('Укажите текст рекомендации.');
            return;
        }

        setValidationError('');
        onSave(isBlock
            ? { title, summary: '', content, tags: '' }
            : { title, description: '' });
    };

    return (
        <form className={styles.root} onSubmit={handleSubmit}>
            <Input
                label="Название"
                value={draft.title}
                onChange={(event) => {
                    updateDraft('title', event.target.value);
                    setValidationError('');
                }}
                error={!isBlock && validationError ? validationError : undefined}
                required={!isBlock}
                optional={isBlock}
            />
            {isBlock ? (
                <>
                    <Textarea
                        label="Текст рекомендации"
                        value={draft.content}
                        onChange={(event) => {
                            updateDraft('content', event.target.value);
                            setValidationError('');
                        }}
                        error={validationError || undefined}
                        autoGrow
                        required
                    />
                </>
            ) : null}
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
