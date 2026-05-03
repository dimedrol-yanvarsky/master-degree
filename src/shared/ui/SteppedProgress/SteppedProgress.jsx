import { cn } from '../_utils';
import styles from './SteppedProgress.module.css';

const DEFAULT_STEPS = ['Данные', 'Проверка', 'Запуск'];

export function SteppedProgress({ steps = DEFAULT_STEPS, current = 0, variant = 'dots' }) {
    const maxIndex = steps.length - 1;
    const safeIndex = Math.max(0, Math.min(maxIndex, current));
    const ratio = maxIndex === 0 ? 0 : safeIndex / maxIndex;

    return (
        <div
            className={cn(styles.root, styles[variant])}
            style={{ '--step-progress': ratio }}>
            <div className={styles.track} />
            <div className={styles.fill} />
            <div className={styles.dots}>
                {steps.map((step, index) => (
                    <button
                        key={step}
                        type="button"
                        className={cn(
                            styles.dot,
                            index < safeIndex && styles.done,
                            index === safeIndex && styles.current,
                        )}
                        aria-label={step}
                    />
                ))}
            </div>
            <div className={styles.labels}>
                {steps.map((step) => (
                    <span key={step}>{step}</span>
                ))}
            </div>
        </div>
    );
}
