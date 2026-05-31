import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, KitIcon, Textarea } from '../../../shared/ui/kit';
import { getAccountStatus, statusInfo } from '../../../entities/user';
import { ROUTES } from '../../../shared/routes';
import { getAccountInitials, getDisplayName } from '../model/accountActions';
import { getProfileFields } from '../model/profileFields';
import { validateProfileField } from '../model/profileValidation';
import { AdminAccountPanel } from './AdminAccountPanel';
import { ClientAccountPanel } from './ClientAccountPanel';
import { SpecialistAccountPanel } from './SpecialistAccountPanel';

export function ProfileAccount({ user, status, testStatus, onLogout, onUserUpdate, onAccountDelete, notify, styles }) {
    const navigate = useNavigate();
    const accountStatus = getAccountStatus(user, status);
    const accountInfo = statusInfo[accountStatus] || statusInfo.client;
    const isSpecialist = accountStatus === 'specialist';
    const [yandexLinked, setYandexLinked] = useState(Boolean(user?.yandexLinked || user?.authProvider === 'yandex'));
    const [editingField, setEditingField] = useState(null);
    const [draft, setDraft] = useState('');
    const [incomingRequest, setIncomingRequest] = useState('pending');

    const displayName = getDisplayName(user);
    const initials = getAccountInitials(user);

    const profileFields = getProfileFields(user, isSpecialist);

    const handleLogout = () => {
        onLogout?.();
        navigate(ROUTES.login, { replace: true });
    };

    const startFieldEdit = (field) => {
        setEditingField(field.key);
        setDraft(field.value);
    };

    const cancelFieldEdit = () => {
        setEditingField(null);
        setDraft('');
    };

    const handleFieldSave = (field) => {
        const error = validateProfileField(field.key, field.label, draft);

        if (error) {
            notify?.({ tone: 'danger', title: 'Не удалось сохранить', description: error });
            return;
        }

        const nextValue = field.key === 'email' ? draft.trim().toLowerCase() : draft.trim();
        onUserUpdate?.({ [field.key]: nextValue });
        cancelFieldEdit();
        notify?.({ tone: 'success', title: 'Профиль обновлён', description: `Поле «${field.label}» сохранено.` });
    };

    const handlePasswordSubmit = (event) => {
        event.preventDefault();
        notify?.({
            tone: 'success',
            title: 'Пароль обновлен',
            description: 'Изменение сохранено в клиентском прототипе.',
        });
        event.currentTarget.reset();
    };

    const handleAccountDelete = () => {
        if (typeof window !== 'undefined' && !window.confirm('Удалить текущую учетную запись из клиентского прототипа?')) {
            return;
        }

        onAccountDelete?.();
        navigate(ROUTES.register, { replace: true });
    };

    return (
        <section className={styles.accountRoot}>
            <div className={styles.accountDashboard}>
                <div className={styles.profileCard}>
                    <div className={styles.profileHeader}>
                        <div className={styles.profileAvatar} aria-hidden="true">{initials}</div>
                        <div className={styles.profileHeading}>
                            <span className={styles.profileEyebrow}>Личный кабинет</span>
                            <h1>{displayName || 'Профиль'}</h1>
                            <p>{accountInfo.description}</p>
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

                                return (
                                    <article
                                        key={field.key}
                                        className={[styles.fieldRow, field.type === 'textarea' ? styles.fieldRowWide : ''].filter(Boolean).join(' ')}>
                                        <div className={styles.fieldRowTop}>
                                            <span className={styles.fieldLabelGroup}>
                                                <span className={styles.fieldIcon} aria-hidden="true">
                                                    <KitIcon name={field.icon} size={15} />
                                                </span>
                                                <span className={styles.fieldLabel}>{field.label}</span>
                                            </span>
                                            {!isEditing && (
                                                <button
                                                    type="button"
                                                    className={styles.fieldEditButton}
                                                    aria-label={`Изменить поле «${field.label}»`}
                                                    onClick={() => startFieldEdit(field)}>
                                                    <KitIcon name="edit" size={15} />
                                                </button>
                                            )}
                                        </div>
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
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <Input
                                                        type={field.type}
                                                        value={draft}
                                                        onChange={(event) => setDraft(event.target.value)}
                                                        placeholder={field.placeholder}
                                                        autoComplete={field.autoComplete}
                                                        autoFocus
                                                    />
                                                )}
                                                <div className={styles.fieldEditActions}>
                                                    <Button type="submit" size="sm" variant="gradient" gradient="radial" iconRight={<KitIcon name="check" />}>
                                                        Сохранить
                                                    </Button>
                                                    <Button type="button" size="sm" variant="ghost" onClick={cancelFieldEdit}>
                                                        Отмена
                                                    </Button>
                                                </div>
                                            </form>
                                        ) : (
                                            <strong className={styles.fieldValue}>{field.value || 'Не указано'}</strong>
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
                            <Input label="Новый пароль" type="password" placeholder="Введите новый пароль" iconLeft={<KitIcon name="lock" />} />
                            <Button type="submit" variant="secondary" iconRight={<KitIcon name="lock" />}>
                                Сменить пароль
                            </Button>
                        </form>
                        <div className={styles.profileActions}>
                            <Button variant={yandexLinked ? 'secondary' : 'ghost'} iconLeft={<KitIcon name="link" />} onClick={() => setYandexLinked((value) => !value)}>
                                {yandexLinked ? 'Отвязать Yandex' : 'Привязать Yandex'}
                            </Button>
                            <Button variant="ghost" iconLeft={<KitIcon name="arrowLeft" />} onClick={handleLogout}>
                                Выйти из аккаунта
                            </Button>
                            <Button variant="destructive" iconLeft={<KitIcon name="trash" />} onClick={handleAccountDelete}>
                                Удалить аккаунт
                            </Button>
                        </div>
                    </section>
                </div>

                {accountStatus === 'client' && (
                    <ClientAccountPanel
                        testStatus={testStatus}
                        incomingRequest={incomingRequest}
                        setIncomingRequest={setIncomingRequest}
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
