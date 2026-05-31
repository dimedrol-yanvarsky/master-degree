import { useState } from 'react';
import { Badge, Button, Input, KitIcon, Textarea } from '../../../shared/ui/kit';

export function ManualTestPanel({ onAddTest, styles }) {
    const [createdTitle, setCreatedTitle] = useState('');

    const handleSubmit = (event) => {
        event.preventDefault();

        const [titleField, codeField, questionsField] = event.currentTarget.elements;
        const questions = String(questionsField?.value || '')
            .split('\n')
            .map((question) => question.trim())
            .filter(Boolean);
        const test = onAddTest({
            title: String(titleField?.value || '').trim() || 'Новый тест',
            code: String(codeField?.value || '').trim(),
            questions: questions.length ? questions : ['Первый вопрос нового теста.'],
        });

        setCreatedTitle(test.title);
        event.currentTarget.reset();
    };

    return (
        <section className={styles.manualPanel}>
            <div className={styles.manualIntro}>
                <Badge tone="accent">Администратор или врач</Badge>
                <h2>Добавить тест вручную</h2>
                <p>
                    Заготовка для будущей панели: специалист сможет добавить название, инструкцию, шкалу ответов и список вопросов без изменения кода.
                </p>
            </div>
            <form className={styles.manualForm} onSubmit={handleSubmit}>
                <Input label="Название теста" placeholder="Например, шкала состояния после сессии" size="lg" />
                <Input label="Код" placeholder="Например, custom-01" size="lg" />
                <Textarea
                    label="Вопросы"
                    placeholder="Каждый вопрос с новой строки"
                    autoGrow
                    rows={4}
                    defaultValue={'Я понимаю свое текущее состояние.\nМне хватает поддержки в ближайшие дни.'}
                />
                <Button variant="secondary" size="lg" type="submit" iconRight={<KitIcon name="plus" />}>
                    Подготовить тест
                </Button>
                {createdTitle && <p className={styles.formNotice}>Тест «{createdTitle}» добавлен в список.</p>}
            </form>
        </section>
    );
}
