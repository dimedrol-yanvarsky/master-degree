import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, KitIcon } from '../../../shared/ui/kit';
import { ROUTES } from '../../../shared/routes';
import { buildTestResult } from '../model/testResults';
import { pluralizeQuestions } from '../model/pluralize';
import { resolveScale } from '../model/scale';

export function QuestionnairePage({ test, onComplete, styles }) {
    const [answers, setAnswers] = useState({});
    const [formError, setFormError] = useState('');
    const scale = useMemo(() => resolveScale(test), [test]);
    const answeredCount = Object.keys(answers).length;
    const progress = Math.round((answeredCount / test.questions.length) * 100);

    const handleAnswerChange = (questionIndex, value) => {
        setAnswers((currentAnswers) => ({
            ...currentAnswers,
            [questionIndex]: Number(value),
        }));
        setFormError('');
    };

    const handleSubmit = (event) => {
        event.preventDefault();

        if (answeredCount !== test.questions.length) {
            setFormError('Ответьте на все вопросы, чтобы завершить тест.');
            return;
        }

        onComplete?.(test.id, answers, buildTestResult(test, answers));
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
                    <Button type="submit" variant="gradient" gradient="radial" size="lg" iconRight={<KitIcon name="arrowRight" />}>
                        Завершить тест
                    </Button>
                </div>
            </form>
        </section>
    );
}
