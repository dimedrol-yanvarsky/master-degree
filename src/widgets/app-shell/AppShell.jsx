import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Button, KitIcon, Navbar } from '../../shared/ui/kit';
import brandLogo from '../../shared/assets/brand-logo.png';
import { ROUTES } from '../../shared/routes';
import { getAccountInitials } from './model/accountInitials';
import { getPeopleNavLabel, navItems } from './model/navigation';
import styles from './AppShell.module.css';

export function AppShell({ isAuth = false, status = null, user = null }) {
    const location = useLocation();
    const navigate = useNavigate();
    const isUIKitPage = location.pathname.startsWith(ROUTES.uiKit);
    const isAccountActionActive = [ROUTES.account, ROUTES.login, ROUTES.register].includes(location.pathname);
    const accountInitials = isAuth ? getAccountInitials(user) : '';

    const links = navItems.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end}>
            {item.id === 'people' ? getPeopleNavLabel(status, isAuth) : item.label}
        </NavLink>
    ));

    const brand = (
        <>
            <div className={styles.logoMark} aria-hidden="true">
                <img className={styles.logoImage} src={brandLogo} alt="" draggable="false" />
            </div>
        </>
    );

    const actions = (
        <Button
            variant="secondary"
            size="lg"
            iconOnly
            className={[
                styles.accountAction,
                isAccountActionActive ? styles.accountActionActive : '',
            ].filter(Boolean).join(' ')}
            iconLeft={isAuth ? <span className={styles.accountInitials}>{accountInitials}</span> : <KitIcon name="user" size={22} />}
            aria-label={isAuth ? `Личный кабинет: ${accountInitials}` : 'Войти'}
            aria-current={isAccountActionActive ? 'page' : undefined}
            title={isAuth ? 'Личный кабинет' : 'Войти'}
            onClick={() => navigate(isAuth ? ROUTES.account : ROUTES.login)}
        />
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
