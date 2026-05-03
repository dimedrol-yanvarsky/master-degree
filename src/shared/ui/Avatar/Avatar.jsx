import { useMemo } from 'react';
import { cn } from '../_utils';
import styles from './Avatar.module.css';

const DEFAULT_USERS = [
    { name: 'Анна Петрова', variant: 'gradient' },
    { name: 'Борис Ким', variant: 'solid', color: 'var(--success-500)' },
    { name: 'Дарья Ли', variant: 'ring' },
];

export function Avatar({ name = 'UI-кит', size = 'md', src, color, variant = 'default' }) {
    const initials = useMemo(() => {
        if (!name) return 'UI';
        return name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
    }, [name]);

    return (
        <span
            className={cn(styles.root, styles[size], styles[variant])}
            title={name}
            style={color ? { '--avatar-color': color } : undefined}>
            {src ? <img src={src} alt={name} /> : initials}
        </span>
    );
}

export function AvatarStack({ users = DEFAULT_USERS }) {
    return (
        <span className={styles.stack}>
            {users.map((user) => (
                <Avatar key={user.name} {...user} />
            ))}
        </span>
    );
}
