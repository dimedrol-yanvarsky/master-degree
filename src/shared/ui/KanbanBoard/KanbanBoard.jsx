import { useState } from 'react';
import { Badge } from '../Badge';
import { KitIcon } from '../Icon';
import styles from './KanbanBoard.module.css';

const DEFAULT_COLUMNS = [
    {
        title: 'Бэклог',
        cards: [
            { title: 'Собрать состояния', description: 'По умолчанию, наведение, фокус и отключение.', priority: 'P2', progress: '34%' },
            { title: 'Описать примеры', description: 'Примечания по использованию и сценарии.', priority: 'P3', progress: '18%' },
        ],
    },
    {
        title: 'В работе',
        tone: 'accent',
        cards: [
            { title: 'Упаковать API', description: 'Контракт компонента для прямого вызова.', priority: 'P1', progress: '68%', tone: 'accent' },
        ],
    },
    {
        title: 'Готово',
        tone: 'success',
        cards: [
            { title: 'Проверить токены', description: 'Переменные темы подключены.', priority: 'Готово', progress: '100%', tone: 'success' },
        ],
    },
];

export function KanbanBoard({ columns = DEFAULT_COLUMNS, variant = 'default' }) {
    const boardColumns = columns?.length ? columns : DEFAULT_COLUMNS;
    const [selected, setSelected] = useState(() => boardColumns[0]?.cards?.[0]?.title);

    return (
        <div className={[styles.root, styles[variant]].filter(Boolean).join(' ')}>
            {boardColumns.map((column) => (
                <section key={column.title}>
                    <header>
                        <h3>{column.title}</h3>
                        <Badge tone={column.tone || 'neutral'}>{column.cards.length}</Badge>
                    </header>
                    <div className={styles.cards}>
                        {column.cards.map((card) => {
                            const isSelected = selected === card.title;

                            return (
                                <button
                                    key={card.title}
                                    type="button"
                                    className={isSelected ? styles.selected : ''}
                                    onClick={() => setSelected(card.title)}>
                                    <span className={styles.cardTop}>
                                        <strong>{card.title}</strong>
                                        {card.priority && <Badge tone={card.tone || 'accent'}>{card.priority}</Badge>}
                                    </span>
                                    {card.description && <p>{card.description}</p>}
                                    <span className={styles.cardMeta}>
                                        <span><KitIcon name="clock" size={13} />{card.meta || '2 дня'}</span>
                                        <span>{card.progress || '42%'}</span>
                                    </span>
                                    <span className={styles.progress}>
                                        <i style={{ width: card.progress || '42%' }} />
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </section>
            ))}
        </div>
    );
}
