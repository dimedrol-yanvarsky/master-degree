import { useMemo, useState } from 'react';
import { Badge, Button, Input, KitIcon, Select, Textarea } from '../../../shared/ui/kit';
import styles from './RecommendationEditorPanel.module.css';

const ROOT_OPTION = {
    value: 'root',
    label: 'Раздел верхнего уровня',
    description: 'Создать новый раздел в корне базы',
};

const emptySectionDraft = {
    parentId: 'root',
    title: '',
    description: '',
};

const emptyBlockDraft = {
    sectionId: '',
    title: '',
    summary: '',
    content: '',
    tags: '',
};

export function RecommendationEditorPanel({ sectionOptions, onAddSection, onAddBlock }) {
    const sectionSelectOptions = useMemo(() => [ROOT_OPTION, ...sectionOptions], [sectionOptions]);
    const [sectionDraft, setSectionDraft] = useState(emptySectionDraft);
    const [blockDraft, setBlockDraft] = useState({
        ...emptyBlockDraft,
        sectionId: sectionOptions[0]?.value || '',
    });

    const updateSectionDraft = (field, value) => {
        setSectionDraft((current) => ({ ...current, [field]: value }));
    };

    const updateBlockDraft = (field, value) => {
        setBlockDraft((current) => ({ ...current, [field]: value }));
    };

    const handleSectionSubmit = (event) => {
        event.preventDefault();
        if (!sectionDraft.title.trim()) return;

        onAddSection(sectionDraft.parentId, sectionDraft);
        setSectionDraft(emptySectionDraft);
    };

    const handleBlockSubmit = (event) => {
        event.preventDefault();
        if (!blockDraft.sectionId || !blockDraft.title.trim()) return;

        onAddBlock(blockDraft.sectionId, blockDraft);
        setBlockDraft({
            ...emptyBlockDraft,
            sectionId: blockDraft.sectionId,
        });
    };

    return (
        <section className={styles.root}>
            <div className={styles.head}>
                <div>
                    <Badge tone="success">Редактирование</Badge>
                    <h2>Управление рекомендательной базой</h2>
                </div>
                <span>Доступно специалисту</span>
            </div>

            <div className={styles.forms}>
                <form className={styles.form} onSubmit={handleSectionSubmit}>
                    <div className={styles.formTitle}>
                        <KitIcon name="layers" size={18} />
                        <strong>Раздел или подраздел</strong>
                    </div>
                    <Select
                        label="Расположение"
                        options={sectionSelectOptions}
                        value={sectionDraft.parentId}
                        onChange={(value) => updateSectionDraft('parentId', value || 'root')}
                    />
                    <Input
                        label="Название"
                        placeholder="Например, восстановление сна"
                        value={sectionDraft.title}
                        onChange={(event) => updateSectionDraft('title', event.target.value)}
                        required
                    />
                    <Textarea
                        label="Описание"
                        placeholder="Коротко опишите назначение раздела"
                        value={sectionDraft.description}
                        onChange={(event) => updateSectionDraft('description', event.target.value)}
                        autoGrow
                    />
                    <Button type="submit" variant="gradient" gradient="radial" iconRight={<KitIcon name="plus" />}>
                        Добавить раздел
                    </Button>
                </form>

                <form className={styles.form} onSubmit={handleBlockSubmit}>
                    <div className={styles.formTitle}>
                        <KitIcon name="spark" size={18} />
                        <strong>Блок рекомендации</strong>
                    </div>
                    <Select
                        label="Раздел"
                        options={sectionOptions}
                        value={blockDraft.sectionId}
                        onChange={(value) => updateBlockDraft('sectionId', value || '')}
                        disabled={!sectionOptions.length}
                        placeholder="Выберите раздел"
                    />
                    <Input
                        label="Название"
                        placeholder="Например, вечерний ритуал"
                        value={blockDraft.title}
                        onChange={(event) => updateBlockDraft('title', event.target.value)}
                        required
                    />
                    <Input
                        label="Краткое описание"
                        placeholder="Когда и зачем использовать рекомендацию"
                        value={blockDraft.summary}
                        onChange={(event) => updateBlockDraft('summary', event.target.value)}
                    />
                    <Textarea
                        label="Текст рекомендации"
                        placeholder="Опишите конкретные действия"
                        value={blockDraft.content}
                        onChange={(event) => updateBlockDraft('content', event.target.value)}
                        autoGrow
                        required
                    />
                    <Input
                        label="Теги"
                        placeholder="сон, тревога, границы"
                        value={blockDraft.tags}
                        onChange={(event) => updateBlockDraft('tags', event.target.value)}
                    />
                    <Button
                        type="submit"
                        variant="gradient"
                        gradient="radial"
                        iconRight={<KitIcon name="plus" />}
                        disabled={!sectionOptions.length}>
                        Добавить блок
                    </Button>
                </form>
            </div>
        </section>
    );
}
