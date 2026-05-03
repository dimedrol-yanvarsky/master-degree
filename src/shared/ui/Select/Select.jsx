import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { cn, useControllableValue } from '../_utils';
import { Field } from '../Field';
import { KitIcon } from '../Icon';
import styles from './Select.module.css';

function getNextEnabledIndex(options, startIndex, direction) {
    if (!options.length) return -1;
    for (let offset = 1; offset <= options.length; offset += 1) {
        const nextIndex = (startIndex + offset * direction + options.length) % options.length;
        if (!options[nextIndex]?.disabled) return nextIndex;
    }
    return -1;
}

const DEFAULT_OPTIONS = [
    { value: 'weekly', label: 'Еженедельно', description: 'Сводка каждый понедельник' },
    { value: 'daily', label: 'Ежедневно', description: 'Короткая лента важных событий' },
    { value: 'manual', label: 'Вручную', description: 'Только по запросу' },
    { value: 'paused', label: 'Пауза', description: 'Недоступный пример', disabled: true },
];

export function Select({
    label,
    hint,
    error,
    meta,
    options = DEFAULT_OPTIONS,
    value,
    defaultValue,
    onChange,
    placeholder = 'Выберите',
    id,
    variant = 'default',
    size = 'md',
    searchable = false,
    clearable = false,
    disabled = false,
}) {
    const generatedId = useId();
    const fieldId = id || generatedId;
    const listId = `${fieldId}-list`;
    const searchId = `${fieldId}-search`;
    const rootRef = useRef(null);
    const searchRef = useRef(null);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(-1);
    const [currentValue, setCurrentValue] = useControllableValue(value, defaultValue, onChange);

    const selectOptions = options;
    const visibleOptions = useMemo(() => {
        if (!searchable || !query.trim()) return selectOptions;
        const searchQuery = query.trim().toLowerCase();
        return selectOptions.filter((option) => {
            const haystack = `${option.label} ${option.description || ''}`.toLowerCase();
            return haystack.includes(searchQuery);
        });
    }, [selectOptions, query, searchable]);

    const selectedOption = selectOptions.find((option) => option.value === currentValue);

    useEffect(() => {
        const handlePointerDown = (event) => {
            if (!rootRef.current?.contains(event.target)) setOpen(false);
        };

        document.addEventListener('pointerdown', handlePointerDown);
        return () => document.removeEventListener('pointerdown', handlePointerDown);
    }, []);

    useEffect(() => {
        if (!open) {
            setQuery('');
            return;
        }

        const selectedIndex = visibleOptions.findIndex((option) => option.value === currentValue && !option.disabled);
        const fallbackIndex = visibleOptions.findIndex((option) => !option.disabled);
        setActiveIndex(selectedIndex >= 0 ? selectedIndex : fallbackIndex);
    }, [currentValue, open, visibleOptions]);

    useEffect(() => {
        if (open && searchable) {
            window.requestAnimationFrame(() => searchRef.current?.focus());
        }
    }, [open, searchable]);

    const chooseOption = (option) => {
        if (!option || option.disabled) return;
        setCurrentValue(option.value, option);
        setOpen(false);
    };

    const clearValue = () => {
        setCurrentValue(undefined, undefined);
        setOpen(false);
    };

    const moveActive = (direction) => {
        const nextIndex = getNextEnabledIndex(visibleOptions, activeIndex, direction);
        if (nextIndex >= 0) setActiveIndex(nextIndex);
    };

    const handleKeyDown = (event) => {
        if (disabled) return;

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (!open) setOpen(true);
            else moveActive(1);
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (!open) setOpen(true);
            else moveActive(-1);
        }

        if (event.key === 'Enter' || event.key === ' ') {
            if (!open) {
                event.preventDefault();
                setOpen(true);
                return;
            }

            if (activeIndex >= 0) {
                event.preventDefault();
                chooseOption(visibleOptions[activeIndex]);
            }
        }

        if (event.key === 'Escape') {
            setOpen(false);
        }
    };

    const select = (
        <div className={styles.wrap} ref={rootRef}>
            <div className={styles.control}>
                <button
                    id={fieldId}
                    type="button"
                    className={cn(
                        styles.trigger,
                        styles[variant],
                        styles[size],
                        open && styles.open,
                        selectedOption && styles.hasValue,
                        error && styles.invalid,
                    )}
                    aria-haspopup="listbox"
                    aria-controls={listId}
                    aria-expanded={open}
                    disabled={disabled}
                    onClick={() => setOpen((prev) => !prev)}
                    onKeyDown={handleKeyDown}>
                    <span className={cn(styles.value, !selectedOption && styles.placeholder)}>
                        <span>{selectedOption?.label || placeholder}</span>
                        {selectedOption?.description && (
                            <small>{selectedOption.description}</small>
                        )}
                    </span>
                    <KitIcon name="chevron" size={14} className={open ? styles.chevronOpen : ''} />
                </button>

                {clearable && selectedOption && !disabled && (
                    <button
                        type="button"
                        className={styles.clear}
                        aria-label="Очистить выбор"
                        onClick={clearValue}>
                        x
                    </button>
                )}
            </div>

            {open && (
                <div className={styles.popover}>
                    {searchable && (
                        <div className={styles.search}>
                            <KitIcon name="search" size={14} />
                            <input
                                id={searchId}
                                ref={searchRef}
                                value={query}
                                placeholder="Поиск вариантов"
                                onChange={(event) => setQuery(event.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                        </div>
                    )}

                    <div
                        id={listId}
                        className={styles.list}
                        role="listbox"
                        aria-labelledby={fieldId}>
                        {visibleOptions.map((option, index) => (
                            <button
                                key={option.value}
                                type="button"
                                role="option"
                                aria-selected={option.value === currentValue}
                                disabled={option.disabled}
                                className={cn(
                                    styles.item,
                                    option.value === currentValue && styles.active,
                                    index === activeIndex && styles.focused,
                                )}
                                onMouseEnter={() => setActiveIndex(index)}
                                onClick={() => chooseOption(option)}>
                                <span className={styles.itemText}>
                                    <span>{option.label}</span>
                                    {option.description && <small>{option.description}</small>}
                                </span>
                                {option.value === currentValue && <KitIcon name="check" size={14} />}
                            </button>
                        ))}

                        {!visibleOptions.length && (
                            <div className={styles.empty}>Ничего не найдено</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );

    if (!label && !hint && !error && !meta) return select;

    return (
        <Field
            label={label}
            hint={hint}
            error={error}
            meta={meta}
            htmlFor={fieldId}>
            {select}
        </Field>
    );
}
