import { Badge } from '../Badge';
import styles from './MiniMap.module.css';

const labels = {
    route: ['Центр', 'Склад', 'Клиент'],
    heat: ['A1', 'B4', 'C2', 'D8'],
    fleet: ['Фургон 12', 'Курьер 03', 'Хаб'],
};

export function MiniMap({ variant = 'route' }) {
    return (
        <div className={[styles.root, styles[variant]].filter(Boolean).join(' ')} role="img" aria-label="Схематичная карта">
            <svg viewBox="0 0 680 320" className={styles.svg}>
                <path className={styles.minor} d="M42 86H628M42 160H628M42 236H628M132 28v260M272 28v260M420 28v260M550 28v260" />
                <path className={styles.routeLine} d="M82 230 C160 158 218 192 290 132 S456 62 596 118" />
                {variant !== 'route' && <path className={styles.altRoute} d="M78 92 C166 124 222 78 328 104 S510 222 610 202" />}
                {variant === 'heat' && (
                    <>
                        <circle className={styles.heatA} cx="210" cy="120" r="58" />
                        <circle className={styles.heatB} cx="462" cy="178" r="72" />
                        <circle className={styles.heatC} cx="548" cy="96" r="44" />
                    </>
                )}
            </svg>
            {labels[variant].map((label, index) => (
                <span key={label} className={styles.pin} data-index={index}>{label}</span>
            ))}
            <div className={styles.panel}>
                <strong>{variant === 'heat' ? 'Тепловая карта' : variant === 'fleet' ? 'Логистика' : 'Маршрут'}</strong>
                <span>{variant === 'route' ? '3 точки · 18 мин' : variant === 'heat' ? '4 зоны · 86 событий' : '2 транспорта · 1 хаб'}</span>
                <Badge tone={variant === 'heat' ? 'warning' : 'success'}>{variant === 'heat' ? 'Высокая нагрузка' : 'В норме'}</Badge>
            </div>
        </div>
    );
}
