import { Input } from '../Input';
import { Kbd } from '../Kbd';
import { KitIcon } from '../Icon';
import styles from './CommandPalette.module.css';

const DEFAULT_COMMANDS = ['Создать компонент', 'Открыть токены', 'Скопировать импорт'];

export function CommandPalette({ commands = DEFAULT_COMMANDS, variant = 'default' }) {
    return (
        <div
            className={[styles.root, styles[variant]].filter(Boolean).join(' ')}
            role="dialog"
            aria-label="Палитра команд">
            <Input iconLeft={<KitIcon name="search" />} placeholder="Найти действие" variant="command" />
            <div className={styles.list}>
                {commands.map((command) => (
                    <button key={command} type="button">
                        <KitIcon name="command" />
                        <span>{command}</span>
                        <Kbd>Ctrl K</Kbd>
                    </button>
                ))}
            </div>
        </div>
    );
}
