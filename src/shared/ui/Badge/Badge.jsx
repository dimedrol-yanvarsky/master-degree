import { cn } from '../_utils';import styles from './Badge.module.css';
export function Badge({tone='neutral',appearance='soft',children='Метка',dot=false}){return <span className={cn(styles.root,styles[tone],styles[appearance])}>{dot&&<span className={styles.dot} aria-hidden="true"/>}{children}</span>;}
