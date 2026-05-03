import styles from './TypographyScale.module.css';

const WEIGHTS = [300, 400, 500, 600, 700, 800];
const SIZES = [
    { name: 'Подпись', size: 12, line: 1.35 },
    { name: 'Текст', size: 14, line: 1.55 },
    { name: 'Вводный', size: 18, line: 1.45 },
    { name: 'Заголовок', size: 24, line: 1.25 },
    { name: 'Экранный', size: 34, line: 1.08 },
];

export function TypographyScale() {
    return (
        <div className={styles.root}>
            <section className={styles.hero}>
                <span>Экранный / 34 / 800</span>
                <strong>Спокойный сильный заголовок</strong>
                <p>Крупный текст должен держать иерархию и не перегружать остальной интерфейс.</p>
            </section>

            <section className={styles.panel}>
                <h3>Насыщенность</h3>
                <div className={styles.weightGrid}>
                    {WEIGHTS.map((weight) => (
                        <div key={weight} style={{ fontWeight: weight }}>
                            <span>{weight}</span>
                            <strong>Сильный акцент</strong>
                        </div>
                    ))}
                </div>
            </section>

            <section className={styles.panel}>
                <h3>Шкала и интерлиньяж</h3>
                <div className={styles.scaleList}>
                    {SIZES.map((item) => (
                        <div key={item.name}>
                            <span>{item.name}</span>
                            <p style={{ fontSize: item.size, lineHeight: item.line }}>
                                Короткая интерфейсная заметка остается читаемой на {item.size}px.
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            <section className={styles.panel}>
                <h3>Параметры стиля</h3>
                <div className={styles.parameterGrid}>
                    <p><b>Жирный:</b> выбранные метки, итоги, активная навигация.</p>
                    <p><i>Курсив:</i> короткие аннотации, редакторские заметки, цитаты.</p>
                    <p className={styles.upper}>Верхний регистр: надзаголовки разделов</p>
                    <code>Моно: токены, клавиши, пути, числа</code>
                </div>
            </section>
        </div>
    );
}
