import { Badge } from '../Badge';import { cn } from '../_utils';import styles from './StatCard.module.css';
export function StatCard({label,value,delta,variant='default'}){return <article className={cn(styles.root,styles[variant])}><span>{label}</span><strong>{value}</strong><Badge tone={delta.startsWith('+')?'success':'warning'}>{delta}</Badge></article>;}
