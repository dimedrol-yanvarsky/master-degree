import styles from './SpacingScale.module.css';
export function SpacingScale(){return <div className={styles.root}>{[4,8,12,16,24,32,48,64].map(value=><div key={value}><span style={{width:value}}/><code>{value}px</code></div>)}</div>;}
