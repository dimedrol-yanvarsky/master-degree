import { Link } from 'react-router-dom';
import { ROUTES } from '../../shared/routes';
import styles from './HomePage.module.css';

export default function HomePage() {
    return (
        <main className={styles.root}>
            <h1 className={styles.title}>project-fuzzy-psychology</h1>
            <p className={styles.subtitle}>React + FSD · черновик приложения</p>
            <Link to={ROUTES.uiKit} className={styles.cta}>
                Открыть UI-кит →
            </Link>
        </main>
    );
}
