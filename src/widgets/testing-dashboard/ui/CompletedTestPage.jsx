import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, KitIcon } from '../../../shared/ui/kit';
import { formatDomainLabel, pluralizeDays, resolveScale } from '../../../features/testing';
import { ROUTES } from '../../../shared/routes';

function AnswerReviewModal({ test, result, styles, onClose }) {
    const scale = useMemo(() => resolveScale(test), [test]);
    const answerByIndex = useMemo(() => new Map(
        (result?.answers || []).map((answer) => [Number(answer.questionIndex), Number(answer.value)])
    ), [result?.answers]);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') onClose();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div className={styles.modalLayer} role="presentation" onMouseDown={onClose}>
            <section
                className={[styles.modal, styles.answerModal].join(' ')}
                role="dialog"
                aria-modal="true"
                aria-labelledby={`${test.id}-answers-title`}
                onMouseDown={(event) => event.stopPropagation()}>
                <button className={styles.closeButton} type="button" aria-label="Закрыть" onClick={onClose}>
                    <KitIcon name="close" />
                </button>
                <div className={styles.answerModalHead}>
                    <span className={styles.headMeta}>{test.code || test.title}</span>
                    <h2 id={`${test.id}-answers-title`}>Выбранные ответы</h2>
                </div>
                <div className={[styles.questions, styles.answerModalBody].join(' ')}>
                    {test.questions.map((question, index) => {
                        const value = answerByIndex.get(index);
                        const isAnswered = value !== undefined;

                        return (
                            <fieldset
                                className={[styles.questionCard, isAnswered ? styles.questionAnswered : ''].filter(Boolean).join(' ')}
                                key={`${test.id}-answer-${index}`}>
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
                                                    name={`${test.id}-answer-${index}`}
                                                    value={option.value}
                                                    checked={value === Number(option.value)}
                                                    onChange={() => {}}
                                                    tabIndex={-1}
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
                </div>
            </section>
        </div>
    );
}

function getScoreValue(test, result) {
    const scoreLabel = String(result?.scoreLabel || '').trim();
    if (scoreLabel) return scoreLabel;
    const score = result?.score;
    if (score === null || score === undefined || score === '') return '';
    if (test.id === 'bds') return `${score} из 64`;
    return String(score);
}

export function CompletedTestPage({ test, result, remainingDays = 0, styles }) {
    const [answersOpen, setAnswersOpen] = useState(false);
    const hasDomainScores = result?.domains?.length > 0;
    const scoreValue = getScoreValue(test, result);

    return (
        <section className={styles.questionnaire}>
            <div className={styles.completedPanel}>
                <h1>Результаты {test.title}</h1>
                <p>{result?.summary || 'Результат сохранен для текущего пользователя.'}</p>
                {!hasDomainScores && scoreValue && (
                    <div className={styles.scoreSummary}>
                        <span>Набранный балл</span>
                        <strong>{scoreValue}</strong>
                    </div>
                )}
                {result?.answers?.length > 0 && (
                    <Button
                        className={styles.answersButton}
                        type="button"
                        variant="secondary"
                        iconRight={<KitIcon name="eye" />}
                        onClick={() => setAnswersOpen(true)}>
                        Показать выбранные ответы
                    </Button>
                )}
                {hasDomainScores && (
                    <div className={styles.domainGrid}>
                        {result.domains.map((domain) => (
                            <article key={formatDomainLabel(domain.label)}>
                                <span>{formatDomainLabel(domain.label)}</span>
                                <strong>{domain.score} из 5</strong>
                            </article>
                        ))}
                    </div>
                )}
                {remainingDays > 0 && (
                    <p className={styles.lockNote}>
                        <KitIcon name="lock" size={15} />
                        Прохождение будет доступно через {remainingDays} {pluralizeDays(remainingDays)}
                    </p>
                )}
                <div className={styles.resultActions}>
                    <Link className={styles.backLink} to={ROUTES.testing}>
                        <KitIcon name="arrowLeft" size={16} />
                        Вернуться к тестам
                    </Link>
                    <Link className={styles.backLink} to={ROUTES.account}>
                        Открыть личный кабинет
                        <KitIcon name="arrowRight" size={16} />
                    </Link>
                </div>
            </div>
            {answersOpen && (
                <AnswerReviewModal
                    test={test}
                    result={result}
                    styles={styles}
                    onClose={() => setAnswersOpen(false)}
                />
            )}
        </section>
    );
}
