import { Badge } from '../Badge';import { cn } from '../_utils';import styles from './Coachmark.module.css';
export function Coachmark({title,children,variant='callout'}){return <div className={cn(styles.root,styles[variant])}><span className={styles.target}/><div className={styles.card}><Badge tone="accent">Tip</Badge><h3>{title}</h3><p>{children}</p></div></div>;}
