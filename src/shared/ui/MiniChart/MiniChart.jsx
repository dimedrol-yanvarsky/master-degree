import { cn } from '../_utils';
import styles from './MiniChart.module.css';

function buildPoints(values, height = 100) {
    const max = Math.max(...values);
    return values.map((value, index) => (
        `${(index / Math.max(values.length - 1, 1) * 100).toFixed(2)},${(height - value / max * 84 - 8).toFixed(2)}`
    )).join(' ');
}

export function MiniChart({
    values,
    variant = 'bars',
    title = 'Activity',
    subtitle,
    unit = '',
    target,
    segments,
}) {
    const max = Math.max(...values);
    const total = values.reduce((sum, value) => sum + value, 0);
    const last = values[values.length - 1];
    const points = buildPoints(values);
    const safeTarget = target ? Math.min(100, Math.max(0, target)) : null;

    return (
        <div className={cn(styles.root, styles[variant])}>
            <div className={styles.header}>
                <div>
                    <div className={styles.title}>{title}</div>
                    {subtitle && <p>{subtitle}</p>}
                </div>
                <strong>{last}{unit}</strong>
            </div>

            {variant === 'area' && (
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={styles.plot}>
                    {safeTarget !== null && <line className={styles.target} x1="0" x2="100" y1={100 - safeTarget} y2={100 - safeTarget} />}
                    <polygon points={`0,100 ${points} 100,100`} />
                    <polyline points={points} />
                </svg>
            )}

            {variant === 'line' && (
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={styles.plot}>
                    {safeTarget !== null && <line className={styles.target} x1="0" x2="100" y1={100 - safeTarget} y2={100 - safeTarget} />}
                    <polyline points={points} />
                    {values.map((value, index) => (
                        <circle key={`${value}-${index}`} cx={index / Math.max(values.length - 1, 1) * 100} cy={100 - value / max * 84 - 8} r="1.8" />
                    ))}
                </svg>
            )}

            {variant === 'donut' && (
                <div className={styles.donut} style={{ '--chart-value': `${Math.round(last / max * 100)}%` }}>
                    <span>{Math.round(last / max * 100)}%</span>
                </div>
            )}

            {variant === 'stacked' && (
                <div className={styles.stackBar}>
                    {(segments || values.slice(0, 4).map((value, index) => ({ value, label: `S${index + 1}` }))).map((segment, index) => (
                        <span key={segment.label} style={{ width: `${segment.value / total * 100}%` }}>
                            {segment.label}
                        </span>
                    ))}
                </div>
            )}

            {variant === 'bars' && (
                <div className={styles.bars}>
                    {values.map((value, index) => (
                        <span key={`${value}-${index}`} style={{ height: `${value / max * 100}%` }}>
                            <small>{value}{unit}</small>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
