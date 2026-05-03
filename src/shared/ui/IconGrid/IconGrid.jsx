import { KitIcon } from '../Icon';
import { cn } from '../_utils';
import styles from './IconGrid.module.css';

const DEFAULT_ICONS = [
    'search', 'plus', 'check', 'close', 'menu', 'chevron', 'settings', 'filter',
    'user', 'bell', 'mail', 'lock', 'eye', 'shield', 'home', 'calendar',
    'clock', 'folder', 'file', 'download', 'upload', 'edit', 'trash', 'copy',
    'link', 'command', 'spark', 'warning', 'info', 'help', 'trend', 'chart',
    'table', 'database', 'terminal', 'code', 'layers', 'grid', 'image', 'graph',
    'arrowLeft', 'arrowRight', 'play', 'pause', 'refresh', 'heart', 'star',
];

const ICON_LABELS = {
    search: 'Поиск',
    plus: 'Добавить',
    check: 'Готово',
    close: 'Закрыть',
    menu: 'Меню',
    chevron: 'Стрелка',
    settings: 'Настройки',
    filter: 'Фильтр',
    user: 'Пользователь',
    bell: 'Уведомления',
    mail: 'Почта',
    lock: 'Замок',
    eye: 'Просмотр',
    shield: 'Защита',
    home: 'Домой',
    calendar: 'Календарь',
    clock: 'Время',
    folder: 'Папка',
    file: 'Файл',
    download: 'Скачать',
    upload: 'Загрузить',
    edit: 'Редактировать',
    trash: 'Удалить',
    copy: 'Копировать',
    link: 'Ссылка',
    command: 'Команда',
    spark: 'Акцент',
    warning: 'Предупреждение',
    info: 'Информация',
    help: 'Помощь',
    trend: 'Тренд',
    chart: 'График',
    table: 'Таблица',
    database: 'База данных',
    terminal: 'Терминал',
    code: 'Код',
    layers: 'Слои',
    grid: 'Сетка',
    image: 'Изображение',
    graph: 'Граф',
    arrowLeft: 'Назад',
    arrowRight: 'Вперед',
    play: 'Запуск',
    pause: 'Пауза',
    refresh: 'Обновить',
    heart: 'Избранное',
    star: 'Звезда',
};

export function IconGrid({ icons = DEFAULT_ICONS }) {
    return (
        <div className={styles.grid}>
            {icons.map((name) => (
                <button
                    key={name}
                    type="button"
                    className={cn(styles.tile, name === 'spark' && styles.highlight)}>
                    <span className={styles.glyph}>
                        <KitIcon name={name} size={22} />
                    </span>
                    <span className={styles.name}>{ICON_LABELS[name] || name}</span>
                </button>
            ))}
        </div>
    );
}
