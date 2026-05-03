import { useId } from 'react';
import { cn, useControllableValue } from '../_utils';
import styles from './Tabs.module.css';

function getEnabledTabs(tabs) {
    return tabs.filter((tab) => !tab.disabled);
}

const DEFAULT_TABS = [
    {
        value: 'summary',
        label: 'Сводка',
        content: 'Краткий обзор с главным решением и следующим действием.',
    },
    {
        value: 'activity',
        label: 'Активность',
        badge: '12',
        content: 'Последние обновления и заметки ревью находятся здесь.',
    },
    {
        value: 'archive',
        label: 'Архив',
        disabled: true,
    },
];

export function Tabs({
    tabs = DEFAULT_TABS,
    value,
    defaultValue,
    onChange,
    ariaLabel = 'Вкладки',
    variant = 'underline',
    size = 'md',
    stretch = false,
    renderPanel,
}) {
    const baseId = useId();
    const [currentValue, setCurrentValue] = useControllableValue(value, defaultValue || tabs[0]?.value, onChange);
    const activeTab = tabs.find((tab) => tab.value === currentValue) || tabs[0];
    const shouldRenderPanel = renderPanel ?? tabs.some((tab) => tab.content);

    const activateTab = (tab) => {
        if (!tab || tab.disabled) return;
        setCurrentValue(tab.value);
    };

    const handleKeyDown = (event) => {
        const enabledTabs = getEnabledTabs(tabs);
        const currentIndex = enabledTabs.findIndex((tab) => tab.value === currentValue);

        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
            event.preventDefault();
            activateTab(enabledTabs[(currentIndex + 1 + enabledTabs.length) % enabledTabs.length]);
        }

        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
            event.preventDefault();
            activateTab(enabledTabs[(currentIndex - 1 + enabledTabs.length) % enabledTabs.length]);
        }

        if (event.key === 'Home') {
            event.preventDefault();
            activateTab(enabledTabs[0]);
        }

        if (event.key === 'End') {
            event.preventDefault();
            activateTab(enabledTabs[enabledTabs.length - 1]);
        }
    };

    return (
        <div className={cn(styles.shell, stretch && styles.stretch)}>
            <div
                className={cn(styles.root, styles[variant], styles[size])}
                role="tablist"
                aria-label={ariaLabel}
                onKeyDown={handleKeyDown}>
                {tabs.map((tab) => {
                    const active = currentValue === tab.value;
                    const tabId = `${baseId}-tab-${tab.value}`;
                    const panelId = `${baseId}-panel-${tab.value}`;

                    return (
                        <button
                            key={tab.value}
                            id={tabId}
                            type="button"
                            role="tab"
                            className={cn(active && styles.active, tab.disabled && styles.disabled)}
                            aria-selected={active}
                            aria-controls={shouldRenderPanel ? panelId : undefined}
                            tabIndex={active ? 0 : -1}
                            disabled={tab.disabled}
                            onClick={() => activateTab(tab)}>
                            {tab.icon && <span className={styles.icon}>{tab.icon}</span>}
                            <span className={styles.text}>
                                <span>{tab.label}</span>
                                {tab.description && <small>{tab.description}</small>}
                            </span>
                            {tab.badge && <span className={styles.badge}>{tab.badge}</span>}
                        </button>
                    );
                })}
            </div>

            {shouldRenderPanel && activeTab && (
                <div
                    id={`${baseId}-panel-${activeTab.value}`}
                    className={styles.panel}
                    role="tabpanel"
                    tabIndex={0}
                    aria-labelledby={`${baseId}-tab-${activeTab.value}`}>
                    {activeTab.content}
                </div>
            )}
        </div>
    );
}
