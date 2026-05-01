import styles from './CodePanel.module.css';
export function CodePanel({code}){return <pre className={styles.root}><code>{code}</code></pre>;}
