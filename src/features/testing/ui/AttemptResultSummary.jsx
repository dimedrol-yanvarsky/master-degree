export function AttemptResultSummary({ test, result, styles }) {
    if (result?.domains?.length > 0) {
        return (
            <div className={styles.attemptTraits}>
                {result.domains.map((domain) => (
                    <div className={styles.attemptTrait} key={domain.label}>
                        <span>{domain.label}</span>
                        <strong>{domain.score} из 5</strong>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className={styles.attemptLevel}>
            <div>
                <span>{test.id === 'bds' ? 'Суммарный балл' : 'Средний балл'}</span>
                <strong>{result?.scoreLabel || result?.score || 'Не рассчитан'}</strong>
            </div>
            <div>
                <span>Уровень состояния</span>
                <strong>{result?.level || 'Сохранён'}</strong>
            </div>
        </div>
    );
}
