import { Button } from '../Button';import { Input } from '../Input';import styles from './AuthCard.module.css';
export function AuthCard(){return <section className={styles.root}><div className={styles.mark}>K</div><h3>Sign in</h3><Input label="Email" placeholder="name@example.com"/><Input label="Password" type="password" placeholder="********"/><Button fullWidth>Continue</Button></section>;}
