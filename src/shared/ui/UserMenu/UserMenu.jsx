import { useState } from 'react';
import { Avatar } from '../Avatar';
import { Badge } from '../Badge';
import { Button } from '../Button';
import { KitIcon } from '../Icon';
import { cn } from '../_utils';
import styles from './UserMenu.module.css';

export function UserMenu({ variant = 'default' }) {
    const [open, setOpen] = useState(true);
    const isCommand = variant === 'command';

    return (
        <div className={cn(styles.root, styles[variant])}>
            <button type="button" className={styles.trigger} onClick={() => setOpen((value) => !value)}>
                <Avatar name="Анна Петрова" size="sm" variant="gradient" />
                <span>
                    <strong>Анна Петрова</strong>
                    {variant !== 'compact' && <small>Продуктовый дизайнер</small>}
                </span>
                <KitIcon name="chevron" size={14} />
            </button>

            {open && (
                <div className={styles.popover}>
                    {variant === 'profile' && (
                        <div className={styles.profileHead}>
                            <Avatar name="Анна Петрова" size="lg" variant="gradient" />
                            <div>
                                <strong>Анна Петрова</strong>
                                <span>anna@studio.dev</span>
                            </div>
                            <Badge tone="success">Онлайн</Badge>
                        </div>
                    )}
                    {isCommand && <div className={styles.search}><KitIcon name="search" /> Найти действие</div>}
                    <button type="button"><KitIcon name="user" /> Профиль <span>Ctrl P</span></button>
                    <button type="button"><KitIcon name="bell" /> Уведомления <Badge tone="warning">3</Badge></button>
                    <button type="button"><KitIcon name="settings" /> Настройки <span>Ctrl ,</span></button>
                    <div className={styles.divider} />
                    <Button variant="ghost" size="sm" fullWidth iconLeft={<KitIcon name="close" />}>Выйти</Button>
                </div>
            )}
        </div>
    );
}
