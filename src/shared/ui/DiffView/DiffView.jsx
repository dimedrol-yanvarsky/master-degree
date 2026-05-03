import { Badge } from '../Badge';
import styles from './DiffView.module.css';

const rows = [
    [' ', 12, '.card {'],
    ['-', 13, '  background: #fff;'],
    ['-', 14, '  border-radius: 12px;'],
    ['+', 13, '  background: var(--bg);'],
    ['+', 14, '  border-radius: var(--r-md);'],
    ['+', 15, '  box-shadow: var(--shadow-1);'],
    [' ', 16, '}'],
];

export function DiffView({ variant = 'unified' }) {
    const removed = rows.filter(([type]) => type !== '+');
    const added = rows.filter(([type]) => type !== '-');

    if (variant === 'split') {
        return (
            <section className={`${styles.root} ${styles.split}`}>
                <Header />
                <div className={styles.columns}>
                    <CodeColumn title="До" rows={removed} side="old" />
                    <CodeColumn title="После" rows={added} side="new" />
                </div>
            </section>
        );
    }

    return (
        <section className={styles.root}>
            <Header />
            <pre className={styles.code}>{rows.map(([type, line, text]) => <Line key={`${type}-${line}-${text}`} type={type} line={line} text={text} />)}</pre>
        </section>
    );
}

function Header() {
    return (
        <div className={styles.header}>
            <span>src/shared/ui/Card/Card.module.css</span>
            <div><Badge tone="success">+3</Badge><Badge tone="danger">-2</Badge></div>
        </div>
    );
}

function CodeColumn({ title, rows: columnRows, side }) {
    return (
        <div className={styles.column}>
            <strong>{title}</strong>
            <pre className={styles.code}>{columnRows.map(([type, line, text]) => <Line key={`${side}-${line}-${text}`} type={type} line={line} text={text} />)}</pre>
        </div>
    );
}

function Line({ type, line, text }) {
    return (
        <span className={type === '+' ? styles.add : type === '-' ? styles.remove : ''}>
            <b>{line}</b>
            <i>{type}</i>
            <code>{text}</code>
        </span>
    );
}
