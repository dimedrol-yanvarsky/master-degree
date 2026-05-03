import { Badge } from '../Badge';
import { KitIcon } from '../Icon';
import { cn } from '../_utils';
import styles from './StatCard.module.css';

const toneIcon = {
    primary: 'trend',
    success: 'check',
    warning: 'warning',
    danger: 'warning',
};

export function StatCard({
    label = 'Активные пользователи',
    value = '12.4k',
    delta = '+18%',
    description = 'Вовлеченность выше недельного базового уровня.',
    variant = 'default',
    tone = 'primary',
    trend,
    meta,
}) {
    const badgeTone = tone === 'primary' ? 'accent' : tone;
    const icon = toneIcon[tone] || toneIcon.primary;

    return (
        <article className={cn(styles.root, styles[variant], styles[tone])}>
            <div className={styles.head}>
                <span>{label}</span>
                <span className={styles.icon} aria-hidden="true">
                    <KitIcon name={icon} size={15} />
                </span>
            </div>
            <strong>{value}</strong>
            {description && <p>{description}</p>}
            <div className={styles.footer}>
                {delta && <Badge tone={badgeTone}>{delta}</Badge>}
                {trend && <span className={styles.trend}>{trend}</span>}
                {meta && <span className={styles.meta}>{meta}</span>}
            </div>
        </article>
    );
}
