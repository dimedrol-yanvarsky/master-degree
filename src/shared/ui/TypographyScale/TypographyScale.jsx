import styles from './TypographyScale.module.css';

const WEIGHTS = [300, 400, 500, 600, 700, 800];
const SIZES = [
    { name: 'Caption', size: 12, line: 1.35 },
    { name: 'Body', size: 14, line: 1.55 },
    { name: 'Lead', size: 18, line: 1.45 },
    { name: 'Title', size: 24, line: 1.25 },
    { name: 'Display', size: 34, line: 1.08 },
];

export function TypographyScale() {
    return (
        <div className={styles.root}>
            <section className={styles.hero}>
                <span>Display / 34 / 800</span>
                <strong>Strong calm headline</strong>
                <p>Large type should carry hierarchy without crushing the rest of the interface.</p>
            </section>

            <section className={styles.panel}>
                <h3>Weight</h3>
                <div className={styles.weightGrid}>
                    {WEIGHTS.map((weight) => (
                        <div key={weight} style={{ fontWeight: weight }}>
                            <span>{weight}</span>
                            <strong>Bold signal</strong>
                        </div>
                    ))}
                </div>
            </section>

            <section className={styles.panel}>
                <h3>Scale & line-height</h3>
                <div className={styles.scaleList}>
                    {SIZES.map((item) => (
                        <div key={item.name}>
                            <span>{item.name}</span>
                            <p style={{ fontSize: item.size, lineHeight: item.line }}>
                                The quick interface note stays readable at {item.size}px.
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            <section className={styles.panel}>
                <h3>Style parameters</h3>
                <div className={styles.parameterGrid}>
                    <p><b>Bold:</b> selected labels, totals, active navigation.</p>
                    <p><i>Italic:</i> short annotations, editorial notes, citations.</p>
                    <p className={styles.upper}>Uppercase: section eyebrows</p>
                    <code>Mono: tokens, keys, paths, numbers</code>
                </div>
            </section>
        </div>
    );
}
