import { useId } from 'react';
import { cn, useControllableValue } from '../_utils';
import { Field } from '../Field';
import styles from './Slider.module.css';

export function Slider({
    label,
    value,
    defaultValue = 50,
    onChange,
    min = 0,
    max = 100,
    step = 1,
    variant = 'default',
    suffix = '%',
    marks,
    showValue = true,
}) {
    const generatedId = useId();
    const [currentValue, setCurrentValue] = useControllableValue(value, defaultValue, onChange);
    const progress = ((currentValue - min) / (max - min)) * 100;

    return (
        <Field label={label} htmlFor={generatedId} meta={showValue ? `${currentValue}${suffix}` : undefined}>
            <div
                className={styles.root}
                data-variant={variant}
                style={{ '--slider-progress': `${progress}%` }}>
                <input
                    id={generatedId}
                    type="range"
                    className={cn(styles.range, styles[variant])}
                    min={min}
                    max={max}
                    step={step}
                    value={currentValue}
                    onChange={(event) => setCurrentValue(Number(event.target.value))}
                />
                <span className={styles.visualTrack} aria-hidden="true">
                    <span className={styles.visualFill} />
                </span>
                <span className={styles.thumbRail} aria-hidden="true">
                    <span className={styles.thumb} />
                </span>
                {marks && (
                    <div className={styles.markDots} aria-hidden="true">
                        {marks.map((mark) => (
                            <i key={mark.value} style={{ left: `${((mark.value - min) / (max - min)) * 100}%` }} />
                        ))}
                    </div>
                )}
                {marks && (
                    <div className={styles.marks}>
                        {marks.map((mark) => (
                            <span key={mark.value} style={{ left: `${((mark.value - min) / (max - min)) * 100}%` }}>
                                {mark.label}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </Field>
    );
}
