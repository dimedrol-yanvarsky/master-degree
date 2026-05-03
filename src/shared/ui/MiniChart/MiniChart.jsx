import styles from './MiniChart.module.css';

const DEFAULT_VALUES = [32, 48, 28, 72, 58, 86, 64, 92];

function buildPoints(values, width = 300, height = 132) {
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = Math.max(max - min, 1);

    return values.map((value, index) => (
        `${(10 + index / Math.max(values.length - 1, 1) * (width - 20)).toFixed(2)},${(height - 14 - (value - min) / range * (height - 30)).toFixed(2)}`
    )).join(' ');
}

function getPoint(value, index, values, width = 300, height = 132) {
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = Math.max(max - min, 1);

    return {
        x: 10 + index / Math.max(values.length - 1, 1) * (width - 20),
        y: height - 14 - (value - min) / range * (height - 30),
    };
}

export function MiniChart({
    values = DEFAULT_VALUES,
    variant = 'bars',
    title = 'Активность',
    subtitle,
    unit = '',
    target,
    segments,
}) {
    const chartValues = values?.length ? values : DEFAULT_VALUES;
    const max = Math.max(...chartValues);
    const total = chartValues.reduce((sum, value) => sum + value, 0);
    const last = chartValues[chartValues.length - 1];
    const points = buildPoints(chartValues);
    const safeTarget = target !== undefined ? Math.min(max, Math.max(0, target)) : null;
    const targetY = safeTarget !== null ? getPoint(safeTarget, 0, [0, max]).y : null;
    const change = chartValues.length > 1 ? last - chartValues[chartValues.length - 2] : 0;
    const trendTone = change >= 0 ? styles.positive : styles.negative;
    const percentValue = Math.round(max <= 100 ? last : last / max * 100);

    return (
        <div className={styles.root}>
            <div className={styles.header}>
                <div>
                    <div className={styles.title}>{title}</div>
                    {subtitle && <p>{subtitle}</p>}
                </div>
                <div className={styles.metric}>
                    <strong>{last}{unit}</strong>
                    <span className={trendTone}>{change >= 0 ? '+' : ''}{change}{unit}</span>
                </div>
            </div>

            {variant === 'area' && (
                <svg viewBox="0 0 300 132" className={styles.plot} role="img" aria-label={title}>
                    <g className={styles.grid}>
                        {[28, 66, 104].map((y) => <line key={y} x1="0" x2="300" y1={y} y2={y} />)}
                    </g>
                    {safeTarget !== null && <line className={styles.target} x1="8" x2="292" y1={targetY} y2={targetY} />}
                    <polygon points={`10,118 ${points} 290,118`} />
                    <polyline points={points} pathLength="1" />
                </svg>
            )}

            {variant === 'line' && (
                <svg viewBox="0 0 300 132" className={styles.plot} role="img" aria-label={title}>
                    <g className={styles.grid}>
                        {[28, 66, 104].map((y) => <line key={y} x1="0" x2="300" y1={y} y2={y} />)}
                    </g>
                    {safeTarget !== null && <line className={styles.target} x1="8" x2="292" y1={targetY} y2={targetY} />}
                    <polyline points={points} pathLength="1" />
                    {chartValues.map((value, index) => {
                        const point = getPoint(value, index, chartValues);
                        return <circle key={`${value}-${index}`} cx={point.x} cy={point.y} r="3.6" />;
                    })}
                </svg>
            )}

            {variant === 'donut' && (
                <div className={styles.donutWrap}>
                    <div className={styles.donutRing} style={{ '--chart-value': `${percentValue}%` }}>
                        <span>{percentValue}%</span>
                    </div>
                    <div className={styles.legend}>
                        <span><i /> Выполнено</span>
                        <span><i /> Осталось</span>
                    </div>
                </div>
            )}

            {variant === 'stacked' && (
                <div className={styles.stackedLayout}>
                    <div className={styles.stackBar}>
                        {(segments || chartValues.slice(0, 4).map((value, index) => ({ value, label: `S${index + 1}` }))).map((segment) => (
                            <span key={segment.label} style={{ width: `${segment.value / total * 100}%` }}>
                                {segment.label}
                            </span>
                        ))}
                    </div>
                    <div className={styles.segmentList}>
                        {(segments || chartValues.slice(0, 4).map((value, index) => ({ value, label: `S${index + 1}` }))).map((segment) => (
                            <span key={segment.label}>{segment.label}<strong>{segment.value}%</strong></span>
                        ))}
                    </div>
                </div>
            )}

            {variant === 'bars' && (
                <div className={styles.barPlot}>
                    {chartValues.map((value, index) => (
                        <span key={`${value}-${index}`} style={{ height: `${value / max * 100}%` }}>
                            <small>{value}{unit}</small>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
