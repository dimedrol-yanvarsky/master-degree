import styles from './MiniMap.module.css';
export function MiniMap(){return <div className={styles.root} role="img" aria-label="Schematic map"><span className={styles.route}/><span className={styles.primaryPin}/><span className={styles.secondaryPin}/></div>;}
