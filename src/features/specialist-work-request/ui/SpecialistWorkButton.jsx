import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, KitIcon } from '../../../shared/ui/kit';
import { getSpecialistWorkRequestState } from '../model/permissions';
import styles from './SpecialistWorkButton.module.css';

function AuthPromptModal({ onClose, onLogin }) {
    return (
        <div className={styles.modalLayer} role="presentation" onMouseDown={onClose}>
            <section
                className={styles.modal}
                role="dialog"
                aria-modal="true"
                aria-labelledby="specialist-auth-title"
                onMouseDown={(event) => event.stopPropagation()}>
                <button className={styles.closeButton} type="button" aria-label="Закрыть" onClick={onClose}>
                    <KitIcon name="close" size={18} />
                </button>
                <div className={styles.modalIcon} aria-hidden="true">
                    <KitIcon name="user" size={24} />
                </div>
                <h2 id="specialist-auth-title">Начните работу со специалистом прямо сейчас! Авторизуйтесь:</h2>
                <div className={styles.modalActions}>
                    <Button variant="gradient" gradient="radial" iconRight={<KitIcon name="arrowRight" />} onClick={onLogin}>
                        Войти
                    </Button>
                    <Button variant="secondary" onClick={onClose}>
                        Позже
                    </Button>
                </div>
            </section>
        </div>
    );
}

export function SpecialistWorkButton({ isAuth = false, status = null }) {
    const navigate = useNavigate();
    const [isPromptOpen, setIsPromptOpen] = useState(false);
    const [isRequested, setIsRequested] = useState(false);
    const requestState = getSpecialistWorkRequestState({ isAuth, status });

    const handleClick = () => {
        if (requestState.requiresAuth) {
            setIsPromptOpen(true);
            return;
        }

        setIsRequested(true);
    };

    return (
        <>
            <Button
                variant={isRequested ? 'secondary' : 'gradient'}
                gradient="radial"
                iconRight={!isRequested ? <KitIcon name="arrowRight" size={15} /> : <KitIcon name="check" size={15} />}
                disabled={requestState.disabled || isRequested}
                onClick={handleClick}>
                {isRequested ? 'Запрос отправлен' : requestState.label}
            </Button>
            {isPromptOpen && (
                <AuthPromptModal
                    onClose={() => setIsPromptOpen(false)}
                    onLogin={() => navigate('/login')}
                />
            )}
        </>
    );
}
