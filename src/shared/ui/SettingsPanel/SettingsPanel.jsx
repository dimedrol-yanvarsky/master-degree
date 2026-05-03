import { Toggle } from '../Toggle';
import styles from './SettingsPanel.module.css';

export function SettingsPanel() {
    const rows = [
        ['Уведомления', 'Системные события и важные изменения'],
        ['Безопасность', 'Двухфакторная защита и активные сессии'],
        ['Интеграции', 'Вебхуки, API-ключи и экспорт'],
    ];

    return (
        <section className={styles.root}>
            {rows.map(([title, description], index) => (
                <div key={title} className={styles.row}>
                    <div>
                        <strong>{title}</strong>
                        <span>{description}</span>
                    </div>
                    <Toggle aria-label={title} defaultChecked={index !== 2} />
                </div>
            ))}
        </section>
    );
}
