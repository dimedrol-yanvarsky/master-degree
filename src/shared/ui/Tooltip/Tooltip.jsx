import { cn } from '../_utils';import styles from './Tooltip.module.css';
export function Tooltip({content,children,side='top'}){return <span className={styles.host}>{children}<span className={cn(styles.box,styles[side])} role="tooltip">{content}</span></span>;}
