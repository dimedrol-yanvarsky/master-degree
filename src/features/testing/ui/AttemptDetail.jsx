import { KitIcon } from '../../../shared/ui/kit';
import { formatResultDate } from '../model/testResults';
import { resolveScale } from '../model/scale';
import { AttemptResultSummary } from './AttemptResultSummary';

export function AttemptDetail({ test, result, onBack, styles }) {
    const scale = resolveScale(test);
    const answerByIndex = new Map((result?.answers || []).map((answer) => [answer.questionIndex, answer.value]));

    return (
        <div className={styles.attemptDetail}>
            <button type="button" className={styles.backLink} onClick={onBack}>
                <KitIcon name="arrowLeft" size={16} />
                К списку тестов
            </button>
            <h2>{test.title}</h2>
            <p className={styles.attemptDate}>Дата прохождения: {formatResultDate(result?.completedAt)}</p>
            <AttemptResultSummary test={test} result={result} styles={styles} />
            <ol className={styles.answerReview}>
                {test.questions.map((question, index) => {
                    const value = answerByIndex.get(index);
                    const optionLabel = scale.find((option) => option.value === value)?.label;

                    return (
                        <li className={styles.answerReviewItem} key={`${test.id}-${index}`}>
                            <span className={styles.answerReviewQuestion}>{String(index + 1).padStart(2, '0')}. {question}</span>
                            <span className={styles.answerReviewValue}>
                                {value != null ? `${value} — ${optionLabel}` : 'Нет ответа'}
                            </span>
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}
