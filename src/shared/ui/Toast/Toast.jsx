import { cn } from '../_utils';import { KitIcon } from '../Icon';import styles from './Toast.module.css';
export function Toast({tone='success',title,description,variant='default'}){return <div className={cn(styles.root,styles[tone],styles[variant])} role="status"><KitIcon name={tone==='danger'?'warning':'check'}/><div><strong>{title}</strong><span>{description}</span></div></div>;}
