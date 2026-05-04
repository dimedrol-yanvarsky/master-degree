import { useNavigate } from 'react-router-dom';
import { ErrorState } from '../../shared/ui/kit';
import styles from './NotFoundPage.module.css';

export default function NotFoundPage() {
    const navigate = useNavigate();

    return (
        <div className={styles.root}>
            <ErrorState
                title="Страница не найдена"
                description="Такого раздела пока нет. Проверьте адрес или вернитесь к дневнику эмоций."
                actionLabel="Вернуться к эмоциям"
                onAction={() => navigate('/')}
            />
        </div>
    );
}
