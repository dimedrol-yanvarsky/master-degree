import { cn } from '../_utils';import styles from './ColorScale.module.css';
export function ColorScale({colors}){return <div className={styles.grid}>{colors.map(color=><div key={color.name} className={cn(styles.tile,color.dark&&styles.darkText)} style={{background:color.value}}>{color.name}</div>)}</div>;}
