import { cn } from '../_utils';
import styles from './Progress.module.css';

export function Progress({
    value = 0,
    variant = 'bar',
    label,
    showValue = false,
    tone = 'accent',
    size = 'md',
}) {
    const safeValue = Math.max(0, Math.min(100, value));

    return (
        <div className={styles.shell}>
            {(label || showValue) && (
                <div className={styles.meta}>
                    {label && <span>{label}</span>}
                    {showValue && <strong>{safeValue}%</strong>}
                </div>
            )}
            <div
                className={cn(styles.root, styles[variant], styles[tone], styles[size])}
                role="progressbar"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow={safeValue}>
                <div className={styles.fill} style={{ width: `${safeValue}%` }} />
            </div>
        </div>
    );
}
