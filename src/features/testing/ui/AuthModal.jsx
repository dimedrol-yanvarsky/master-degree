import { useNavigate } from 'react-router-dom';
import { Badge, Button, KitIcon } from '../../../shared/ui/kit';
import { ROUTES } from '../../../shared/routes';

export function AuthModal({ test, onClose, styles }) {
    const navigate = useNavigate();

    if (!test) return null;

    return (
        <div className={styles.modalLayer} role="presentation" onMouseDown={onClose}>
            <section
                className={styles.modal}
                role="dialog"
                aria-modal="true"
                aria-labelledby="auth-required-title"
                onMouseDown={(event) => event.stopPropagation()}>
                <button className={styles.closeButton} type="button" aria-label="Закрыть" onClick={onClose}>
                    <KitIcon name="close" />
                </button>
                <div className={styles.modalIcon} aria-hidden="true">
                    <KitIcon name="lock" size={24} />
                </div>
                <Badge tone="accent">Требуется вход</Badge>
                <h2 id="auth-required-title">Авторизуйтесь, чтобы пройти {test.code}</h2>
                <p>
                    Мы сохраним результат в личном кабинете и сможем показать динамику после повторного прохождения.
                </p>
                <div className={styles.modalActions}>
                    <Button variant="gradient" gradient="radial" size="lg" iconRight={<KitIcon name="arrowRight" />} onClick={() => navigate(ROUTES.login)}>
                        Войти
                    </Button>
                    <Button variant="secondary" size="lg" onClick={() => navigate(ROUTES.register)}>
                        Зарегистрироваться
                    </Button>
                </div>
            </section>
        </div>
    );
}
