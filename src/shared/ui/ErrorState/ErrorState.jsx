import { Button } from '../Button';import { KitIcon } from '../Icon';import styles from './ErrorState.module.css';
export function ErrorState(){return <section className={styles.root}><KitIcon name="warning" size={24}/><h3>Page unavailable</h3><p>Check the address or return to the project list.</p><Button variant="secondary">Home</Button></section>;}
