import { useId, useMemo } from 'react';
import { Toast } from '../../shared/ui/kit';
import styles from './EmotionStateGraph.module.css';

// Единая шкала уровней. Список расширяемый — число строк графика берётся из его длины,
// поэтому при добавлении новых уровней график просто становится выше с тем же шагом строки.
// Строка 0 = верх = минимальная необходимость (зелёная улыбка),
// последняя строка = низ = максимальная необходимость (красный грустный смайл).
const SUPPORT_LEVELS = [
    { label: 'Очень низкая', color: '#2f7d39', soft: '#d5e8d2', face: 'smile' },
    { label: 'Низкая', color: '#6f9a22', soft: '#edf4c9', face: 'smile' },
    { label: 'Средняя', color: '#f2a11a', soft: '#ffe8bd', face: 'neutral' },
    { label: 'Высокая', color: '#f36a1d', soft: '#ffd8be', face: 'sad' },
    { label: 'Очень высокая', color: '#e50f35', soft: '#ffc6cf', face: 'sad' },
];

const ROWS = SUPPORT_LEVELS.length;
const ROW_GAP = 116;
const CHART_TOP = 92;
const CHART_BOTTOM = CHART_TOP + (ROWS - 1) * ROW_GAP;
const SVG_HEIGHT = CHART_BOTTOM + 104;
const DATE_Y = CHART_BOTTOM + 48;
const WEEKDAY_Y = CHART_BOTTOM + 78;

// Фиксированный (нерастягиваемый) масштаб: ось рисуется в собственном SVG, график — в прокручиваемом.
const AXIS_WIDTH = 330;
const SMILEY_X = 58;
const SMILEY_SIZE = 64;
const LABEL_X = 116;

// Фиксированный шаг на колонку — при росте числа колонок график расширяется и прокручивается.
const COLUMN_GAP = 230;
const PLOT_PAD = 120;

function getY(row) {
    return CHART_TOP + row * ROW_GAP;
}

function getColumnX(index) {
    return PLOT_PAD + index * COLUMN_GAP;
}

function getGradientOffset(index, total) {
    return `${total > 1 ? (index / (total - 1)) * 100 : 0}%`;
}

function getSupportRow(point) {
    return Math.min(ROWS - 1, Math.max(0, point.activeRow));
}

function createSmoothPath(points) {
    if (points.length < 2) return '';

    const path = [`M ${points[0].x} ${points[0].y}`];

    for (let index = 0; index < points.length - 1; index += 1) {
        const current = points[index];
        const next = points[index + 1];
        const previous = points[index - 1] || current;
        const afterNext = points[index + 2] || next;
        const controlOneX = current.x + (next.x - previous.x) / 6;
        const controlOneY = current.y + (next.y - previous.y) / 6;
        const controlTwoX = next.x - (afterNext.x - current.x) / 6;
        const controlTwoY = next.y - (afterNext.y - current.y) / 6;

        path.push(`C ${controlOneX} ${controlOneY}, ${controlTwoX} ${controlTwoY}, ${next.x} ${next.y}`);
    }

    return path.join(' ');
}

function MoodGlyph({ level, cx, cy, size }) {
    const mouth = level.face === 'neutral'
        ? 'M15 29 H29'
        : level.face === 'sad'
            ? 'M14 31 C18 25 26 25 30 31'
            : 'M14 27 C18 33 26 33 30 27';

    return (
        <g transform={`translate(${cx - size / 2} ${cy - size / 2}) scale(${size / 44})`} aria-hidden="true">
            <circle cx="22" cy="22" r="21" fill={level.soft} />
            <circle cx="15.5" cy="17.5" r="2.7" fill={level.color} />
            <circle cx="28.5" cy="17.5" r="2.7" fill={level.color} />
            <path d={mouth} fill="none" stroke={level.color} strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" />
        </g>
    );
}

function PointTooltip({ score, truth, showScore = true }) {
    const boxY = showScore ? -70 : -58;
    const boxHeight = showScore ? 50 : 34;
    const truthY = showScore ? -30 : -37;

    return (
        <g className={styles.nodeTooltip}>
            <rect className={styles.nodeTooltipBox} x="-118" y={boxY} width="236" height={boxHeight} rx="12" />
            {showScore && <text x="0" y="-48">Набранный балл: {score}</text>}
            <text x="0" y={truthY}>Степень истинности: {truth}</text>
        </g>
    );
}

export function EmotionStateGraph({ points }) {
    const graphId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
    const plotWidth = PLOT_PAD * 2 + Math.max(0, points.length - 1) * COLUMN_GAP;
    const data = useMemo(() => points.map((point, index) => {
        const row = getSupportRow(point);
        const secondaryRow = Math.min(ROWS - 1, Math.max(0, point.secondaryRow ?? row));

        return {
            ...point,
            row,
            x: getColumnX(index),
            y: getY(row),
            color: SUPPORT_LEVELS[row]?.color || '#f2a11a',
            secondaryRow,
            secondaryY: getY(secondaryRow),
            secondaryColor: SUPPORT_LEVELS[secondaryRow]?.color || '#f2a11a',
            weekday: point.weekday || '',
        };
    }), [points]);
    const smoothPath = useMemo(() => createSmoothPath(data), [data]);
    const areaPath = useMemo(() => {
        if (data.length < 2) return '';
        return `${smoothPath} L ${data[data.length - 1].x} ${CHART_BOTTOM} L ${data[0].x} ${CHART_BOTTOM} Z`;
    }, [smoothPath, data]);
    const firstX = data[0]?.x ?? PLOT_PAD;
    const lastX = data[data.length - 1]?.x ?? plotWidth - PLOT_PAD;

    return (
        <section className={styles.root}>
            <div className={styles.chartArea}>
                <svg
                    className={styles.axis}
                    width={AXIS_WIDTH}
                    height={SVG_HEIGHT}
                    viewBox={`0 0 ${AXIS_WIDTH} ${SVG_HEIGHT}`}
                    role="img"
                    aria-label="Шкала степени необходимости в поддержке">
                    {SUPPORT_LEVELS.map((level, row) => (
                        <g key={level.label}>
                            <MoodGlyph level={level} cx={SMILEY_X} cy={getY(row)} size={SMILEY_SIZE} />
                            <text className={styles.scaleLabelMain} x={LABEL_X} y={getY(row) - 14}>{level.label}</text>
                            <text className={styles.scaleLabelSub} x={LABEL_X} y={getY(row) + 14}>необходимость</text>
                        </g>
                    ))}
                </svg>

                <div className={`${styles.scrollArea} custom-scrollbar`}>
                    <svg
                        className={styles.plot}
                        width={plotWidth}
                        height={SVG_HEIGHT}
                        viewBox={`0 0 ${plotWidth} ${SVG_HEIGHT}`}
                        role="img"
                        aria-label="Граф степени необходимости в поддержке по датам">
                        <defs>
                            <linearGradient id={`${graphId}-trend`} x1={firstX} y1="0" x2={lastX} y2="0" gradientUnits="userSpaceOnUse">
                                {data.map((point, index) => (
                                    <stop
                                        key={`trend-stop-${point.label}`}
                                        offset={getGradientOffset(index, data.length)}
                                        stopColor={point.color}
                                    />
                                ))}
                            </linearGradient>
                            <linearGradient id={`${graphId}-area-color`} x1={firstX} y1="0" x2={lastX} y2="0" gradientUnits="userSpaceOnUse">
                                {data.map((point, index) => (
                                    <stop
                                        key={`area-color-stop-${point.label}`}
                                        offset={getGradientOffset(index, data.length)}
                                        stopColor={point.color}
                                    />
                                ))}
                            </linearGradient>
                            <linearGradient id={`${graphId}-area-fade`} x1="0" y1={CHART_TOP} x2="0" y2={CHART_BOTTOM} gradientUnits="userSpaceOnUse">
                                <stop offset="0%" stopColor="#fff" stopOpacity="0.22" />
                                <stop offset="55%" stopColor="#fff" stopOpacity="0.08" />
                                <stop offset="100%" stopColor="#fff" stopOpacity="0" />
                            </linearGradient>
                            <mask id={`${graphId}-area-mask`} maskUnits="userSpaceOnUse" x="0" y={CHART_TOP} width={plotWidth} height={CHART_BOTTOM - CHART_TOP}>
                                <rect x="0" y={CHART_TOP} width={plotWidth} height={CHART_BOTTOM - CHART_TOP} fill={`url(#${graphId}-area-fade)`} />
                            </mask>
                        </defs>

                        {Array.from({ length: ROWS }).map((_, row) => {
                            const y = getY(row);

                            return (
                                <line
                                    key={`row-${row}`}
                                    className={styles.gridLine}
                                    x1={0}
                                    y1={y}
                                    x2={plotWidth}
                                    y2={y}
                                />
                            );
                        })}

                        {data.map((point) => (
                            <line
                                key={`column-${point.label}`}
                                className={styles.gridLine}
                                x1={point.x}
                                y1={CHART_TOP}
                                x2={point.x}
                                y2={CHART_BOTTOM}
                            />
                        ))}

                        {areaPath && (
                            <path
                                className={styles.areaFill}
                                d={areaPath}
                                fill={`url(#${graphId}-area-color)`}
                                mask={`url(#${graphId}-area-mask)`}
                            />
                        )}

                        <path className={styles.trendLine} d={smoothPath} stroke={`url(#${graphId}-trend)`} />

                        {data.map((point) => (
                            <g
                                key={`secondary-${point.label}`}
                                className={styles.secondaryPoint}
                                tabIndex={0}
                                role="img"
                                aria-label={`${point.label}: альтернативный терм — ${point.secondarySupportNeedLabel} необходимость, степень истинности ${point.secondaryTruth}`}>
                                <circle className={styles.secondaryRing} cx={point.x} cy={point.secondaryY} r="13" stroke={point.secondaryColor} />
                                <circle className={styles.secondaryDot} cx={point.x} cy={point.secondaryY} r="4" fill={point.secondaryColor} />
                                <g transform={`translate(${point.x} ${point.secondaryY})`}>
                                    <PointTooltip truth={point.secondaryTruth} showScore={false} />
                                </g>
                            </g>
                        ))}

                        {data.map((point) => (
                            <g
                                key={`point-${point.label}`}
                                className={styles.activePoint}
                                tabIndex={0}
                                role="img"
                                aria-label={`${point.label}: необходимость в поддержке ${point.supportNeedLabel}, балл ${point.score}, степень истинности ${point.truth}`}>
                                <circle className={styles.pointCircle} cx={point.x} cy={point.y} r="15" fill={point.color} />
                                <g transform={`translate(${point.x} ${point.y})`}>
                                    <PointTooltip score={point.score} truth={point.truth} />
                                </g>
                            </g>
                        ))}

                        {data.map((point) => (
                            <g key={`date-${point.label}`} className={styles.dateGroup}>
                                <text x={point.x} y={DATE_Y} className={styles.dateLabel}>{point.label}</text>
                                <text x={point.x} y={WEEKDAY_Y} className={styles.weekdayLabel}>{point.weekday}</text>
                            </g>
                        ))}
                    </svg>
                </div>
            </div>

            <Toast
                className={styles.note}
                tone="accent"
                icon="info"
                title="Как читать график"
                description="Чем ниже точка на графике, тем большая поддержка специалиста требуется в данный момент."
            />
        </section>
    );
}
