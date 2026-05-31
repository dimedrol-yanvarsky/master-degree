import { Link } from 'react-router-dom';
import { Badge, KitIcon } from '../../../shared/ui/kit';
import { formatResultDate, pluralizeDays } from '../../../features/testing';
import { ROUTES } from '../../../shared/routes';

export function CompletedTestPage({ test, result, remainingDays = 0, styles }) {
    const answersCount = result?.answeredCount || result?.answers?.length || 0;

    return (
        <section className={styles.questionnaire}>
            <div className={styles.completedPanel}>
                <div className={styles.icon} aria-hidden="true">
                    <KitIcon name="check" size={26} />
                </div>
                <Badge tone="success">Тест пройден</Badge>
                <h1>{test.title}</h1>
                <p>{result?.summary || 'Результат сохранен для текущего пользователя.'}</p>
                <div className={styles.resultGrid}>
                    <article>
                        <span>Дата прохождения</span>
                        <strong>{formatResultDate(result?.completedAt)}</strong>
                    </article>
                    <article>
                        <span>{test.id === 'bds' ? 'Суммарный балл' : 'Средний балл'}</span>
                        <strong>{result?.scoreLabel || result?.score || 'Не рассчитан'}</strong>
                    </article>
                    <article>
                        <span>Интерпретация</span>
                        <strong>{result?.level || 'Результат сохранен'}</strong>
                    </article>
                    <article>
                        <span>Ответов сохранено</span>
                        <strong>{answersCount} из {test.questions.length}</strong>
                    </article>
                </div>
                {result?.answers?.length > 0 && (
                    <details className={styles.answersDetails}>
                        <summary>Показать выбранные ответы</summary>
                        <ol>
                            {result.answers.map((answer) => (
                                <li key={answer.questionIndex}>
                                    Вопрос {answer.questionIndex + 1}: вариант {answer.value}
                                </li>
                            ))}
                        </ol>
                    </details>
                )}
                {result?.domains?.length > 0 && (
                    <div className={styles.domainGrid}>
                        {result.domains.map((domain) => (
                            <article key={domain.label}>
                                <span>{domain.label}</span>
                                <strong>{domain.score} из 5</strong>
                            </article>
                        ))}
                    </div>
                )}
                {remainingDays > 0 && (
                    <p className={styles.lockNote}>
                        <KitIcon name="lock" size={15} />
                        Повторное прохождение будет доступно через {remainingDays} {pluralizeDays(remainingDays)}
                    </p>
                )}
                <p className={styles.resultNote}>
                    Результат не является диагнозом и нужен для самонаблюдения и обсуждения со специалистом.
                </p>
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
        </section>
    );
}
