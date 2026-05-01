import { cn } from '../_utils';import styles from './SidebarNav.module.css';
export function SidebarNav({items,variant='default'}){return <nav className={cn(styles.root,styles[variant])} aria-label="Sections">{items.map((item,index)=><a key={item} href={'#'+item} className={index===0?styles.active:''}>{item}</a>)}</nav>;}
