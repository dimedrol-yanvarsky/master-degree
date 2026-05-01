import styles from './Field.module.css';

export function Field({
    label,
    hint,
    error,
    htmlFor,
    children,
    meta,
    required = false,
    optional = false,
}) {
    const hasHeader = label || meta || required || optional;

    return (
        <div className={styles.root}>
            {hasHeader && (
                <div className={styles.header}>
                    {label && (
                        <label className={styles.label} htmlFor={htmlFor}>
                            {label}
                            {required && <span className={styles.required}>*</span>}
                        </label>
                    )}
                    {(meta || optional) && (
                        <span className={styles.meta}>
                            {meta || 'Optional'}
                        </span>
                    )}
                </div>
            )}
            {children}
            {error && <div className={styles.error}>{error}</div>}
            {!error && hint && <div className={styles.hint}>{hint}</div>}
        </div>
    );
}
