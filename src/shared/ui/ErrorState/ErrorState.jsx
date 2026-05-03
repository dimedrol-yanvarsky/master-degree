import { Button } from '../Button';
import { KitIcon } from '../Icon';
import styles from './ErrorState.module.css';

export function ErrorState({
    title = 'Страница недоступна',
    description = 'Проверьте адрес или вернитесь к списку проектов.',
    actionLabel = 'На главную',
    icon = 'warning',
    onAction,
}) {
    return (
        <section className={styles.root}>
            <KitIcon name={icon} size={24} />
            <h3>{title}</h3>
            <p>{description}</p>
            <Button variant="secondary" onClick={onAction}>{actionLabel}</Button>
        </section>
    );
}
