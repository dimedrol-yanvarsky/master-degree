import { useState } from 'react';
import { Input, KitIcon } from '../../../shared/ui/kit';
import styles from './PasswordInput.module.css';

export function PasswordInput({ actionLabel = 'Показать пароль', ...props }) {
    const [isVisible, setIsVisible] = useState(false);
    const label = isVisible ? 'Скрыть пароль' : actionLabel;

    return (
        <Input
            {...props}
            type={isVisible ? 'text' : 'password'}
            action={(
                <button
                    className={styles.visibilityButton}
                    type="button"
                    aria-label={label}
                    aria-pressed={isVisible}
                    onClick={() => setIsVisible((value) => !value)}>
                    <KitIcon name="eye" size={15} />
                </button>
            )}
        />
    );
}
