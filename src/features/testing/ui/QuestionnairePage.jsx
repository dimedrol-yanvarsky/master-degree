import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, KitIcon } from '../../../shared/ui/kit';
import { ROUTES } from '../../../shared/routes';
import { buildTestResult } from '../model/testResults';
import { pluralizeQuestions } from '../model/pluralize';
import { resolveScale } from '../model/scale';

function normalizeImportedAnswers(payload, questionCount, allowedValues) {
    const entries = [];

    if (Array.isArray(payload)) {
        payload.forEach((value, index) => entries.push([index, value, false]));
    } else if (Array.isArray(payload?.answers)) {
        payload.answers.forEach((item, index) => {
            if (item && typeof item === 'object') {
                const rawIndex = item.questionIndex ?? item.index ?? item.question ?? item.number ?? index;
                const isOneBased = item.questionIndex === undefined && Number(rawIndex) >= 1 && Number(rawIndex) <= questionCount;
                entries.push([rawIndex, item.value ?? item.answer, isOneBased]);
                return;
            }
            entries.push([index, item, false]);
        });
    } else if (payload && typeof payload === 'object') {
        const keys = Object.keys(payload);
        const looksOneBased = !keys.includes('0') && keys.some((key) => Number(key) === questionCount);
        keys.forEach((key) => entries.push([Number(key), payload[key], looksOneBased]));
    }

    const nextAnswers = {};
    entries.forEach(([rawIndex, rawValue, isOneBased]) => {
        const index = Number(rawIndex);
        const value = Number(rawValue);
        const normalizedIndex = isOneBased ? index - 1 : index;

        if (
            Number.isInteger(normalizedIndex)
            && normalizedIndex >= 0
            && normalizedIndex < questionCount
            && allowedValues.has(value)
        ) {
            nextAnswers[normalizedIndex] = value;
        }
    });

    return nextAnswers;
}

export function QuestionnairePage({ test, onComplete, styles }) {
    const [answers, setAnswers] = useState({});
    const [formError, setFormError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef(null);
    const scale = useMemo(() => resolveScale(test), [test]);
    const allowedValues = useMemo(() => new Set(scale.map((option) => Number(option.value))), [scale]);
    const answeredCount = Object.keys(answers).length;
    const progress = Math.round((answeredCount / test.questions.length) * 100);

    const handleAnswerChange = (questionIndex, value) => {
        setAnswers((currentAnswers) => ({
            ...currentAnswers,
            [questionIndex]: Number(value),
        }));
        setFormError('');
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleImportAnswers = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        try {
            const payload = JSON.parse(await file.text());
            const nextAnswers = normalizeImportedAnswers(payload, test.questions.length, allowedValues);

            if (Object.keys(nextAnswers).length !== test.questions.length) {
                setFormError(`В JSON должно быть ${test.questions.length} корректных ответов для этого теста.`);
                return;
            }

            setAnswers(nextAnswers);
            setFormError('');
        } catch {
            setFormError('Не удалось прочитать JSON с ответами.');
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (answeredCount !== test.questions.length) {
            setFormError('Ответьте на все вопросы, чтобы завершить тест.');
            return;
        }

        setIsSubmitting(true);
        setFormError('');
        try {
            await onComplete?.(test.id, answers, buildTestResult(test, answers));
        } catch (error) {
            setFormError(error.message || 'Не удалось сохранить результат теста. Проверьте авторизацию и попробуйте ещё раз.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <section className={styles.questionnaire}>
            <div className={styles.questionnaireHead}>
                <Link className={styles.backLink} to={ROUTES.testing}>
                    <KitIcon name="arrowLeft" size={16} />
                    Все тесты
                </Link>
                <div className={styles.headTop}>
                    <span className={styles.headMeta}>{test.questions.length} {pluralizeQuestions(test.questions.length)}</span>
                    <Button type="button" variant="secondary" size="sm" iconLeft={<KitIcon name="upload" />} onClick={handleImportClick}>
                        Загрузить ответы
                    </Button>
                    <input
                        ref={fileInputRef}
                        className={styles.answerUploadInput}
                        type="file"
                        accept="application/json,.json"
                        onChange={handleImportAnswers}
                    />
                </div>
                <h1>{test.title}</h1>
                <p>{test.description}</p>
                <div className={styles.progressDock}>
                    <div className={styles.progressInfo}>
                        <span className={styles.progressLabel}>Прогресс</span>
                        <strong className={styles.progressText}>{answeredCount} / {test.questions.length}</strong>
                    </div>
                    <div className={styles.progress} aria-label={`Отвечено ${answeredCount} из ${test.questions.length}`}>
                        <span style={{ width: `${progress}%` }} />
                    </div>
                    {test.scale && <span className={styles.scaleHint}>{test.scale}</span>}
                </div>
            </div>

            <form className={styles.questions} onSubmit={handleSubmit}>
                {test.questions.map((question, index) => {
                    const isAnswered = answers[index] !== undefined;

                    return (
                        <fieldset
                            className={[styles.questionCard, isAnswered ? styles.questionAnswered : ''].filter(Boolean).join(' ')}
                            key={`${test.id}-${index}`}>
                            <legend className={styles.questionLegend}>
                                <span className={styles.questionRow}>
                                    <span className={styles.questionNum} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                                    <span className={styles.questionText}>{question}</span>
                                </span>
                            </legend>
                            <div className={styles.scaleField}>
                                <div className={styles.scale}>
                                    {scale.map((option) => (
                                        <label className={styles.scaleOption} key={option.value} title={option.label}>
                                            <input
                                                className={styles.scaleInput}
                                                type="radio"
                                                name={`${test.id}-${index}`}
                                                value={option.value}
                                                checked={answers[index] === option.value}
                                                disabled={isSubmitting}
                                                onChange={() => handleAnswerChange(index, option.value)}
                                            />
                                            <span className={styles.scaleMark} aria-hidden="true">{option.value}</span>
                                            <span className={styles.scaleSr}>{option.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </fieldset>
                    );
                })}
                {formError && (
                    <p className={styles.formError} role="alert">
                        {formError}
                    </p>
                )}
                <div className={styles.submitRow}>
                    <Button type="submit" variant="gradient" gradient="radial" size="lg" loading={isSubmitting} iconRight={<KitIcon name="arrowRight" />}>
                        {isSubmitting ? 'Сохраняем результат' : 'Завершить тест'}
                    </Button>
                </div>
            </form>
        </section>
    );
}
