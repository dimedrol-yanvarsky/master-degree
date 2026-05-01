import styles from './StubPage.module.css';

export function StubPage({ group, label }) {
    return (
        <>
            <div className="kit-head">
                <div className="kit-eyebrow">{group.toUpperCase()}</div>
                <h1 className="kit-title">{label}</h1>
                <p className="kit-lede">
                    Компонент в работе. Содержимое появится здесь по мере реализации.
                </p>
            </div>
            <div className={styles.placeholder}>
                <div className={styles.placeholderLabel}>coming soon</div>
            </div>
        </>
    );
}
