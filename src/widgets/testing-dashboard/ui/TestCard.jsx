import { Button, KitIcon } from '../../../shared/ui/kit';
import { pluralizeDays } from '../../../features/testing';

export function TestCard({ test, onStart, isCompleted = false, isLocked = false, lockLabel = '', remainingDays = 0, styles }) {
    return (
        <article className={[styles.testCard, isCompleted ? styles.completedTestCard : ''].filter(Boolean).join(' ')}>
            <div className={styles.testTopline}>
                <h2>{test.title}</h2>
            </div>
            <p className={styles.testMeta}>{test.meta}</p>
            <p>{test.description}</p>
            {isLocked ? (
                <p className={styles.lockNote}>
                    <KitIcon name="lock" size={15} />
                    {lockLabel || `Будет доступен через ${remainingDays} ${pluralizeDays(remainingDays)}`}
                </p>
            ) : (
                <Button
                    className={styles.startButton}
                    variant={isCompleted ? 'secondary' : 'gradient'}
                    gradient="radial"
                    size="lg"
                    iconRight={<KitIcon name="arrowRight" />}
                    onClick={() => onStart(test)}>
                    {isCompleted ? 'Пройти снова' : 'Пройти'}
                </Button>
            )}
        </article>
    );
}
