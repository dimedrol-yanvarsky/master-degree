import styles from './Field.module.css';
export function Field({label,hint,error,htmlFor,children}){return <div className={styles.root}>{label&&<label className={styles.label} htmlFor={htmlFor}>{label}</label>}{children}{error&&<div className={styles.error}>{error}</div>}{!error&&hint&&<div className={styles.hint}>{hint}</div>}</div>;}
