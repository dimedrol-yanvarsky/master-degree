import { cn } from '../_utils';import styles from './Kbd.module.css';
export function Kbd({children,variant='default'}){return <kbd className={cn(styles.root,styles[variant])}>{children}</kbd>;}
