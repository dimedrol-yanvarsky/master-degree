import { cn } from '../_utils';import styles from './Timeline.module.css';
export function Timeline({items,variant='default'}){return <ol className={cn(styles.root,styles[variant])}>{items.map((item,index)=><li key={item.title} className={index===0?styles.active:''}><span/><div><strong>{item.title}</strong><p>{item.description}</p></div></li>)}</ol>;}
