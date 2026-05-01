import { cn } from '../_utils';import styles from './Progress.module.css';
export function Progress({value=0,variant='bar'}){const safeValue=Math.max(0,Math.min(100,value));return <div className={cn(styles.root,styles[variant])} role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={safeValue}><div className={styles.fill} style={{width:safeValue+'%'}}/></div>;}
