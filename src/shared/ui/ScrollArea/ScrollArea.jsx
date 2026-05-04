import { cn } from '../_utils';
import styles from './ScrollArea.module.css';

const DEFAULT_ITEMS = [
    { title: 'Утренний чек-ин', meta: 'Самочувствие, фокус и короткая заметка' },
    { title: 'План рекомендаций', meta: 'Три действия на день с мягким приоритетом' },
    { title: 'Динамика эмоций', meta: 'Сравнение состояния с прошлой неделей' },
    { title: 'Сессия наблюдений', meta: 'Новые маркеры тревожности и восстановления' },
    { title: 'Пауза на дыхание', meta: 'Короткая практика перед сложной задачей' },
    { title: 'Личный отчет', meta: 'Сводка прогресса и следующий безопасный шаг' },
    { title: 'Вечерняя запись', meta: 'Что помогло, что забрало ресурс, что повторить' },
];

function toCssSize(value) {
    if (typeof value === 'number') return `${value}px`;
    return value;
}

export function ScrollArea({
    children,
    items = DEFAULT_ITEMS,
    variant = 'default',
    height = 320,
    maxHeight,
    className,
    style,
    ariaLabel = 'Прокручиваемая область',
    role = 'region',
    tabIndex = 0,
    ...props
}) {
    const rootStyle = {
        ...style,
        ...(height !== undefined ? { '--scroll-area-height': toCssSize(height) } : {}),
        ...(maxHeight !== undefined ? { '--scroll-area-max-height': toCssSize(maxHeight) } : {}),
    };

    return (
        <section
            className={cn(styles.root, styles[variant], className)}
            style={rootStyle}
            aria-label={ariaLabel}
            role={role}
            tabIndex={tabIndex}
            {...props}>
            {children ?? (
                <div className={styles.list}>
                    {items.map((item) => (
                        <article className={styles.item} key={item.title}>
                            <strong>{item.title}</strong>
                            <span>{item.meta}</span>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}
