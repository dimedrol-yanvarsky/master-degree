import { useState } from 'react';
import { Badge } from '../Badge';
import { KitIcon } from '../Icon';
import { cn } from '../_utils';
import styles from './SidebarNav.module.css';

const DEFAULT_ITEMS = [
    { label: 'Обзор', icon: 'home', count: 4 },
    { label: 'Компоненты', icon: 'layers', count: 42, tone: 'accent' },
    { label: 'Токены', icon: 'settings' },
    { label: 'Изменения', icon: 'file', count: 8, tone: 'warning' },
];

export function SidebarNav({ items = DEFAULT_ITEMS, variant = 'default', title = 'Рабочая область' }) {
    const navItems = items?.length ? items : DEFAULT_ITEMS;
    const [active, setActive] = useState(navItems[0]?.label);

    return (
        <nav className={cn(styles.root, styles[variant])} aria-label="Разделы">
            {variant !== 'rail' && (
                <header>
                    <strong>{title}</strong>
                    <KitIcon name="settings" size={14} />
                </header>
            )}
            {navItems.map((item) => {
                const isActive = active === item.label;

                return (
                    <button
                        key={item.label}
                        type="button"
                        className={isActive ? styles.active : ''}
                        onClick={() => setActive(item.label)}>
                        <KitIcon name={item.icon || 'file'} size={15} />
                        <span>{item.label}</span>
                        {item.count !== undefined && <Badge tone={item.tone || 'neutral'}>{item.count}</Badge>}
                    </button>
                );
            })}
        </nav>
    );
}
