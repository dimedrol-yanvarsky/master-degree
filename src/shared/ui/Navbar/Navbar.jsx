import { cn } from '../_utils';
import { Badge } from '../Badge';
import { KitIcon } from '../Icon';
import styles from './Navbar.module.css';

const LINKS = [
    { label: 'Обзор', active: true },
    { label: 'Проекты' },
    { label: 'Отчеты' },
];

export function Navbar({ variant = 'default' }) {
    if (variant === 'wings') {
        return (
            <nav className={cn(styles.root, styles.wings)}>
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
        <nav className={cn(styles.root, styles[variant])}>
            <div className={styles.brand}><span>Н</span>Нексус</div>
            {variant === 'command' ? (
                <div className={styles.search}>
                    <KitIcon name="search" />
                    Поиск документов, команд и людей
                    <kbd>Ctrl K</kbd>
                </div>
            ) : (
                <div className={styles.links}>
                    {LINKS.map((link) => (
                        <a key={link.label} href={`#${link.label}`} className={link.active ? styles.active : ''}>
                            {link.label}
                        </a>
                    ))}
                </div>
            )}
            <div className={styles.right}><Badge tone="accent">В эфире</Badge></div>
        </nav>
    );
}
