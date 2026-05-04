import { cn } from '../_utils';
import { Badge } from '../Badge';
import { KitIcon } from '../Icon';
import styles from './Navbar.module.css';

const LINKS = [
    { label: 'Обзор', active: true },
    { label: 'Проекты' },
    { label: 'Отчеты' },
];

const defaultBrand = (
    <>
        <span>Н</span>
        Нексус
    </>
);

function DefaultLinks() {
    return LINKS.map((link) => (
        <a key={link.label} href={`#${link.label}`} className={link.active ? styles.active : ''}>
            {link.label}
        </a>
    ));
}

export function Navbar({
    variant = 'default',
    brand = defaultBrand,
    links,
    actions,
    className = '',
    ariaLabel = 'Основная навигация',
    size = 'md',
}) {
    const hasCustomSlots = links !== undefined || actions !== undefined || brand !== defaultBrand;

    if (variant === 'wings' && !hasCustomSlots) {
        return (
            <nav className={cn(styles.root, styles.wings, styles[size], className)} aria-label={ariaLabel}>
                <div className={styles.wingLinks}>
                    <a href="#a">Работа</a>
                    <a href="#b" className={styles.active}>Кейсы</a>
                </div>
                <div className={styles.wingsBrand}>Север</div>
                <div className={styles.wingLinks}>
                    <a href="#c">Лаборатория</a>
                    <a href="#d">Контакты</a>
                </div>
            </nav>
        );
    }

    return (
        <nav className={cn(styles.root, styles[variant], styles[size], className)} aria-label={ariaLabel}>
            <div className={styles.brand}>{brand}</div>
            {variant === 'command' && links === undefined ? (
                <div className={styles.search}>
                    <KitIcon name="search" />
                    Поиск документов, команд и людей
                    <kbd>Ctrl K</kbd>
                </div>
            ) : (
                <div className={styles.links}>
                    {links ?? <DefaultLinks />}
                </div>
            )}
            <div className={styles.actions}>
                {actions ?? <Badge tone="accent">В эфире</Badge>}
            </div>
        </nav>
    );
}
