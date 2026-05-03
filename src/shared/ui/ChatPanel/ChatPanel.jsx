import { Avatar } from '../Avatar';
import { Badge } from '../Badge';
import { Button } from '../Button';
import { Input } from '../Input';
import { KitIcon } from '../Icon';
import styles from './ChatPanel.module.css';

const presets = {
    ai: {
        title: 'ИИ-ассистент',
        messages: [
            ['assistant', 'Я собрал критичные замечания и сгруппировал их по компонентам.'],
            ['user', 'Покажи только то, что блокирует релиз.'],
            ['assistant', 'Блокеры: графики, мастер, сравнение изменений и темная тема для таблиц.'],
        ],
        suggestions: ['Сформировать чеклист', 'Показать изменения', 'Открыть графики'],
    },
    support: {
        title: 'Чат поддержки',
        messages: [
            ['assistant', 'Здравствуйте! Я вижу, что импорт токенов завершился с предупреждением.'],
            ['user', 'Какие токены конфликтуют?'],
            ['assistant', 'Три значения радиуса отличаются от текущей темы.'],
        ],
        suggestions: ['Исправить автоматически', 'Скачать отчет'],
    },
    compact: {
        title: 'Мини-чат',
        messages: [
            ['assistant', 'Готово: 8 компонентов обновлены.'],
            ['user', 'Запусти проверку темы.'],
        ],
        suggestions: ['Светлая', 'Темная'],
    },
};

export function ChatPanel({ variant = 'default' }) {
    const preset = presets[variant] || presets.ai;

    return (
        <section className={[styles.root, styles[variant]].filter(Boolean).join(' ')}>
            <header className={styles.header}>
                <div>
                    <strong>{preset.title}</strong>
                    <span>3 сообщения · ответ в реальном времени</span>
                </div>
                <Badge tone="success">Онлайн</Badge>
            </header>
            <div className={styles.messages}>
                {preset.messages.map(([type, text], index) => (
                    <div key={`${type}-${index}`} className={type === 'user' ? styles.user : styles.assistant}>
                        {type !== 'user' && <Avatar name="UI-кит" size="sm" variant="gradient" />}
                        <p>{text}</p>
                    </div>
                ))}
            </div>
            <div className={styles.suggestions}>
                {preset.suggestions.map((suggestion) => <button key={suggestion} type="button">{suggestion}</button>)}
            </div>
            <div className={styles.compose}>
                <Input placeholder="Напишите сообщение" variant="filled" />
                <Button iconOnly iconLeft={<KitIcon name="arrowRight" />} aria-label="Отправить" />
            </div>
        </section>
    );
}
