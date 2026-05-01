import { cn } from '../_utils';import styles from './Skeleton.module.css';
export function Skeleton({type='line',animated=true,style}){return <span className={cn(styles.root,styles[type],animated&&styles.animated)} style={style} aria-hidden="true"/>;}
