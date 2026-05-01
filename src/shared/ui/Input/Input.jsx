import { useId, useRef, useState } from 'react';
import { cn } from '../_utils';
import { Field } from '../Field';
import styles from './Input.module.css';

export function Input({
    label,
    hint,
    error,
    meta,
    required = false,
    optional = false,
    iconLeft,
    action,
    prefix,
    suffix,
    clearable = false,
    loading = false,
    id,
    className = '',
    variant = 'default',
    size = 'md',
    tone = 'neutral',
    value,
    defaultValue = '',
    onChange,
    onClear,
    type = 'text',
    ...props
}) {
    const generatedId = useId();
    const fieldId = id || generatedId;
    const inputRef = useRef(null);
    const isControlled = value !== undefined;
    const [innerValue, setInnerValue] = useState(defaultValue ?? '');
    const currentValue = isControlled ? value : innerValue;
    const hasValue = currentValue !== undefined && String(currentValue).length > 0;
    const hasRightAction = action || loading || (clearable && hasValue);
    const hasControlShell = iconLeft || action || prefix || suffix || clearable || loading;

    const handleChange = (event) => {
        if (!isControlled) setInnerValue(event.target.value);
        if (onChange) onChange(event);
    };

    const handleClear = () => {
        if (props.disabled) return;
        if (!isControlled) setInnerValue('');
        if (onClear) onClear();
        inputRef.current?.focus();
    };

    const valueProps = type === 'file' ? {} : { value: currentValue };

    const input = (
        <input
            id={fieldId}
            ref={inputRef}
            type={type}
            className={cn(
                styles.input,
                styles[variant],
                styles[size],
                tone !== 'neutral' && styles[tone],
                iconLeft && styles.withLeftIcon,
                prefix && styles.withPrefix,
                (suffix || hasRightAction) && styles.withRightAction,
                className,
            )}
            aria-invalid={error ? 'true' : props['aria-invalid']}
            onChange={handleChange}
            {...valueProps}
            {...props}
        />
    );

    const control = hasControlShell ? (
        <div className={cn(styles.control, props.disabled && styles.disabled)}>
            {iconLeft && <span className={styles.leftIcon}>{iconLeft}</span>}
            {prefix && <span className={styles.prefix}>{prefix}</span>}
            {input}
            {(suffix || hasRightAction) && (
                <span className={styles.rightAction}>
                    {suffix && <span className={styles.suffix}>{suffix}</span>}
                    {loading && <span className={styles.spinner} aria-hidden="true" />}
                    {clearable && hasValue && !loading && (
                        <button
                            type="button"
                            className={styles.clear}
                            aria-label="Clear input"
                            onClick={handleClear}>
                            x
                        </button>
                    )}
                    {action}
                </span>
            )}
        </div>
    ) : input;

    if (!label && !hint && !error && !meta) return control;

    return (
        <Field
            label={label}
            hint={hint}
            error={error}
            meta={meta}
            required={required}
            optional={optional}
            htmlFor={fieldId}>
            {control}
        </Field>
    );
}
