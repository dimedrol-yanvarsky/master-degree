import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, KitIcon, Textarea } from '../../../shared/ui/kit';
import { getAccountStatus, statusInfo } from '../../../entities/user';
import { ROUTES } from '../../../shared/routes';
import { getProfileFields } from '../model/profileFields';
import { validateProfileField } from '../model/profileValidation';
import { AdminAccountPanel } from './AdminAccountPanel';
import { ClientAccountPanel } from './ClientAccountPanel';
import { SpecialistAccountPanel } from './SpecialistAccountPanel';

export function ProfileAccount({
    user,
    status,
    testStatus,
    onLogout,
    onUserUpdate,
    onAccountDelete,
    onPasswordChange,
    onYandexLinkStart,
    onYandexUnlink,
    notify,
    styles,
}) {
    const navigate = useNavigate();
    const accountStatus = getAccountStatus(user, status);
    const isSpecialist = accountStatus === 'specialist';
    const [yandexLinked, setYandexLinked] = useState(Boolean(user?.yandexLinked || user?.authProvider === 'yandex'));
    const [editingField, setEditingField] = useState(null);
    const [draft, setDraft] = useState('');
    const [savingField, setSavingField] = useState(null);
    const [securityAction, setSecurityAction] = useState(null);
    const [passwordDraft, setPasswordDraft] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    const baseProfileFields = getProfileFields(user, isSpecialist);
    // «Статус» — роль учётной записи из БД (client/specialist/admin), показываем
    // подписью из statusInfo. Поле только для чтения: роль пользователь не меняет.
    const statusField = {
        key: 'accountStatus',
        label: 'Статус',
        value: statusInfo[accountStatus]?.label || statusInfo.client.label,
        icon: 'shield',
        readOnly: true,
    };
    const aboutIndex = baseProfileFields.findIndex((field) => field.key === 'about');
    const profileFields = aboutIndex === -1
        ? [...baseProfileFields, statusField]
        : [...baseProfileFields.slice(0, aboutIndex), statusField, ...baseProfileFields.slice(aboutIndex)];

    useEffect(() => {
        setYandexLinked(Boolean(user?.yandexLinked || user?.authProvider === 'yandex'));
    }, [user?.authProvider, user?.yandexLinked]);

    const handleLogout = () => {
        onLogout?.();
        navigate(ROUTES.login, { replace: true });
    };

    const startFieldEdit = (field) => {
        setEditingField(field.key);
        setDraft(String(field.value || ''));
    };

    const cancelFieldEdit = () => {
        if (savingField) return;
        setEditingField(null);
        setDraft('');
    };

    const handleFieldSave = async (field) => {
        const error = validateProfileField(field.key, field.label, draft);

        if (error) {
            notify?.({ tone: 'danger', title: 'Не удалось сохранить', description: error });
            return;
        }

        const normalizedDraft = String(draft || '').trim();
        const nextValue = field.key === 'email' ? normalizedDraft.toLowerCase() : normalizedDraft;
        setSavingField(field.key);
        try {
            await onUserUpdate?.({ [field.key]: nextValue });
            setEditingField(null);
            setDraft('');
            notify?.({ tone: 'success', title: 'Профиль обновлён', description: `Поле «${field.label}» сохранено.` });
        } catch (error) {
            notify?.({
                tone: 'danger',
                title: 'Не удалось сохранить',
                description: error.message || 'Сервер не сохранил изменения профиля.',
            });
        } finally {
            setSavingField(null);
        }
    };

    const handlePasswordChange = (key) => (event) => {
        setPasswordDraft((value) => ({
            ...value,
            [key]: event.target.value,
        }));
    };

    const handlePasswordSubmit = async (event) => {
        event.preventDefault();
        if (securityAction) return;

        const currentPassword = passwordDraft.currentPassword;
        const newPassword = passwordDraft.newPassword;
        const confirmPassword = passwordDraft.confirmPassword;

        if (!currentPassword || !newPassword || !confirmPassword) {
            notify?.({ tone: 'danger', title: 'Не удалось сохранить', description: 'Заполните текущий пароль, новый пароль и повтор.' });
            return;
        }
        if (newPassword.length < 8) {
            notify?.({ tone: 'danger', title: 'Не удалось сохранить', description: 'Новый пароль должен быть не короче 8 символов.' });
            return;
        }
        if (newPassword !== confirmPassword) {
            notify?.({ tone: 'danger', title: 'Не удалось сохранить', description: 'Новый пароль и повтор не совпадают.' });
            return;
        }

        setSecurityAction('password');
        try {
            await onPasswordChange?.({ currentPassword, newPassword });
            setPasswordDraft({ currentPassword: '', newPassword: '', confirmPassword: '' });
            notify?.({ tone: 'success', title: 'Пароль обновлён', description: 'Новый пароль сохранён на сервере.' });
        } catch (error) {
            notify?.({
                tone: 'danger',
                title: 'Не удалось сменить пароль',
                description: error.message || 'Сервер не сохранил новый пароль.',
            });
        } finally {
            setSecurityAction(null);
        }
    };

    const handleYandexToggle = async () => {
        if (securityAction) return;

        setSecurityAction('yandex');
        try {
            if (yandexLinked) {
                const nextUser = await onYandexUnlink?.();
                setYandexLinked(Boolean(nextUser?.yandexLinked));
                notify?.({ tone: 'success', title: 'Yandex отвязан', description: 'Внешний вход отключён для текущей учётной записи.' });
                return;
            }

            const redirectUrl = await onYandexLinkStart?.();
            if (!redirectUrl) {
                throw new Error('Сервер не вернул ссылку для привязки Yandex.');
            }
            window.location.assign(redirectUrl);
        } catch (error) {
            notify?.({
                tone: 'danger',
                title: yandexLinked ? 'Не удалось отвязать Yandex' : 'Не удалось привязать Yandex',
                description: error.message || 'Сервер не завершил действие с Yandex.',
            });
        } finally {
            setSecurityAction(null);
        }
    };

    const handleAccountDelete = async () => {
        if (securityAction) return;
        if (typeof window !== 'undefined' && !window.confirm('Удалить текущую учётную запись? Это действие нельзя отменить.')) {
            return;
        }

        setSecurityAction('delete');
        try {
            await onAccountDelete?.();
            navigate(ROUTES.register, { replace: true });
        } catch (error) {
            notify?.({
                tone: 'danger',
                title: 'Не удалось удалить аккаунт',
                description: error.message || 'Сервер не удалил текущую учётную запись.',
            });
        } finally {
            setSecurityAction(null);
        }
    };

    return (
        <section className={styles.accountRoot}>
            <div className={styles.accountDashboard}>
                <div className={styles.profileCard}>
                    <div className={styles.profileHeader}>
                        <div className={styles.profileHeading}>
                            <h1>Личный кабинет</h1>
                        </div>
                    </div>

                    <section className={styles.accountSection}>
                        <div className={styles.sectionHead}>
                            <div>
                                <h2>Профиль</h2>
                                <p>Данные из анкеты регистрации. Нажмите на карандаш рядом с полем, чтобы изменить его.</p>
                            </div>
                        </div>
                        <div className={styles.fieldGrid}>
                            {profileFields.map((field) => {
                                const isEditing = editingField === field.key;
                                const isSaving = savingField === field.key;

                                return (
                                    <article
                                        key={field.key}
                                        className={[styles.fieldRow, field.type === 'textarea' ? styles.fieldRowWide : ''].filter(Boolean).join(' ')}>
                                        <div className={styles.fieldBody}>
                                            <span className={styles.fieldLabelGroup}>
                                                <span className={styles.fieldIcon} aria-hidden="true">
                                                    <KitIcon name={field.icon} size={15} />
                                                </span>
                                                <span className={styles.fieldLabel}>{field.label}</span>
                                            </span>
                                            {isEditing ? (
                                                <form
                                                    className={styles.fieldEditForm}
                                                    onSubmit={(event) => { event.preventDefault(); handleFieldSave(field); }}>
                                                    {field.type === 'textarea' ? (
                                                        <Textarea
                                                            value={draft}
                                                            onChange={(event) => setDraft(event.target.value)}
                                                            placeholder={field.placeholder}
                                                            maxLength={320}
                                                            showCount
                                                            resize="vertical"
                                                            disabled={isSaving}
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <Input
                                                            type={field.type}
                                                            value={draft}
                                                            onChange={(event) => setDraft(event.target.value)}
                                                            placeholder={field.placeholder}
                                                            autoComplete={field.autoComplete}
                                                            disabled={isSaving}
                                                            autoFocus
                                                        />
                                                    )}
                                                    <div className={styles.fieldEditActions}>
                                                        <Button type="submit" size="sm" variant="gradient" gradient="radial" iconRight={<KitIcon name="check" />} disabled={isSaving}>
                                                            {isSaving ? 'Сохраняем...' : 'Сохранить'}
                                                        </Button>
                                                        <Button type="button" size="sm" variant="ghost" onClick={cancelFieldEdit} disabled={isSaving}>
                                                            Отмена
                                                        </Button>
                                                    </div>
                                                </form>
                                            ) : (
                                                <strong className={styles.fieldValue}>{field.value || 'Не указано'}</strong>
                                            )}
                                        </div>
                                        {!isEditing && !field.readOnly && (
                                            <button
                                                type="button"
                                                className={styles.fieldEditButton}
                                                aria-label={`Изменить поле «${field.label}»`}
                                                disabled={Boolean(savingField)}
                                                onClick={() => startFieldEdit(field)}>
                                                <KitIcon name="edit" size={15} />
                                            </button>
                                        )}
                                    </article>
                                );
                            })}
                        </div>
                    </section>

                    <section className={styles.accountSection}>
                        <div className={styles.sectionHead}>
                            <h2>Безопасность и доступ</h2>
                        </div>
                        <form className={styles.securityForm} onSubmit={handlePasswordSubmit}>
                            <Input
                                label="Текущий пароль"
                                type="password"
                                placeholder="Введите текущий пароль"
                                autoComplete="current-password"
                                value={passwordDraft.currentPassword}
                                onChange={handlePasswordChange('currentPassword')}
                                disabled={securityAction === 'password'}
                                iconLeft={<KitIcon name="lock" />}
                            />
                            <Input
                                label="Новый пароль"
                                type="password"
                                placeholder="Введите новый пароль"
                                autoComplete="new-password"
                                value={passwordDraft.newPassword}
                                onChange={handlePasswordChange('newPassword')}
                                disabled={securityAction === 'password'}
                                iconLeft={<KitIcon name="lock" />}
                            />
                            <Input
                                label="Повтор пароля"
                                type="password"
                                placeholder="Повторите новый пароль"
                                autoComplete="new-password"
                                value={passwordDraft.confirmPassword}
                                onChange={handlePasswordChange('confirmPassword')}
                                disabled={securityAction === 'password'}
                                iconLeft={<KitIcon name="lock" />}
                            />
                            <Button type="submit" variant="secondary" iconRight={<KitIcon name="lock" />} disabled={Boolean(securityAction)}>
                                {securityAction === 'password' ? 'Сохраняем...' : 'Сменить пароль'}
                            </Button>
                        </form>
                        <div className={styles.profileActions}>
                            <Button variant="secondary" iconLeft={<KitIcon name="link" />} onClick={handleYandexToggle} disabled={Boolean(securityAction)}>
                                {securityAction === 'yandex' ? 'Обрабатываем...' : yandexLinked ? 'Отвязать Yandex' : 'Привязать Yandex'}
                            </Button>
                            <Button variant="secondary" iconLeft={<KitIcon name="arrowLeft" />} onClick={handleLogout}>
                                Выйти из аккаунта
                            </Button>
                            <Button variant="destructive" iconLeft={<KitIcon name="trash" />} onClick={handleAccountDelete} disabled={Boolean(securityAction)}>
                                {securityAction === 'delete' ? 'Удаляем...' : 'Удалить аккаунт'}
                            </Button>
                        </div>
                    </section>
                </div>

                {accountStatus === 'client' && (
                    <ClientAccountPanel
                        testStatus={testStatus}
                        notify={notify}
                        styles={styles}
                    />
                )}
                {accountStatus === 'specialist' && <SpecialistAccountPanel notify={notify} styles={styles} />}
                {accountStatus === 'admin' && <AdminAccountPanel notify={notify} styles={styles} />}
            </div>
        </section>
    );
}
