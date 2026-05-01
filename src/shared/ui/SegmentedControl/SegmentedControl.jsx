import { cn, useControllableValue } from '../_utils';
import styles from './SegmentedControl.module.css';

function getEnabledOptions(options) {
    return options.filter((option) => !option.disabled);
}

export function SegmentedControl({
    options,
    value,
    defaultValue,
    onChange,
    ariaLabel = 'Mode',
    variant = 'default',
    size = 'md',
    equal = false,
}) {
    const [currentValue, setCurrentValue] = useControllableValue(value, defaultValue || options[0]?.value, onChange);

    const activateOption = (option) => {
        if (!option || option.disabled) return;
        setCurrentValue(option.value);
    };

    const handleKeyDown = (event) => {
        const enabledOptions = getEnabledOptions(options);
        const currentIndex = enabledOptions.findIndex((option) => option.value === currentValue);

        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
            event.preventDefault();
            activateOption(enabledOptions[(currentIndex + 1 + enabledOptions.length) % enabledOptions.length]);
        }

        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
            event.preventDefault();
            activateOption(enabledOptions[(currentIndex - 1 + enabledOptions.length) % enabledOptions.length]);
        }
    };

    return (
        <div
            className={cn(styles.root, styles[variant], styles[size], equal && styles.equal)}
            role="radiogroup"
            aria-label={ariaLabel}
            onKeyDown={handleKeyDown}>
            {options.map((option) => {
                const active = currentValue === option.value;

                return (
                    <button
                        key={option.value}
                        type="button"
                        role="radio"
                        className={cn(active && styles.active, option.disabled && styles.disabled)}
                        aria-checked={active}
                        tabIndex={active ? 0 : -1}
                        disabled={option.disabled}
                        onClick={() => activateOption(option)}>
                        {option.icon && <span className={styles.icon}>{option.icon}</span>}
                        <span className={styles.text}>
                            <span>{option.label}</span>
                            {option.description && <small>{option.description}</small>}
                        </span>
                        {option.badge && <span className={styles.badge}>{option.badge}</span>}
                    </button>
                );
            })}
        </div>
    );
}
