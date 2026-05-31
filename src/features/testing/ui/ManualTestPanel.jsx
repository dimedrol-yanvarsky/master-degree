import { useMemo, useState } from 'react';
import { Badge, Button, Input, KitIcon, Textarea } from '../../../shared/ui/kit';

function testToDraft(test) {
    return {
        title: test?.title || '',
        code: test?.id || '',
        questions: Array.isArray(test?.questions) ? test.questions.join('\n') : '',
    };
}

export function ManualTestPanel({ tests = [], currentUserId = '', userRole = null, onAddTest, onUpdateTest, onDeleteTest, styles }) {
    const [createdTitle, setCreatedTitle] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [editingTestId, setEditingTestId] = useState('');
    const [editDraft, setEditDraft] = useState(testToDraft(null));
    const [updatingTestId, setUpdatingTestId] = useState('');
    const [manageError, setManageError] = useState('');
    const manageableTests = useMemo(() => {
        if (userRole === 'admin') return tests;
        return tests.filter((test) => test.authorId && test.authorId === currentUserId);
    }, [currentUserId, tests, userRole]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (isSubmitting) return;

        const [titleField, codeField, questionsField] = event.currentTarget.elements;
        const title = String(titleField?.value || '').trim();
        const questions = String(questionsField?.value || '')
            .split('\n')
            .map((question) => question.trim())
            .filter(Boolean);

        if (!title) {
            setSubmitError('Укажите название теста.');
            return;
        }
        if (questions.length === 0) {
            setSubmitError('Добавьте хотя бы один вопрос.');
            return;
        }

        setIsSubmitting(true);
        setSubmitError('');
        try {
            const test = await onAddTest({
                title,
                code: String(codeField?.value || '').trim(),
                questions,
            });
            if (!test) return;

            setCreatedTitle(test.title);
            event.currentTarget.reset();
        } catch (error) {
            setSubmitError(error.message || 'Не удалось сохранить тест в системе.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const startEdit = (test) => {
        setEditingTestId(test.id);
        setEditDraft(testToDraft(test));
        setManageError('');
    };

    const handleEditChange = (key) => (event) => {
        setEditDraft((draft) => ({ ...draft, [key]: event.target.value }));
    };

    const handleUpdate = async (event, test) => {
        event.preventDefault();
        if (updatingTestId) return;

        const title = editDraft.title.trim();
        const questions = editDraft.questions.split('\n').map((question) => question.trim()).filter(Boolean);
        if (!title || questions.length === 0) {
            setManageError('Для сохранения теста нужны название и хотя бы один вопрос.');
            return;
        }

        setUpdatingTestId(test.id);
        setManageError('');
        try {
            await onUpdateTest?.(test.id, {
                title,
                code: editDraft.code.trim(),
                questions,
            });
            setEditingTestId('');
            setCreatedTitle(title);
        } catch (error) {
            setManageError(error.message || 'Не удалось обновить тест.');
        } finally {
            setUpdatingTestId('');
        }
    };

    const handleDelete = async (test) => {
        if (updatingTestId) return;
        if (typeof window !== 'undefined' && !window.confirm(`Удалить тест «${test.title}»?`)) return;

        setUpdatingTestId(test.id);
        setManageError('');
        try {
            await onDeleteTest?.(test.id);
            if (editingTestId === test.id) setEditingTestId('');
        } catch (error) {
            setManageError(error.message || 'Не удалось удалить тест.');
        } finally {
            setUpdatingTestId('');
        }
    };

    return (
        <section className={styles.manualPanel}>
            <div className={styles.manualIntro}>
                <Badge tone="accent">Администратор или врач</Badge>
                <h2>Добавить тест вручную</h2>
                <p>
                    Специалист может добавить название, код и список вопросов. Новый тест сохраняется в базе и сразу появляется в общем списке.
                </p>
            </div>
            <form className={styles.manualForm} onSubmit={handleSubmit}>
                <Input label="Название теста" placeholder="Например, шкала состояния после сессии" size="lg" disabled={isSubmitting} />
                <Input label="Код" placeholder="Например, session-state" size="lg" disabled={isSubmitting} />
                <Textarea
                    label="Вопросы"
                    placeholder="Каждый вопрос с новой строки"
                    autoGrow
                    rows={4}
                    disabled={isSubmitting}
                    defaultValue={'Я понимаю свое текущее состояние.\nМне хватает поддержки в ближайшие дни.'}
                />
                <Button variant="secondary" size="lg" type="submit" iconRight={<KitIcon name="plus" />} disabled={isSubmitting}>
                    {isSubmitting ? 'Сохраняем...' : 'Добавить тест'}
                </Button>
                {submitError && <p className={styles.formError} role="alert">{submitError}</p>}
                {createdTitle && <p className={styles.formNotice}>Тест «{createdTitle}» добавлен в список.</p>}
            </form>
            <div className={styles.manualForm}>
                <div className={styles.manualIntro}>
                    <Badge tone="accent">Управление тестами</Badge>
                    <h2>Опубликованные тесты</h2>
                    <p>
                        Специалист может редактировать и удалять тесты, созданные со своего аккаунта. Администратор может удалить любой тест.
                    </p>
                </div>
                {manageError && <p className={styles.formError} role="alert">{manageError}</p>}
                {manageableTests.length === 0 ? (
                    <p className={styles.attemptEmpty}>Нет тестов, доступных для редактирования.</p>
                ) : (
                    <div className={styles.testingGrid}>
                        {manageableTests.map((test) => {
                            const isEditing = editingTestId === test.id;
                            const isBusy = updatingTestId === test.id;

                            return (
                                <article className={styles.testCard} key={test.id}>
                                    {isEditing ? (
                                        <form className={styles.manualForm} onSubmit={(event) => handleUpdate(event, test)}>
                                            <Input
                                                label="Название"
                                                value={editDraft.title}
                                                onChange={handleEditChange('title')}
                                                disabled={isBusy}
                                            />
                                            <Input
                                                label="Код"
                                                value={editDraft.code}
                                                onChange={handleEditChange('code')}
                                                disabled={isBusy}
                                            />
                                            <Textarea
                                                label="Вопросы"
                                                value={editDraft.questions}
                                                onChange={handleEditChange('questions')}
                                                rows={5}
                                                autoGrow
                                                disabled={isBusy}
                                            />
                                            <div className={styles.submitRow}>
                                                <Button type="submit" variant="secondary" iconRight={<KitIcon name="check" />} disabled={isBusy}>
                                                    {isBusy ? 'Сохраняем...' : 'Сохранить'}
                                                </Button>
                                                <Button type="button" variant="ghost" onClick={() => setEditingTestId('')} disabled={isBusy}>
                                                    Отмена
                                                </Button>
                                            </div>
                                        </form>
                                    ) : (
                                        <>
                                            <div className={styles.testTopline}>
                                                <h2>{test.title}</h2>
                                                <Badge tone={test.authorId ? 'success' : 'accent'}>{test.authorId ? 'Авторский' : 'Системный'}</Badge>
                                            </div>
                                            <p>{test.description || 'Описание теста не заполнено.'}</p>
                                            <span className={styles.testMeta}>{test.meta}</span>
                                            <div className={styles.submitRow}>
                                                <Button variant="secondary" iconRight={<KitIcon name="edit" />} onClick={() => startEdit(test)} disabled={isBusy}>
                                                    Редактировать
                                                </Button>
                                                <Button variant="destructive" iconRight={<KitIcon name="trash" />} onClick={() => handleDelete(test)} disabled={isBusy}>
                                                    {isBusy ? 'Удаляем...' : 'Удалить'}
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
}
