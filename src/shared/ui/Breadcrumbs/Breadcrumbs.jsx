import { useState } from 'react';
import { KitIcon } from '../Icon';
import { cn } from '../_utils';
import styles from './Breadcrumbs.module.css';

const DEFAULT_ITEMS = [
    { label: 'Проекты' },
    { label: 'UI-кит' },
    { label: 'Компоненты', current: true },
];

export function Breadcrumbs({ items = DEFAULT_ITEMS, variant = 'slash' }) {
    const [active, setActive] = useState(items.find((item) => item.current)?.label || items.at(-1)?.label);

    return (
        <nav className={cn(styles.root, styles[variant])} aria-label="Хлебные крошки">
            <ol>
                {items.map((item, index) => {
                    const isCurrent = item.current || active === item.label;

                    return (
                        <li key={item.label} className={styles.item}>
                            {index > 0 && <span className={styles.separator}>{variant === 'slash' ? '/' : <KitIcon name="chevron" size={13} />}</span>}
                            {isCurrent ? (
                                <span className={styles.current} aria-current="page">{item.label}</span>
                            ) : (
                                <button type="button" onClick={() => setActive(item.label)}>
                                    {variant === 'steps' && <span>{index + 1}</span>}
                                    {item.label}
                                </button>
                            )}
                        </li>
                    );
                })}
            </ol>
            {variant === 'path' && (
                <button type="button" className={styles.action}>
                    <KitIcon name="copy" size={13} />
                    Скопировать путь
                </button>
            )}
        </nav>
    );
}
