import { Badge, Button, KitIcon } from '../../../shared/ui/kit';
import { formatResultDate } from '../model/testResults';
import { AttemptResultSummary } from './AttemptResultSummary';

export function CompletedAttemptCard({ test, result, onView, styles }) {
    return (
        <article className={styles.attemptCard}>
            <div className={styles.attemptHead}>
                <div>
                    <span className={styles.attemptCode}>{test.code}</span>
                    <h3>{test.title}</h3>
                </div>
                <Badge tone="success">Пройден</Badge>
            </div>
            <p className={styles.attemptDate}>Дата прохождения: {formatResultDate(result?.completedAt)}</p>
            <AttemptResultSummary test={test} result={result} styles={styles} />
            <Button
                className={styles.attemptViewButton}
                variant="secondary"
                size="sm"
                iconRight={<KitIcon name="arrowRight" />}
                onClick={() => onView(test)}>
                Просмотреть результаты
            </Button>
        </article>
    );
}
