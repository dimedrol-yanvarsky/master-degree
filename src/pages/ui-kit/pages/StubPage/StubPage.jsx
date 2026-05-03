import styles from './StubPage.module.css';

const GROUP_LABELS = {
    Foundations: 'Основа',
    Forms: 'Формы',
    Content: 'Контент',
    Navigation: 'Навигация',
    Feedback: 'Обратная связь',
    Special: 'Особые',
    'Page Patterns': 'Паттерны страниц',
};

export function StubPage({ group, label }) {
    const groupLabel = GROUP_LABELS[group] || group;

    return (
        <>
            <div className="kit-head">
                <div className="kit-eyebrow">{groupLabel.toUpperCase()}</div>
                <h1 className="kit-title">{label}</h1>
                <p className="kit-lede">
                    Компонент в работе. Содержимое появится здесь по мере реализации.
                </p>
            </div>
            <div className={styles.placeholder}>
                <div className={styles.placeholderLabel}>скоро будет</div>
            </div>
        </>
    );
}
