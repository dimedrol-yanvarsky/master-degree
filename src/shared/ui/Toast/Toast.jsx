import { Button } from '../Button';
import { cn } from '../_utils';
import { KitIcon } from '../Icon';
import styles from './Toast.module.css';

export function Toast({
    tone = 'success',
    title = 'Сохранено',
    description = 'Изменения применены.',
    variant = 'default',
    action,
    progress,
}) {
    const icon = tone === 'danger' ? 'warning' : tone === 'accent' ? 'spark' : 'check';

    return (
        <div className={cn(styles.root, styles[tone], styles[variant])} role="status">
            <span className={styles.icon}><KitIcon name={icon} /></span>
            <div className={styles.body}>
                <strong>{title}</strong>
                <span>{description}</span>
                {progress !== undefined && <i className={styles.progress} style={{ '--toast-progress': `${progress}%` }} />}
            </div>
            {action && <Button size="sm" variant="secondary">{action}</Button>}
        </div>
    );
}
