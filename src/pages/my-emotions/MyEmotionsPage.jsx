import { Badge, Button, KitIcon, StatCard } from '../../shared/ui/kit';
import styles from './MyEmotionsPage.module.css';

const emotionMarks = [
    { label: 'Спокойствие', value: '72%', tone: 'success' },
    { label: 'Тревожность', value: '18%', tone: 'warning' },
    { label: 'Усталость', value: '31%', tone: 'primary' },
];

export default function MyEmotionsPage() {
    return (
        <section className={styles.root}>
            <div className={styles.heading}>
                <div>
                    <Badge tone="accent">Рабочая область</Badge>
                    <h1>Мои эмоции</h1>
                    <p>
                        Здесь появится главный экран самонаблюдения: быстрый чек-ин,
                        динамика состояния и мягкие подсказки по дальнейшим действиям.
                    </p>
                </div>
                <Button size="lg" iconLeft={<KitIcon name="plus" size={18} />}>
                    Добавить запись
                </Button>
            </div>

            <div className={styles.stats}>
                <StatCard
                    label="Текущее состояние"
                    value="Ровное"
                    delta="Сегодня"
                    description="Последняя отметка показывает стабильный фон без резких перепадов."
                    tone="success"
                />
                <StatCard
                    label="Записей за неделю"
                    value="12"
                    delta="+4"
                    description="Регулярность растет, данных уже достаточно для первых рекомендаций."
                    tone="primary"
                />
                <StatCard
                    label="Фокус внимания"
                    value="Сон"
                    delta="Важно"
                    description="Сон чаще всего связан с изменением эмоционального фона."
                    tone="warning"
                />
            </div>

            <div className={styles.grid}>
                <article className={styles.panel}>
                    <div className={styles.panelHead}>
                        <span>Сегодня</span>
                        <KitIcon name="heart" size={18} />
                    </div>
                    <h2>Быстрый эмоциональный срез</h2>
                    <div className={styles.markList}>
                        {emotionMarks.map((mark) => (
                            <div key={mark.label} className={styles.mark}>
                                <span>{mark.label}</span>
                                <strong>{mark.value}</strong>
                                <i style={{ width: mark.value }} />
                            </div>
                        ))}
                    </div>
                </article>

                <article className={styles.panel}>
                    <div className={styles.panelHead}>
                        <span>Следующий шаг</span>
                        <KitIcon name="spark" size={18} />
                    </div>
                    <h2>Мягкая рекомендация</h2>
                    <p>
                        После первой полноценной записи приложение сможет предложить
                        персональный сценарий: дыхание, дневник мыслей или короткую паузу.
                    </p>
                    <Button variant="secondary" iconRight={<KitIcon name="arrowRight" size={16} />}>
                        Перейти к рекомендациям
                    </Button>
                </article>
            </div>
        </section>
    );
}
