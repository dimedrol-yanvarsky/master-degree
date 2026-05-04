import { Link, useNavigate } from 'react-router-dom';
import { Badge, Button, Checkbox, Input, KitIcon } from '../../shared/ui/kit';
import authIllustration from './assets/lumen-auth-illustration.svg';
import styles from './AccountPage.module.css';

const profileStats = [
    { label: 'Записей эмоций', value: '0', meta: 'История появится после первой записи' },
    { label: 'Тестов пройдено', value: '0', meta: 'BFI-2 и BDS готовы к подключению' },
    { label: 'Рекомендаций', value: '0', meta: 'Появятся после анализа динамики' },
];

function AccountIllustration() {
    return (
        <div className={styles.visual} aria-hidden="true">
            <img
                className={styles.visualImage}
                src={authIllustration}
                alt=""
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

function ProfileAccount() {
    return (
        <section className={styles.accountRoot}>
            <div className={styles.profileCard}>
                <div className={styles.profileHeader}>
                    <div className={styles.icon} aria-hidden="true">
                        <KitIcon name="user" size={26} />
                    </div>
                    <Badge tone="accent">Личный кабинет</Badge>
                    <h1>Профиль Lumen</h1>
                    <p>
                        Здесь будут личные записи, результаты тестирований, история состояния и настройки аккаунта.
                    </p>
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

                <div className={styles.profileActions}>
                    <Button variant="gradient" gradient="radial" size="lg" iconRight={<KitIcon name="arrowRight" />}>
                        Перейти к записям
                    </Button>
                    <Button variant="secondary" size="lg">
                        Настройки профиля
                    </Button>
                </div>
            </div>
        </section>
    );
}

function AuthAccess({ mode }) {
    const isRegister = mode === 'register';
    const navigate = useNavigate();
    const targetPath = isRegister ? '/login' : '/register';
    const cardClassName = [
        styles.card,
        isRegister ? styles.register : styles.login,
    ].join(' ');

    const handleSubmit = (event) => {
        event.preventDefault();
    };

    const handleModeLinkClick = (event) => {
        if (shouldUseDefaultNavigation(event)) return;

        event.preventDefault();

        if (document.startViewTransition) {
            document.startViewTransition(() => {
                navigate(targetPath);
            });
            return;
        }

        navigate(targetPath);
    };

    return (
        <section className={styles.root}>
            <form className={cardClassName} onSubmit={handleSubmit}>
                <AccountIllustration />
                <div className={styles.formPanel}>
                    <div className={styles.header}>
                        <div className={styles.icon} aria-hidden="true">
                            <KitIcon name={isRegister ? 'spark' : 'user'} size={24} />
                        </div>
                        <Badge tone="accent">{isRegister ? 'Регистрация' : 'Авторизация'}</Badge>
                        <h1>{isRegister ? 'Создать аккаунт' : 'Войти в Lumen'}</h1>
                        <p>
                            {isRegister
                                ? 'Создайте профиль, чтобы сохранять эмоциональные записи и получать персональные рекомендации.'
                                : 'Авторизуйтесь, чтобы перейти к личным записям, истории состояния и настройкам профиля.'}
                        </p>
                    </div>

                    <div className={styles.fields}>
                        {isRegister && (
                            <Input
                                label="Имя"
                                placeholder="Анна"
                                autoComplete="name"
                                size="lg"
                                iconLeft={<KitIcon name="user" />}
                            />
                        )}
                        <Input
                            label="Почта"
                            type="email"
                            placeholder="name@example.com"
                            autoComplete="email"
                            size="lg"
                            iconLeft={<KitIcon name="mail" />}
                        />
                        <Input
                            label="Пароль"
                            type="password"
                            placeholder="Введите пароль"
                            autoComplete={isRegister ? 'new-password' : 'current-password'}
                            size="lg"
                            iconLeft={<KitIcon name="lock" />}
                            action={<KitIcon name="eye" size={15} />}
                        />
                    </div>

                    {!isRegister && (
                        <div className={styles.options}>
                            <Checkbox label="Запомнить меня" />
                            <a href="#restore">Забыли пароль?</a>
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
                </div>
            </form>
        </section>
    );
}

export default function AccountPage({ mode = 'profile' }) {
    if (mode === 'profile') return <ProfileAccount />;

    return <AuthAccess mode={mode} />;
}
