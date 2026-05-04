import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Button, KitIcon, Navbar } from '../../shared/ui/kit';
import styles from './AppShell.module.css';

const THEME_STORAGE_KEY = 'app_theme';

const navItems = [
    { label: 'Мои эмоции', to: '/', end: true },
    { label: 'Рекомендации', to: '/recommendations' },
    { label: 'Компоненты', to: '/ui-kit' },
    { label: 'Тестирования', to: '/testing' },
    { label: 'Бенчмарк', to: '/benchmark' },
];

function getInitialTheme() {
    if (typeof window === 'undefined') return 'light';
    return localStorage.getItem(THEME_STORAGE_KEY) || 'light';
}

export function AppShell({ isAuth = false }) {
    const [theme, setTheme] = useState(getInitialTheme);
    const location = useLocation();
    const navigate = useNavigate();
    const isUIKitPage = location.pathname.startsWith('/ui-kit');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(THEME_STORAGE_KEY, theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
    };

    const links = navItems.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end}>
            {item.label}
        </NavLink>
    ));

    const brand = (
        <>
            <div className={styles.logoMark} aria-hidden="true">
                <svg viewBox="0 0 64 64" focusable="false">
                    <defs>
                        <radialGradient id="logo-face" cx="34%" cy="28%" r="78%">
                            <stop offset="0%" stopColor="#f7eaff" />
                            <stop offset="52%" stopColor="#a772f4" />
                            <stop offset="100%" stopColor="#5630d1" />
                        </radialGradient>
                        <linearGradient id="logo-orbit" x1="8" y1="48" x2="56" y2="16">
                            <stop offset="0%" stopColor="#8d5af0" />
                            <stop offset="52%" stopColor="#d5bcff" />
                            <stop offset="100%" stopColor="#5127c9" />
                        </linearGradient>
                        <filter id="logo-soft-shadow" x="-30%" y="-30%" width="160%" height="160%">
                            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#7a47d8" floodOpacity=".24" />
                        </filter>
                    </defs>
                    <rect className={styles.logoTile} x="4" y="4" width="56" height="56" rx="15" />
                    <circle className={styles.logoHalo} cx="32" cy="32" r="21" />
                    <ellipse className={styles.logoOrbitMuted} cx="32" cy="32" rx="16" ry="24" transform="rotate(-23 32 32)" />
                    <ellipse className={styles.logoOrbitMain} cx="32" cy="32" rx="29" ry="12" transform="rotate(-31 32 32)" />
                    <path className={styles.logoOrbitDotted} d="M17 19c9-10 27-12 38-2" />
                    <circle className={styles.logoFace} cx="32" cy="33" r="15" />
                    <path className={styles.logoEye} d="M23 31c1.7 2.1 4.6 2.1 6.2 0" />
                    <path className={styles.logoEye} d="M35 31c1.7 2.1 4.6 2.1 6.2 0" />
                    <path className={styles.logoSmile} d="M27.4 38.2c2.7 3.2 7.2 3.2 9.8 0" />
                    <circle className={styles.logoPlanet} cx="49" cy="18" r="4.4" />
                    <circle className={styles.logoPlanetSmall} cx="15" cy="47" r="4" />
                </svg>
            </div>
            <strong className={styles.logoText}>Lumen</strong>
        </>
    );

    const actions = (
        <>
            <Button
                variant="ghost"
                size="lg"
                iconOnly
                iconLeft={<KitIcon name={theme === 'dark' ? 'sun' : 'moon'} size={24} />}
                aria-label={theme === 'dark' ? 'Включить светлую тему' : 'Включить темную тему'}
                title={theme === 'dark' ? 'Светлая тема' : 'Темная тема'}
                onClick={toggleTheme}
            />
            <Button
                variant="secondary"
                size="lg"
                iconOnly
                iconLeft={<KitIcon name="user" size={24} />}
                aria-label={isAuth ? 'Личный кабинет' : 'Войти'}
                title={isAuth ? 'Личный кабинет' : 'Войти'}
                onClick={() => navigate(isAuth ? '/account' : '/login')}
            />
        </>
    );

    return (
        <div className={styles.root}>
            <header className={styles.header}>
                <Navbar
                    variant="pill"
                    size="lg"
                    brand={brand}
                    links={links}
                    actions={actions}
                    ariaLabel="Навигация приложения"
                    className={styles.navbar}
                />
            </header>
            <main className={[styles.main, isUIKitPage ? styles.uiKitMain : ''].filter(Boolean).join(' ')}>
                <Outlet context={{ isAuth }} />
            </main>
        </div>
    );
}
