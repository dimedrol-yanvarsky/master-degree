import { Link } from 'react-router-dom';
import styles from './HomePage.module.css';

export default function HomePage() {
    return (
        <main className={styles.root}>
            <h1 className={styles.title}>project-fuzzy-psychology</h1>
            <p className={styles.subtitle}>React + FSD · черновик приложения</p>
            <Link to="/ui-kit" className={styles.cta}>
                Открыть UI Kit →
            </Link>
        </main>
    );
}
