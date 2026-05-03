import { useState } from 'react';
import { Badge } from '../Badge';
import { KitIcon } from '../Icon';
import { cn } from '../_utils';
import styles from './Timeline.module.css';

const DEFAULT_ITEMS = [
    {
        title: 'Выделить API',
        description: 'Проверить пропсы, состояния и контракт доступности.',
        badge: 'Готово',
        tone: 'success',
        done: true,
        meta: '09:40',
    },
    {
        title: 'Собрать превью',
        description: 'Показать компонент в реальном сценарии использования.',
        badge: 'Активно',
        tone: 'accent',
        meta: '11:10',
    },
    {
        title: 'Подготовить документацию',
        description: 'Добавить примеры использования и граничные случаи.',
        badge: 'Далее',
        tone: 'warning',
        meta: '13:20',
    },
];

export function Timeline({ items = DEFAULT_ITEMS, variant = 'default' }) {
    const [activeIndex, setActiveIndex] = useState(0);

    return (
        <ol className={cn(styles.root, styles[variant])}>
            {items.map((item, index) => (
                <li
                    key={item.title}
                    className={cn(index === activeIndex && styles.active, item.done && styles.done)}>
                    <button type="button" className={styles.marker} onClick={() => setActiveIndex(index)}>
                        <KitIcon name={item.done ? 'check' : item.icon || 'clock'} size={13} />
                    </button>
                    <div className={styles.content}>
                        <div className={styles.titleRow}>
                            <strong>{item.title}</strong>
                            {item.meta && <span>{item.meta}</span>}
                        </div>
                        <p>{item.description}</p>
                        {item.badge && <Badge tone={item.tone || 'accent'}>{item.badge}</Badge>}
                    </div>
                </li>
            ))}
        </ol>
    );
}
