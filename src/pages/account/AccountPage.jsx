import { useEffect, useState } from 'react';
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
}) {
    const [notification, setNotification] = useState(null);

    const notify = (nextNotification) => {
        setNotification({
            id: Date.now(),
            tone: 'success',
            title: 'Готово',
            description: '',
            ...nextNotification,
        });
    };

    useEffect(() => {
        if (!notification) return undefined;

        const timerId = window.setTimeout(() => {
            setNotification(null);
        }, 4200);

        return () => window.clearTimeout(timerId);
    }, [notification]);

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
