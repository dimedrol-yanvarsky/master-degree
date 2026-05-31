import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthAccess } from '../../features/auth';
import { AccountToast, ProfileAccount } from '../../widgets/account-profile';
import authLoginImage from './assets/auth-login.png';
import styles from './AccountPage.module.css';

const authImages = {
    login: authLoginImage,
};

if (typeof window !== 'undefined') {
    Object.values(authImages).forEach((src) => {
        const image = new Image();
        image.src = src;
    });
}

export default function AccountPage({
    mode = 'profile',
    user = null,
    status = null,
    testStatus = null,
    onAuthSuccess,
    onLogout,
    onUserUpdate,
    onAccountDelete,
    onPasswordChange,
    onYandexLinkStart,
    onYandexUnlink,
}) {
    const [notification, setNotification] = useState(null);
    const location = useLocation();
    const navigate = useNavigate();

    const notify = useCallback((nextNotification) => {
        setNotification({
            id: Date.now(),
            tone: 'success',
            title: 'Готово',
            description: '',
            ...nextNotification,
        });
    }, []);

    useEffect(() => {
        if (!notification) return undefined;

        const timerId = window.setTimeout(() => {
            setNotification(null);
        }, 4200);

        return () => window.clearTimeout(timerId);
    }, [notification]);

    useEffect(() => {
        if (mode !== 'profile' || !location.search) return;

        const params = new URLSearchParams(location.search);
        const linkStatus = params.get('oauth_link');
        const linkError = params.get('oauth_link_error');
        if (!linkStatus && !linkError) return;

        if (linkStatus === 'success') {
            notify({
                tone: 'success',
                title: 'Yandex привязан',
                description: 'Внешний вход сохранён для текущей учётной записи.',
            });
        } else if (linkError === 'email') {
            notify({
                tone: 'danger',
                title: 'Не удалось привязать Yandex',
                description: 'Почта Yandex должна совпадать с почтой текущего профиля.',
            });
        } else {
            notify({
                tone: 'danger',
                title: 'Не удалось привязать Yandex',
                description: 'OAuth-провайдер не завершил привязку. Попробуйте ещё раз.',
            });
        }

        navigate(location.pathname, { replace: true });
    }, [location.pathname, location.search, mode, navigate, notify]);

    if (mode === 'profile') {
        return (
            <>
                <AccountToast notification={notification} styles={styles} />
                <ProfileAccount
                    user={user}
                    status={status}
                    testStatus={testStatus}
                    onLogout={onLogout}
                    onUserUpdate={onUserUpdate}
                    onAccountDelete={onAccountDelete}
                    onPasswordChange={onPasswordChange}
                    onYandexLinkStart={onYandexLinkStart}
                    onYandexUnlink={onYandexUnlink}
                    notify={notify}
                    styles={styles}
                />
            </>
        );
    }

    return (
        <>
            <AccountToast notification={notification} styles={styles} />
            <AuthAccess mode={mode} onAuthSuccess={onAuthSuccess} notify={notify} styles={styles} authImages={authImages} />
        </>
    );
}
