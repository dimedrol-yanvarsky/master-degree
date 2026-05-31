import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge, Button, Checkbox, Input, KitIcon, Select, Textarea, Toast } from '../../shared/ui/kit';
import { adminAccounts, getAccountStatus, getTestStatusKey, hasCompletedTest, specialistClients, statusInfo, validateRegistrationValues } from '../../entities/user';
import { accountTypeOptions, generateStrongPassword, PasswordInput } from '../../features/auth';
import { formatResultDate } from '../../features/testing';
import { apiCollaboratingSpecialists, apiLogin, apiMe, apiRegister, apiTests, setAccessToken, yandexLoginUrl } from '../../shared/api';
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
    const isSpecialist = accountStatus === 'specialist';
    const [yandexLinked, setYandexLinked] = useState(Boolean(user?.yandexLinked || user?.authProvider === 'yandex'));
    const [editingField, setEditingField] = useState(null);
    const [draft, setDraft] = useState('');
    const [incomingRequest, setIncomingRequest] = useState('pending');

    const displayName = [user?.surname, user?.name, user?.patronymic].filter(Boolean).join(' ');
    const initials = ([user?.name, user?.surname]
        .map((part) => (part || '').trim().charAt(0))
        .filter(Boolean)
        .join('') || (user?.email || '?').charAt(0)).toUpperCase();

    // Поля, которые пользователь заполняет при регистрации — их можно отредактировать поштучно.
    const profileFields = [
        { key: 'surname', label: 'Фамилия', value: user?.surname || '', type: 'text', icon: 'user', placeholder: 'Иванова', autoComplete: 'family-name' },
        { key: 'name', label: 'Имя', value: user?.name || '', type: 'text', icon: 'user', placeholder: 'Анна', autoComplete: 'given-name' },
        { key: 'patronymic', label: 'Отчество', value: user?.patronymic || '', type: 'text', icon: 'user', placeholder: 'Сергеевна', autoComplete: 'additional-name' },
        { key: 'email', label: 'Электронная почта', value: user?.email || '', type: 'email', icon: 'mail', placeholder: 'name@example.com', autoComplete: 'email' },
        ...(isSpecialist ? [{ key: 'experience', label: 'Стаж', value: user?.experience || '', type: 'number', icon: 'clock', placeholder: 'Например, 5' }] : []),
        { key: 'about', label: 'Обо мне', value: user?.about || '', type: 'textarea', icon: 'info', placeholder: isSpecialist ? 'Опишите свой опыт' : 'Расскажите о себе' },
    ];

    const handleLogout = () => {
        onLogout?.();
        navigate('/login', { replace: true });
    };

    const validateField = (key, label, rawValue) => {
        const value = rawValue.trim();

        if (key === 'surname' || key === 'name' || key === 'patronymic') {
            if (!value) return `${label} должна быть заполнена.`;
            if (value.length < 2 || value.length > 40) return `${label} должна быть от 2 до 40 символов.`;
            if (!/^[A-Za-zА-ЯЁа-яё]+(?:[- ][A-Za-zА-ЯЁа-яё]+)?$/.test(value)) return `${label}: только буквы, пробел или дефис.`;
        }

        if (key === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            return 'Введите корректную электронную почту.';
        }

        if (key === 'experience') {
            const years = Number(value);
            if (!value || !Number.isInteger(years) || years < 1 || years > 80) return 'Укажите стаж целым числом от 1 до 80.';
        }

        if (key === 'about' && value.length > 320) {
            return 'Описание должно быть не длиннее 320 символов.';
        }

        return '';
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
        const error = validateField(field.key, field.label, draft);

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
        navigate('/register', { replace: true });
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
                    />
                )}
                {accountStatus === 'specialist' && <SpecialistAccountPanel notify={notify} />}
                {accountStatus === 'admin' && <AdminAccountPanel notify={notify} />}
            </div>
        </section>
    );
}

function getStoredTestResult(testStatus, testId) {
    return testStatus?.[`${getTestStatusKey(testId)}Result`] || null;
}

function CompletedTestMiniCard({ test, result }) {
    return (
        <article className={styles.testResultCard}>
            <div className={styles.testResultHead}>
                <div>
                    <span className={styles.testResultCode}>{test.code}</span>
                    <strong>{test.title}</strong>
                    <p>Дата прохождения: {formatResultDate(result?.completedAt)}</p>
                </div>
                <Badge tone="success">Пройден</Badge>
            </div>
            <div className={styles.testResultStats}>
                <span>{result?.scoreLabel || result?.score || 'Результат сохранён'}</span>
                <span>{result?.level || 'Интерпретация сохранена'}</span>
            </div>
        </article>
    );
}

function CollaborationMiniCard({ specialist }) {
    return (
        <article className={styles.collaborationCard}>
            <div>
                <strong>{specialist.name}</strong>
                <p>{specialist.description || 'Специалист сопровождает текущую работу клиента.'}</p>
                {specialist.startedAt && (
                    <span className={styles.collaborationMeta}>
                        Сотрудничество с {formatResultDate(specialist.startedAt)}
                    </span>
                )}
            </div>
            <div className={styles.collaborationSide}>
                <Badge tone="success">Сотрудничаете</Badge>
                {specialist.experience && <span>стаж: {specialist.experience}</span>}
            </div>
        </article>
    );
}

function ClientAccountPanel({
    testStatus,
    incomingRequest,
    setIncomingRequest,
    notify,
}) {
    const [systemTests, setSystemTests] = useState([]);
    const [testsError, setTestsError] = useState('');
    const [collaboratingSpecialists, setCollaboratingSpecialists] = useState([]);
    const [collaborationsError, setCollaborationsError] = useState('');
    const completedTests = systemTests
        .filter((test) => hasCompletedTest(testStatus, test.id))
        .map((test) => ({ test, result: getStoredTestResult(testStatus, test.id) }));

    useEffect(() => {
        let active = true;
        apiTests()
            .then((items) => {
                if (!active) return;
                setSystemTests(items);
                setTestsError('');
            })
            .catch((error) => {
                if (!active) return;
                setSystemTests([]);
                setTestsError(error.message || 'Не удалось загрузить тесты.');
            });

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        let active = true;
        apiCollaboratingSpecialists()
            .then((items) => {
                if (!active) return;
                setCollaboratingSpecialists(items);
                setCollaborationsError('');
            })
            .catch((error) => {
                if (!active) return;
                setCollaboratingSpecialists([]);
                setCollaborationsError(error.message || 'Не удалось загрузить специалистов.');
            });

        return () => {
            active = false;
        };
    }, []);

    return (
        <div className={styles.rolePanel}>
            <section className={styles.accountSection}>
                <div className={styles.sectionHead}>
                    <div>
                        <h2>Пройденные тесты</h2>
                        <p>Результаты текущего пользователя, загруженные из системы.</p>
                    </div>
                    <Badge tone={completedTests.length > 0 ? 'success' : 'accent'}>
                        {completedTests.length > 0 ? `${completedTests.length} пройдено` : 'Нет результатов'}
                    </Badge>
                </div>
                {testsError ? (
                    <div className={styles.emptyState}>
                        <p>{testsError}</p>
                    </div>
                ) : completedTests.length > 0 ? (
                    <div className={styles.testResultList}>
                        {completedTests.map(({ test, result }) => (
                            <CompletedTestMiniCard key={test.id} test={test} result={result} />
                        ))}
                    </div>
                ) : (
                    <div className={styles.emptyState}>
                        <p>Пока для текущего пользователя нет пройденных тестов.</p>
                        <Link to="/testing">Перейти к тестам</Link>
                    </div>
                )}
            </section>
            <section className={styles.accountSection}>
                <div className={styles.sectionHead}>
                    <div>
                        <h2>Специалисты в работе</h2>
                        <p>Перечень специалистов, с которыми клиент уже сотрудничает.</p>
                    </div>
                    <Badge tone={collaboratingSpecialists.length > 0 ? 'success' : 'accent'}>
                        {collaboratingSpecialists.length > 0 ? `${collaboratingSpecialists.length} в работе` : 'Нет сотрудничества'}
                    </Badge>
                </div>
                {collaborationsError ? (
                    <div className={styles.emptyState}>
                        <p>{collaborationsError}</p>
                    </div>
                ) : collaboratingSpecialists.length > 0 ? (
                    <div className={styles.collaborationList}>
                        {collaboratingSpecialists.map((specialist) => (
                            <CollaborationMiniCard key={specialist.id || specialist.name} specialist={specialist} />
                        ))}
                    </div>
                ) : (
                    <div className={styles.emptyState}>
                        <p>Пока нет специалистов, с которыми клиент уже сотрудничает.</p>
                        <Link to="/specialists">Перейти к специалистам</Link>
                    </div>
                )}
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

    // Возврат из серверного OAuth-потока: токен приходит во фрагменте URL
    // (#access_token=...), ошибка — в query (?oauth_error=...).
    useEffect(() => {
        if (isRegister) return undefined;

        const query = new URLSearchParams(window.location.search);
        if (query.get('oauth_error')) {
            window.history.replaceState(null, '', window.location.pathname);
            notify?.({
                tone: 'danger',
                title: 'Вход через Яндекс не выполнен',
                description: 'Не удалось завершить авторизацию. Попробуйте ещё раз.',
            });
            return undefined;
        }

        const hash = window.location.hash || '';
        if (!hash.includes('access_token=')) return undefined;

        const params = new URLSearchParams(hash.replace(/^#/, ''));
        const token = params.get('access_token');
        if (!token) return undefined;

        setAccessToken(token);
        window.history.replaceState(null, '', window.location.pathname);

        let active = true;
        (async () => {
            try {
                const user = await apiMe();
                if (!active) return;
                onAuthSuccess?.(user, { persist: true });
                navigateWithTransition(navigate, '/account', { replace: true });
            } catch (error) {
                if (active) {
                    notify?.({ tone: 'danger', title: 'Вход через Яндекс не выполнен', description: error.message });
                }
            }
        })();

        return () => {
            active = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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

    const handleSubmit = async (event) => {
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

        try {
            const result = isRegister
                ? await apiRegister(formValues)
                : await apiLogin(formValues);

            onAuthSuccess?.(result.user, { persist: true });
            navigateWithTransition(navigate, '/account', { replace: true });
        } catch (error) {
            notify?.({
                tone: 'danger',
                title: isRegister ? 'Регистрация не выполнена' : 'Вход не выполнен',
                description: error.message,
            });
        }
    };

    const handleModeLinkClick = (event) => {
        if (shouldUseDefaultNavigation(event)) return;

        event.preventDefault();

        navigateWithTransition(navigate, targetPath);
    };

    const handleYandexSignIn = () => {
        if (isRegister && (!formValues.acceptedTerms || !formValues.acceptedPersonalData)) {
            notify?.({
                tone: 'danger',
                title: 'Регистрация не выполнена',
                description: 'Подтвердите пользовательское соглашение и обработку персональных данных.',
            });
            return;
        }

        // Полноценный серверный OAuth-поток: уходим на бэкенд, тот — к Яндексу,
        // а затем возвращает нас на /login с токеном во фрагменте URL.
        window.location.assign(yandexLoginUrl());
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
