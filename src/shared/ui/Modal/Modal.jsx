import { useId } from 'react';
import { Badge } from '../Badge';
import { cn } from '../_utils';
import { KitIcon } from '../Icon';
import styles from './Modal.module.css';

export function Modal({
    title = 'Опубликовать изменения',
    children = 'Проверьте видимость, участников и список изменений перед публикацией.',
    footer,
    variant = 'default',
    eyebrow,
    aside,
}) {
    const titleId = useId();
    const isSplit = variant === 'split';

    return (
        <div className={cn(styles.stage, styles[`${variant}Stage`])}>
            <div className={styles.overlay}>
                <section className={cn(styles.box, styles[variant])} role="dialog" aria-modal="true" aria-labelledby={titleId}>
                    {isSplit && (
                        <aside className={styles.aside}>
                            <Badge tone="accent">Предпросмотр</Badge>
                            <strong>{aside || 'Изменения затронут 4 раздела'}</strong>
                            <span>Команда увидит обновления после публикации.</span>
                        </aside>
                    )}
                    <div className={styles.main}>
                        <div className={styles.head}>
                            <div>
                                {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
                                <h3 id={titleId}>{title}</h3>
                            </div>
                            <button type="button" aria-label="Закрыть"><KitIcon name="close" /></button>
                        </div>
                        <div className={styles.content}>{children}</div>
                        {footer && <div className={styles.actions}>{footer}</div>}
                    </div>
                </section>
            </div>
        </div>
    );
}
