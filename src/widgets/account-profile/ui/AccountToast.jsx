import { Toast } from '../../../shared/ui/kit';

export function AccountToast({ notification, styles }) {
    if (!notification) return null;

    return (
        <div
            className={styles.toastViewport}
            aria-live={notification.tone === 'danger' ? 'assertive' : 'polite'}
            aria-atomic="true">
            <div className={styles.toastItem} key={notification.id}>
                <Toast
                    tone={notification.tone}
                    title={notification.title}
                    description={notification.description}
                    variant={notification.variant || 'glass'}
                />
            </div>
        </div>
    );
}
