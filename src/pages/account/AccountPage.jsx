import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge, Button, Checkbox, Input, KitIcon, Select, Textarea, Toast } from '../../shared/ui/kit';
import { registerClientUser, signInClient, signInWithYandex, TEST_AUTH_USER, adminAccounts, availableSpecialists, clientRecommendations, formatAccountDate, getAccountStatus, getProfileStats, selectedSpecialists, specialistClients, statusInfo, validateRegistrationValues } from '../../entities/user';
import { accountTypeOptions, generateStrongPassword, PasswordInput } from '../../features/auth';
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

function AccountIllustration({ mode }) {
    const imageSrc = authImages[mode] || authLoginImage;

    return (
        <div className={styles.visual} aria-hidden="true">
            <img
                className={styles.visualImage}
                src={imageSrc}
                alt=""
                decoding="async"
                loading="eager"
                draggable="false"
            />
        </div>
    );
}

function shouldUseDefaultNavigation(event) {
    return (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.altKey ||
        event.ctrlKey ||
        event.shiftKey
    );
}

function navigateWithTransition(navigate, targetPath, options) {
    if (typeof document !== 'undefined' && document.startViewTransition) {
        document.startViewTransition(() => {
            navigate(targetPath, options);
        });
        return;
    }

    navigate(targetPath, options);
}

function AccountToast({ notification }) {
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

function ProfileAccount({ user, status, testStatus, onLogout, onUserUpdate, onAccountDelete, notify }) {
    const navigate = useNavigate();
    const accountStatus = getAccountStatus(user, status);
    const accountInfo = statusInfo[accountStatus] || statusInfo.client;
    const userName = user?.name || 'Пользователь';
    const userPatronymic = user?.patronymic || '';
    const userEmail = user?.email || TEST_AUTH_USER.email;
    const fullName = [userName, userPatronymic].filter(Boolean).join(' ');
    const [editValues, setEditValues] = useState({
        name: userName,
        patronymic: userPatronymic,
        email: userEmail,
    });
    const [isEditing, setIsEditing] = useState(false);
    const [yandexLinked, setYandexLinked] = useState(Boolean(user?.yandexLinked || user?.authProvider === 'yandex'));
    const [avatarPreview, setAvatarPreview] = useState('');
    const [requestState, setRequestState] = useState('idle');
    const [incomingRequest, setIncomingRequest] = useState('pending');
    const bfiResult = testStatus?.bfi2Result;
    const bfiCompleted = testStatus?.bfi2 === 'completed';
    const profileStats = getProfileStats(accountStatus, bfiCompleted);

    useEffect(() => {
        setEditValues({
            name: userName,
            patronymic: userPatronymic,
            email: userEmail,
        });
    }, [userName, userPatronymic, userEmail]);

    const handleLogout = () => {
        onLogout?.();
        navigate('/login', { replace: true });
    };

    const handleProfileSave = (event) => {
        event.preventDefault();

        const nextEmail = String(editValues.email || '').trim().toLowerCase();

        if (!editValues.name.trim() || !editValues.patronymic.trim() || !nextEmail) {
            notify?.({
                tone: 'danger',
                title: 'Не удалось сохранить профиль',
                description: 'Имя, отчество и почта должны быть заполнены.',
            });
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
            notify?.({
                tone: 'danger',
                title: 'Не удалось сохранить профиль',
                description: 'Введите корректную электронную почту.',
            });
            return;
        }

        onUserUpdate?.({
            name: editValues.name.trim(),
            patronymic: editValues.patronymic.trim(),
            email: nextEmail,
        });
        setIsEditing(false);
        notify?.({
            tone: 'success',
            title: 'Профиль обновлен',
            description: 'Имя, отчество и почта сохранены.',
        });
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

    const handleAvatarChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => setAvatarPreview(String(reader.result || ''));
        reader.readAsDataURL(file);
    };

    const handleAccountDelete = () => {
        if (typeof window !== 'undefined' && !window.confirm('Удалить текущую учетную запись из клиентского прототипа?')) {
            return;
        }

        onAccountDelete?.();
        navigate('/register', { replace: true });
    };

    return (
        <section className={styles.accountRoot}>
            <div className={styles.accountDashboard}>
                <div className={styles.profileCard}>
                    <div className={styles.profileHeader}>
                        <div className={styles.profileHero}>
                            <label className={styles.avatarControl}>
                                <span className={styles.avatarImage} aria-hidden="true">
                                    {avatarPreview
                                        ? <img src={avatarPreview} alt="" />
                                        : <KitIcon name="user" size={30} />}
                                </span>
                                <input type="file" accept="image/*" onChange={handleAvatarChange} />
                                <span><KitIcon name="upload" size={15} /> Сменить фото</span>
                            </label>
                            <div>
                                <Badge tone={accountInfo.badgeTone}>{accountInfo.label}</Badge>
                                <h1>Личный кабинет</h1>
                                <p>{accountInfo.description}</p>
                            </div>
                        </div>
                    </div>

                    <div className={styles.identityGrid}>
                        <article>
                            <span>Электронная почта</span>
                            <strong>{userEmail}</strong>
                        </article>
                        <article>
                            <span>Имя</span>
                            <strong>{userName}</strong>
                        </article>
                        <article>
                            <span>Отчество</span>
                            <strong>{userPatronymic || 'Не указано'}</strong>
                        </article>
                        <article>
                            <span>Статус</span>
                            <strong>{accountInfo.label}</strong>
                        </article>
                    </div>

                    <div className={styles.profileGrid}>
                        {profileStats.map((item) => (
                            <article className={styles.profileStat} key={item.label}>
                                <span>{item.label}</span>
                                <strong>{item.value}</strong>
                                <p>{item.meta}</p>
                            </article>
                        ))}
                    </div>

                    <section className={styles.accountSection}>
                        <div className={styles.sectionHead}>
                            <h2>Персональные данные</h2>
                            <Button variant="secondary" size="sm" onClick={() => setIsEditing((value) => !value)}>
                                {isEditing ? 'Отменить' : 'Изменить'}
                            </Button>
                        </div>
                        {isEditing ? (
                            <form className={styles.inlineForm} onSubmit={handleProfileSave}>
                                <Input
                                    label="Имя"
                                    value={editValues.name}
                                    onChange={(event) => setEditValues((current) => ({ ...current, name: event.target.value }))}
                                />
                                <Input
                                    label="Отчество"
                                    value={editValues.patronymic}
                                    onChange={(event) => setEditValues((current) => ({ ...current, patronymic: event.target.value }))}
                                />
                                <Input
                                    label="Почта"
                                    type="email"
                                    value={editValues.email}
                                    onChange={(event) => setEditValues((current) => ({ ...current, email: event.target.value }))}
                                />
                                <Button type="submit" variant="gradient" gradient="radial" iconRight={<KitIcon name="check" />}>
                                    Сохранить
                                </Button>
                            </form>
                        ) : (
                            <p className={styles.sectionText}>В профиле указаны данные, введенные при регистрации: {fullName || userEmail}.</p>
                        )}
                    </section>

                    <section className={styles.accountSection}>
                        <div className={styles.sectionHead}>
                            <h2>Безопасность и доступ</h2>
                        </div>
                        <form className={styles.inlineForm} onSubmit={handlePasswordSubmit}>
                            <Input label="Новый пароль" type="password" placeholder="Введите новый пароль" />
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
                        bfiCompleted={bfiCompleted}
                        bfiResult={bfiResult}
                        requestState={requestState}
                        setRequestState={setRequestState}
                        incomingRequest={incomingRequest}
                        setIncomingRequest={setIncomingRequest}
                        notify={notify}
                    />
                )}
                {accountStatus === 'specialist' && <SpecialistAccountPanel notify={notify} />}
                {accountStatus === 'admin' && <AdminAccountPanel notify={notify} />}
            </div>
        </section>
    );
}

function ClientAccountPanel({
    bfiCompleted,
    bfiResult,
    requestState,
    setRequestState,
    incomingRequest,
    setIncomingRequest,
    notify,
}) {
    const navigate = useNavigate();
    const answersCount = bfiResult?.answers?.length || 0;
    const specialistRequestLabel = requestState === 'sent' ? 'Запрос отправлен' : 'Отправить запрос';

    return (
        <div className={styles.rolePanel}>
            <section className={styles.accountSection}>
                <div className={styles.sectionHead}>
                    <div>
                        <h2>Пройденные тесты</h2>
                        <p>История прохождений, результат и выбранные ответы.</p>
                    </div>
                    {bfiCompleted ? (
                        <Badge tone="success">BFI-2 пройден</Badge>
                    ) : (
                        <Badge tone="warning">Тест не пройден</Badge>
                    )}
                </div>
                {bfiCompleted ? (
                    <div className={styles.roleCard}>
                        <div>
                            <strong>Большая пятерка BFI-2</strong>
                            <p>Дата: {formatAccountDate(bfiResult?.completedAt)}</p>
                            <p>Средний балл: {bfiResult?.score ?? 'не рассчитан'}; ответов сохранено: {answersCount}</p>
                            {answersCount > 0 && (
                                <details className={styles.answerDetails}>
                                    <summary>Выбранные ответы</summary>
                                    <ol>
                                        {bfiResult.answers.map((answer) => (
                                            <li key={answer.questionIndex}>
                                                Вопрос {answer.questionIndex + 1}: вариант {answer.value}
                                            </li>
                                        ))}
                                    </ol>
                                </details>
                            )}
                        </div>
                        <Badge tone="accent">Черты личности доступны</Badge>
                    </div>
                ) : (
                    <div className={styles.emptyState}>
                        <p>После прохождения BFI-2 здесь появятся дата, результат и выбранные варианты ответа.</p>
                        <Button variant="gradient" gradient="radial" iconRight={<KitIcon name="arrowRight" />} onClick={() => navigate('/testing/bfi-2')}>
                            Пройти BFI-2
                        </Button>
                    </div>
                )}
            </section>

            {bfiCompleted && (
                <section className={styles.accountSection}>
                    <div className={styles.sectionHead}>
                        <div>
                            <h2>Личностные черты</h2>
                            <p>Краткая интерпретация по сохраненному результату тестирования.</p>
                        </div>
                    </div>
                    <div className={styles.traitGrid}>
                        <article>
                            <span>Открытость</span>
                            <strong>Средняя</strong>
                        </article>
                        <article>
                            <span>Добросовестность</span>
                            <strong>Выше средней</strong>
                        </article>
                        <article>
                            <span>Эмоциональная стабильность</span>
                            <strong>Требует внимания</strong>
                        </article>
                    </div>
                </section>
            )}

            <section className={styles.accountSection}>
                <div className={styles.sectionHead}>
                    <div>
                        <h2>Рекомендации</h2>
                        <p>Персональные шаги для самостоятельной поддержки.</p>
                    </div>
                </div>
                <ul className={styles.roleList}>
                    {clientRecommendations.map((recommendation) => (
                        <li key={recommendation}>
                            <KitIcon name="check" size={16} />
                            <span>{recommendation}</span>
                        </li>
                    ))}
                </ul>
            </section>

            <section className={styles.accountSection}>
                <div className={styles.sectionHead}>
                    <div>
                        <h2>Специалисты</h2>
                        <p>Просмотр доступных специалистов и отправка заявки.</p>
                    </div>
                </div>
                <div className={styles.roleGrid}>
                    {availableSpecialists.map((specialist) => (
                        <article className={styles.roleCard} key={specialist.name}>
                            <div>
                                <strong>{specialist.name}</strong>
                                <p>{specialist.focus}</p>
                                <Badge tone="success">{specialist.status}</Badge>
                            </div>
                            <Button
                                variant={requestState === 'sent' ? 'secondary' : 'primary'}
                                iconRight={<KitIcon name="mail" />}
                                disabled={requestState === 'sent'}
                                onClick={() => {
                                    setRequestState('sent');
                                    notify?.({
                                        tone: 'success',
                                        title: 'Запрос отправлен',
                                        description: `Заявка специалисту ${specialist.name} сохранена.`,
                                    });
                                }}>
                                {specialistRequestLabel}
                            </Button>
                        </article>
                    ))}
                </div>
            </section>

            <section className={styles.accountSection}>
                <div className={styles.sectionHead}>
                    <div>
                        <h2>Запрос специалиста</h2>
                        <p>Клиент может принять или отклонить входящую заявку на работу.</p>
                    </div>
                    <Badge tone={incomingRequest === 'accepted' ? 'success' : incomingRequest === 'declined' ? 'danger' : 'warning'}>
                        {incomingRequest === 'accepted' ? 'Принята' : incomingRequest === 'declined' ? 'Отклонена' : 'Ожидает решения'}
                    </Badge>
                </div>
                <div className={styles.roleCard}>
                    <div>
                        <strong>Марина Игоревна</strong>
                        <p>Предлагает сопровождение по теме горевания и эмоциональной саморегуляции.</p>
                    </div>
                    <div className={styles.roleActions}>
                        <Button
                            variant="success"
                            iconRight={<KitIcon name="check" />}
                            onClick={() => {
                                setIncomingRequest('accepted');
                                notify?.({
                                    tone: 'success',
                                    title: 'Запрос принят',
                                    description: 'Специалист добавлен в текущую работу.',
                                });
                            }}>
                            Принять
                        </Button>
                        <Button
                            variant="ghost"
                            iconRight={<KitIcon name="close" />}
                            onClick={() => {
                                setIncomingRequest('declined');
                                notify?.({
                                    tone: 'warning',
                                    title: 'Запрос отклонен',
                                    description: 'Заявка специалиста отклонена.',
                                });
                            }}>
                            Отклонить
                        </Button>
                    </div>
                </div>
            </section>

            <section className={styles.accountSection}>
                <div className={styles.sectionHead}>
                    <div>
                        <h2>История специалистов</h2>
                        <p>Выбранные специалисты и статус работы.</p>
                    </div>
                </div>
                <ul className={styles.timelineList}>
                    {selectedSpecialists.map((specialist) => (
                        <li key={`${specialist.name}-${specialist.period}`}>
                            <strong>{specialist.name}</strong>
                            <span>{specialist.period}</span>
                            <p>{specialist.result}</p>
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    );
}

function SpecialistAccountPanel({ notify }) {
    const [assignedClient, setAssignedClient] = useState(specialistClients[0].name);

    const handleRecommendationSubmit = (event) => {
        event.preventDefault();
        notify?.({
            tone: 'success',
            title: 'Рекомендация назначена',
            description: `Рекомендация для клиента "${assignedClient}" сохранена.`,
        });
        event.currentTarget.reset();
    };

    return (
        <div className={styles.rolePanel}>
            <section className={styles.accountSection}>
                <div className={styles.sectionHead}>
                    <div>
                        <h2>Все клиенты</h2>
                        <p>Просмотр клиентов, состояния и последнего тестирования.</p>
                    </div>
                </div>
                <div className={styles.roleGrid}>
                    {specialistClients.map((client) => (
                        <article className={styles.roleCard} key={client.name}>
                            <div>
                                <strong>{client.name}</strong>
                                <p>{client.lastTest}</p>
                            </div>
                            <Badge tone={client.state === 'Высокая потребность' ? 'warning' : 'accent'}>{client.state}</Badge>
                        </article>
                    ))}
                </div>
            </section>

            <section className={styles.accountSection}>
                <div className={styles.sectionHead}>
                    <div>
                        <h2>Выбранные клиенты</h2>
                        <p>Клиенты, с которыми специалист ведет работу.</p>
                    </div>
                </div>
                <ul className={styles.roleList}>
                    {specialistClients.slice(0, 2).map((client) => (
                        <li key={client.name}>
                            <KitIcon name="user" size={16} />
                            <span>{client.name}: план сопровождения активен</span>
                        </li>
                    ))}
                </ul>
            </section>

            <section className={styles.accountSection}>
                <div className={styles.sectionHead}>
                    <div>
                        <h2>Назначить рекомендацию</h2>
                        <p>Специалист может выбрать клиента и добавить персональный шаг.</p>
                    </div>
                </div>
                <form className={styles.compactForm} onSubmit={handleRecommendationSubmit}>
                    <Select
                        label="Клиент"
                        options={specialistClients.map((client) => ({ value: client.name, label: client.name, description: client.state }))}
                        value={assignedClient}
                        onChange={setAssignedClient}
                    />
                    <Input label="Рекомендация" placeholder="Например: вести дневник состояния 7 дней" required />
                    <Button type="submit" variant="gradient" gradient="radial" iconRight={<KitIcon name="check" />}>
                        Назначить
                    </Button>
                </form>
            </section>
        </div>
    );
}

function AdminAccountPanel({ notify }) {
    const [accounts, setAccounts] = useState(adminAccounts);
    const [createdStatus, setCreatedStatus] = useState('client');

    const handleCreateAccount = (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const name = String(formData.get('accountName') || '').trim();

        if (!name) {
            notify?.({
                tone: 'danger',
                title: 'Аккаунт не создан',
                description: 'Введите имя или почту учетной записи.',
            });
            return;
        }

        setAccounts((current) => [...current, { name, status: createdStatus, condition: 'Активна' }]);
        notify?.({
            tone: 'success',
            title: 'Аккаунт создан',
            description: 'Учетная запись добавлена в клиентском прототипе.',
        });
        event.currentTarget.reset();
        setCreatedStatus('client');
    };

    const handleBlockAccount = (targetName) => {
        setAccounts((current) => current.map((account) => (
            account.name === targetName ? { ...account, condition: 'Заблокирована' } : account
        )));
        notify?.({
            tone: 'warning',
            title: 'Аккаунт заблокирован',
            description: `Учетная запись "${targetName}" переведена в статус блокировки.`,
        });
    };

    const handleDeleteAccount = (targetName) => {
        setAccounts((current) => current.filter((account) => account.name !== targetName));
        notify?.({
            tone: 'danger',
            title: 'Аккаунт удален',
            description: `Учетная запись "${targetName}" удалена из списка.`,
        });
    };

    return (
        <div className={styles.rolePanel}>
            <section className={styles.accountSection}>
                <div className={styles.sectionHead}>
                    <div>
                        <h2>Учетные записи</h2>
                        <p>Создание, блокировка и удаление пользователей.</p>
                    </div>
                </div>
                <div className={styles.adminList}>
                    {accounts.map((account) => (
                        <article className={styles.roleCard} key={account.name}>
                            <div>
                                <strong>{account.name}</strong>
                                <p>{statusInfo[account.status]?.label || account.status} · {account.condition}</p>
                            </div>
                            <div className={styles.roleActions}>
                                <Button variant="secondary" size="sm" iconRight={<KitIcon name="shield" />} onClick={() => handleBlockAccount(account.name)}>
                                    Блокировать
                                </Button>
                                <Button variant="destructive" size="sm" iconRight={<KitIcon name="trash" />} onClick={() => handleDeleteAccount(account.name)}>
                                    Удалить
                                </Button>
                            </div>
                        </article>
                    ))}
                </div>
            </section>

            <section className={styles.accountSection}>
                <div className={styles.sectionHead}>
                    <div>
                        <h2>Создать аккаунт</h2>
                        <p>Администратор может завести пользователя с нужным статусом.</p>
                    </div>
                </div>
                <form className={styles.compactForm} onSubmit={handleCreateAccount}>
                    <Input name="accountName" label="Имя или почта" placeholder="new-user@example.com" required />
                    <Select
                        label="Статус"
                        options={[
                            { value: 'client', label: 'Клиент' },
                            { value: 'specialist', label: 'Специалист' },
                            { value: 'admin', label: 'Администратор' },
                        ]}
                        value={createdStatus}
                        onChange={setCreatedStatus}
                    />
                    <Button type="submit" variant="gradient" gradient="radial" iconRight={<KitIcon name="plus" />}>
                        Создать
                    </Button>
                </form>
            </section>

            <section className={styles.accountSection}>
                <div className={styles.sectionHead}>
                    <div>
                        <h2>Модерация</h2>
                        <p>Контроль корректности пользовательских записей и рекомендаций.</p>
                    </div>
                    <Badge tone="warning">2 на проверке</Badge>
                </div>
                <div className={styles.roleGrid}>
                    <article className={styles.roleCard}>
                        <div>
                            <strong>Жалоба на рекомендацию</strong>
                            <p>Проверить формулировку специалиста перед публикацией.</p>
                        </div>
                        <Button variant="secondary" iconRight={<KitIcon name="check" />}>Одобрить</Button>
                    </article>
                    <article className={styles.roleCard}>
                        <div>
                            <strong>Запись клиента</strong>
                            <p>Отметка о кризисном состоянии требует внимания администратора.</p>
                        </div>
                        <Button variant="ghost" iconRight={<KitIcon name="warning" />}>Проверить</Button>
                    </article>
                </div>
            </section>
        </div>
    );
}

function AuthAccess({ mode, onAuthSuccess, notify }) {
    const isRegister = mode === 'register';
    const navigate = useNavigate();
    const targetPath = isRegister ? '/login' : '/register';
    const [formValues, setFormValues] = useState({
        surname: '',
        name: '',
        patronymic: '',
        email: '',
        password: '',
        accountType: 'client',
        about: '',
        experience: '',
        acceptedTerms: false,
        acceptedPersonalData: false,
        remember: true,
    });
    const [formErrors, setFormErrors] = useState({});
    const cardClassName = [
        styles.card,
        isRegister ? styles.register : styles.login,
    ].join(' ');
    const isSpecialistAccount = formValues.accountType === 'specialist';
    const aboutPlaceholder = isSpecialistAccount ? 'Опишите свой опыт' : 'Расскажите о своей проблеме';

    useEffect(() => {
        setFormValues({
            surname: '',
            name: '',
            patronymic: '',
            email: '',
            password: '',
            accountType: 'client',
            about: '',
            experience: '',
            acceptedTerms: false,
            acceptedPersonalData: false,
            remember: true,
        });
        setFormErrors({});
    }, [mode]);

    const handleFieldChange = (field) => (event) => {
        const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
        setFormValues((currentValues) => ({
            ...currentValues,
            [field]: value,
        }));
        setFormErrors((currentErrors) => ({
            ...currentErrors,
            [field]: '',
        }));
    };

    const handleValueChange = (field) => (value) => {
        setFormValues((currentValues) => ({
            ...currentValues,
            [field]: value,
            ...(field === 'accountType' && value !== 'specialist' ? { experience: '' } : {}),
        }));
        setFormErrors((currentErrors) => ({
            ...currentErrors,
            [field]: '',
            ...(field === 'accountType' ? { about: '', experience: '' } : {}),
        }));
    };

    const handleGeneratePassword = () => {
        setFormValues((currentValues) => ({
            ...currentValues,
            password: generateStrongPassword(),
        }));
        setFormErrors((currentErrors) => ({
            ...currentErrors,
            password: '',
        }));
    };

    const handleSubmit = (event) => {
        event.preventDefault();

        if (isRegister) {
            const validation = validateRegistrationValues(formValues);
            setFormErrors(validation.errors);

            if (!validation.ok) {
                notify?.({
                    tone: 'danger',
                    title: 'Регистрация не выполнена',
                    description: validation.message,
                });
                return;
            }
        }

        const result = isRegister
            ? registerClientUser(formValues)
            : signInClient(formValues);

        if (!result.ok) {
            if (isRegister && result.errors) {
                setFormErrors(result.errors);
            }
            notify?.({
                tone: 'danger',
                title: isRegister ? 'Регистрация не выполнена' : 'Вход не выполнен',
                description: result.message,
            });
            return;
        }

        onAuthSuccess?.(result.user, { persist: isRegister || formValues.remember });
        navigateWithTransition(navigate, '/account', { replace: true });
    };

    const handleModeLinkClick = (event) => {
        if (shouldUseDefaultNavigation(event)) return;

        event.preventDefault();

        navigateWithTransition(navigate, targetPath);
    };

    const handleYandexSignIn = () => {
        const result = signInWithYandex({
            acceptedTerms: !isRegister || formValues.acceptedTerms,
            acceptedPersonalData: !isRegister || formValues.acceptedPersonalData,
        });

        if (!result.ok) {
            notify?.({
                tone: 'danger',
                title: isRegister ? 'Регистрация не выполнена' : 'Вход не выполнен',
                description: result.message,
            });
            return;
        }

        onAuthSuccess?.(result.user, { persist: true });
        navigateWithTransition(navigate, '/account', { replace: true });
    };

    return (
        <section className={styles.root}>
            <form className={cardClassName} onSubmit={handleSubmit} noValidate>
                {!isRegister && <AccountIllustration mode={mode} />}
                <div className={styles.formPanel}>
                    <div className={styles.header}>
                        <h1>{isRegister ? 'Создать аккаунт' : 'Войти в аккаунт'}</h1>
                        <p>
                            {isRegister
                                ? 'Создайте профиль, чтобы сохранять эмоциональные записи и получать персональные рекомендации.'
                                : 'Авторизуйтесь, чтобы перейти к личным рекомендациям и графу эмоций.'}
                        </p>
                    </div>

                    <div className={styles.fields}>
                        {isRegister && (
                            <>
                                <Input
                                    label="Фамилия"
                                    placeholder="Иванова"
                                    autoComplete="family-name"
                                    value={formValues.surname}
                                    onChange={handleFieldChange('surname')}
                                    error={formErrors.surname}
                                    required
                                    size="lg"
                                    iconLeft={<KitIcon name="user" />}
                                />
                                <Input
                                    label="Имя"
                                    placeholder="Анна"
                                    autoComplete="given-name"
                                    value={formValues.name}
                                    onChange={handleFieldChange('name')}
                                    error={formErrors.name}
                                    required
                                    size="lg"
                                    iconLeft={<KitIcon name="user" />}
                                />
                                <Input
                                    label="Отчество"
                                    placeholder="Сергеевна"
                                    autoComplete="additional-name"
                                    value={formValues.patronymic}
                                    onChange={handleFieldChange('patronymic')}
                                    error={formErrors.patronymic}
                                    required
                                    size="lg"
                                    iconLeft={<KitIcon name="user" />}
                                />
                                <Select
                                    label="Тип аккаунта"
                                    options={accountTypeOptions}
                                    value={formValues.accountType}
                                    onChange={handleValueChange('accountType')}
                                    error={formErrors.accountType}
                                    size="lg"
                                />
                                <Textarea
                                    label="Расскажите о себе"
                                    placeholder={aboutPlaceholder}
                                    className={styles.aboutTextarea}
                                    value={formValues.about}
                                    onChange={handleFieldChange('about')}
                                    error={formErrors.about}
                                    maxLength={320}
                                    showCount
                                    resize="vertical"
                                    required
                                />
                                {isSpecialistAccount && (
                                    <Input
                                        label="Стаж"
                                        type="number"
                                        placeholder="Например, 5"
                                        min="1"
                                        max="80"
                                        inputMode="numeric"
                                        value={formValues.experience}
                                        onChange={handleFieldChange('experience')}
                                        error={formErrors.experience}
                                        required
                                        size="lg"
                                        iconLeft={<KitIcon name="clock" />}
                                    />
                                )}
                            </>
                        )}
                        <Input
                            label="Почта"
                            type="email"
                            placeholder="name@example.com"
                            autoComplete="email"
                            value={formValues.email}
                            onChange={handleFieldChange('email')}
                            error={formErrors.email}
                            required
                            size="lg"
                            iconLeft={<KitIcon name="mail" />}
                        />
                        <div className={styles.passwordField}>
                            {isRegister ? (
                                <>
                                    <div className={styles.passwordHeader}>
                                        <label className={styles.passwordLabel} htmlFor="register-password">
                                            Пароль<span className={styles.passwordRequired}>*</span>
                                        </label>
                                        <button type="button" onClick={handleGeneratePassword}>
                                            Сгенерировать
                                        </button>
                                    </div>
                                    <PasswordInput
                                        id="register-password"
                                        placeholder="Введите пароль"
                                        autoComplete="new-password"
                                        value={formValues.password}
                                        onChange={handleFieldChange('password')}
                                        error={formErrors.password}
                                        required
                                        size="lg"
                                        iconLeft={<KitIcon name="lock" />}
                                    />
                                </>
                            ) : (
                                <PasswordInput
                                    label="Пароль"
                                    placeholder="Введите пароль"
                                    autoComplete="current-password"
                                    value={formValues.password}
                                    onChange={handleFieldChange('password')}
                                    required
                                    size="lg"
                                    iconLeft={<KitIcon name="lock" />}
                                />
                            )}
                        </div>
                    </div>

                    {!isRegister && (
                        <div className={styles.options}>
                            <Checkbox
                                label="Запомнить меня"
                                checked={formValues.remember}
                                onChange={handleFieldChange('remember')}
                            />
                            <a href="#restore">Забыли пароль?</a>
                        </div>
                    )}

                    {isRegister && (
                        <div className={styles.consentGroup}>
                            <Checkbox
                                checked={formValues.acceptedTerms}
                                onChange={handleFieldChange('acceptedTerms')}
                                required
                                label={(
                                    <>
                                        Я принимаю{' '}
                                        <a
                                            href="/user-agreement"
                                            target="_blank"
                                            rel="noreferrer"
                                            onClick={(event) => event.stopPropagation()}>
                                            пользовательское соглашение
                                        </a>
                                    </>
                                )}
                            />
                            <Checkbox
                                checked={formValues.acceptedPersonalData}
                                onChange={handleFieldChange('acceptedPersonalData')}
                                required
                                label="Я даю согласие на обработку персональных данных"
                            />
                            {(formErrors.acceptedTerms || formErrors.acceptedPersonalData) && (
                                <p className={styles.formError}>
                                    {formErrors.acceptedTerms || formErrors.acceptedPersonalData}
                                </p>
                            )}
                        </div>
                    )}

                    <Button
                        type="submit"
                        variant="gradient"
                        gradient="radial"
                        size="lg"
                        fullWidth
                        iconRight={<KitIcon name="arrowRight" />}>
                        {isRegister ? 'Зарегистрироваться' : 'Войти'}
                    </Button>

                    <p className={styles.footer}>
                        {isRegister ? 'Уже есть аккаунт?' : 'Нет аккаунта?'}{' '}
                        <Link to={targetPath} onClick={handleModeLinkClick}>
                            {isRegister ? 'Войти' : 'Зарегистрироваться'}
                        </Link>
                    </p>

                    {!isRegister && (
                        <div className={styles.authProviderGroup}>
                            <div className={styles.authDivider} aria-hidden="true">
                                <span>или</span>
                            </div>
                            <Button
                                className={styles.yandexButton}
                                variant="secondary"
                                size="lg"
                                fullWidth
                                iconLeft={<span className={styles.yandexIcon}>Я</span>}
                                onClick={handleYandexSignIn}>
                                Войти через Яндекс
                            </Button>
                        </div>
                    )}
                </div>
            </form>
        </section>
    );
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
                <AccountToast notification={notification} />
                <ProfileAccount
                    user={user}
                    status={status}
                    testStatus={testStatus}
                    onLogout={onLogout}
                    onUserUpdate={onUserUpdate}
                    onAccountDelete={onAccountDelete}
                    notify={notify}
                />
            </>
        );
    }

    return (
        <>
            <AccountToast notification={notification} />
            <AuthAccess mode={mode} onAuthSuccess={onAuthSuccess} notify={notify} />
        </>
    );
}
