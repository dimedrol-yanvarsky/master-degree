import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '../_utils';
import { Field } from '../Field';
import styles from './Textarea.module.css';

export function Textarea({
    label,
    hint,
    error,
    meta,
    required = false,
    optional = false,
    id,
    className = '',
    variant = 'default',
    tone = 'neutral',
    resize = 'vertical',
    autoGrow = false,
    showCount = false,
    value,
    defaultValue = '',
    onChange,
    maxLength,
    ...props
}) {
    const generatedId = useId();
    const fieldId = id || generatedId;
    const textareaRef = useRef(null);
    const isControlled = value !== undefined;
    const [innerValue, setInnerValue] = useState(defaultValue ?? '');
    const currentValue = isControlled ? value : innerValue;
    const currentLength = String(currentValue ?? '').length;
    const counter = showCount ? `${currentLength}${maxLength ? `/${maxLength}` : ''}` : meta;

    useEffect(() => {
        if (!autoGrow || !textareaRef.current) return;
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }, [autoGrow, currentValue]);

    const handleChange = (event) => {
        if (!isControlled) setInnerValue(event.target.value);
        if (onChange) onChange(event);
    };

    const textarea = (
        <textarea
            id={fieldId}
            ref={textareaRef}
            className={cn(
                styles.textarea,
                styles[variant],
                styles[resize],
                tone !== 'neutral' && styles[tone],
                autoGrow && styles.autoGrow,
                className,
            )}
            aria-invalid={error ? 'true' : props['aria-invalid']}
            value={currentValue}
            onChange={handleChange}
            maxLength={maxLength}
            {...props}
        />
    );

    if (!label && !hint && !error && !counter) return textarea;

    return (
        <Field
            label={label}
            hint={hint}
            error={error}
            meta={counter}
            required={required}
            optional={optional}
            htmlFor={fieldId}>
            {textarea}
        </Field>
    );
}
