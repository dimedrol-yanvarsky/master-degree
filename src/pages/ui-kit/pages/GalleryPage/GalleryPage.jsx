import {
    AuthCard,
    Avatar,
    AvatarStack,
    Badge,
    Breadcrumbs,
    Button,
    Card,
    ChatPanel,
    Checkbox,
    Coachmark,
    Code,
    ColorScale,
    CommandPalette,
    DataTable,
    DialogPreview,
    DiffView,
    Drawer,
    ErrorState,
    GraphPlot,
    IconGrid,
    Input,
    KanbanBoard,
    Kbd,
    KitIcon,
    Loader,
    MiniChart,
    MiniMap,
    Modal,
    Navbar,
    NetworkGraph,
    PricingCards,
    Progress,
    Radio,
    SegmentedControl,
    Select,
    SettingsPanel,
    SidebarNav,
    Skeleton,
    Slider,
    SpacingScale,
    StatCard,
    SteppedProgress,
    Tabs,
    Textarea,
    Timeline,
    Toast,
    Toggle,
    Tooltip,
    TreeView,
    TypographyScale,
    UserMenu,
    WizardSteps,
} from '../../../../shared/ui/kit';
import styles from './GalleryPage.module.css';

const PAGE_DESCRIPTIONS = {
    colors: 'Палитра показывает рабочие токены, семантические цвета и поведение оттенков в светлой и темной теме.',
    typography: 'Типографика задает иерархию интерфейса: заголовки, основной текст, подписи и моноширинные значения.',
    spacing: 'Отступы и радиусы помогают удерживать ритм компонентов без случайной плотности.',
    inputs: 'Поля ввода показывают очистку, иконки, префиксы, суффиксы, валидацию и длинный текст.',
    checkbox: 'Компоненты выбора собраны в сценарии вопроса: одиночный, множественный и промежуточный выбор.',
    radio: 'Радиокнопки поддерживают обычный, карточный и сегментный вид для разных плотностей формы.',
    toggle: 'Переключатели показывают бинарные настройки с разной визуальной силой и состоянием отключения.',
    select: 'Выпадающий список демонстрирует поиск, очистку, описания опций и клавиатурную навигацию.',
    tabs: 'Вкладки переключают содержимое, поддерживают отключенные состояния и разные модели навигации.',
    segmented: 'Сегментный переключатель подходит для выбора режима, плотности или представления данных.',
    'advanced-inputs': 'Сложные поля объединяют ввод, быстрые действия и пошаговые индикаторы.',
    icons: 'Иконки используются как функциональные маркеры действий и состояний, а не как декор.',
    cards: 'Карточки показывают контентные поверхности: метрики, действия, промо и краткие списки.',
    avatars: 'Аватары и бейджи помогают показать участников, статусы и группировку пользователей.',
    table: 'Таблицы поддерживают сортировку, выбор строк и разные плотности данных.',
    charts: 'Графики показывают тренды, цели, распределения и значения без искаженных пропорций.',
    graph: 'Графы демонстрируют связи, зависимости и древовидные структуры.',
    sliders: 'Слайдеры и прогресс показывают числовые решения, риски и дискретные шаги.',
    data: 'Карточки данных показывают ключевые метрики, риск, стек статусов и операционный прогресс.',
    timeline: 'Таймлайн раскрывает процесс как интерактивный список этапов.',
    kanban: 'Канбан показывает рабочий поток с приоритетами, прогрессом и выбором карточки.',
    navbars: 'Верхняя навигация демонстрирует разные модели меню и одинаковое выравнивание по левому краю.',
    breadcrumbs: 'Хлебные крошки показывают путь, этапы и быстрые действия с интерактивным выбором уровня.',
    sidebar: 'Боковая навигация включает обычный список, узкий режим и плотный вариант рабочей области.',
    palette: 'Палитра команд показывает быстрый поиск действий и клавиатурные подсказки.',
    tree: 'Дерево отображает иерархию проекта и группы вложенных элементов.',
    loaders: 'Индикаторы загрузки задают ожидание без лишнего визуального шума.',
    skeletons: 'Скелетон показывает загрузку макета до появления данных.',
    modal: 'Модальное окно демонстрирует разные структуры диалогов: обычную, разделенную и нижнюю панель.',
    tooltip: 'Подсказка добавляет короткую справку к действиям без перегрузки интерфейса.',
    toast: 'Уведомление показывает системные события, действия, прогресс и разные уровни важности.',
    dialogs: 'Диалоги помогают принять решение и показать последствия действия.',
    drawer: 'Выезжающая панель подходит для фильтров, быстрых настроек и мобильной нижней панели.',
    coachmark: 'Обучающая подсказка подсвечивает новую возможность и направляет пользователя к следующему действию.',
    'user-menu': 'Меню пользователя показывает профиль, быстрые действия, уведомления и вариант с поиском команд.',
    chat: 'Чат демонстрирует несколько сценариев общения: ИИ, поддержку и компактный режим.',
    kbd: 'Клавиши фиксируют сочетания и вторичные подсказки.',
    map: 'Карта показывает маршруты, тепловые зоны и логистику на одной схематичной поверхности.',
    diff: 'Сравнение показывает изменения кода в едином и разделенном представлении.',
    code: 'Код поддерживает подсветку JSX, копирование и варианты редактора, терминала и листинга.',
    auth: 'Авторизация демонстрирует форму входа с SSO, ключом доступа, 2FA и полезными состояниями.',
    settings: 'Настройки показывают управляемые строки параметров и переключатели.',
    wizard: 'Мастер ведет пользователя по шагам, показывает прогресс и чеклист готовности.',
    pricing: 'Тарифы включают карточки планов и сравнительный вариант с преимуществами.',
    error: 'Состояние ошибки помогает восстановиться после сбоя и выбрать следующий шаг.',
};

const GROUP_LABELS = {
    Foundations: 'Основа',
    Forms: 'Формы',
    Content: 'Контент',
    Navigation: 'Навигация',
    Feedback: 'Обратная связь',
    Special: 'Особые',
    'Page Patterns': 'Паттерны страниц',
};

const COLORS = [
    { name: 'Ирис', description: 'Основной акцент', shades: [
        { step: 100, value: 'oklch(96% 0.03 290)', hex: '#f5efff' },
        { step: 200, value: 'oklch(91% 0.06 290)', hex: '#e8d9ff' },
        { step: 300, value: 'oklch(84% 0.11 290)', hex: '#d4b8ff' },
        { step: 400, value: 'oklch(74% 0.18 290)', hex: '#b889ff' },
        { step: 500, value: 'oklch(64% 0.24 290)', hex: '#9658f5' },
        { step: 600, value: 'oklch(56% 0.25 290)', hex: '#7b35dc' },
        { step: 700, value: 'oklch(47% 0.22 290)', hex: '#6125b3' },
        { step: 800, value: 'oklch(38% 0.18 290)', hex: '#481c85' },
        { step: 900, value: 'oklch(29% 0.13 290)', hex: '#32165d' },
    ] },
    { name: 'Бирюза', description: 'Информация и данные', shades: [
        { step: 100, value: 'oklch(96% 0.04 195)', hex: '#e9fbff' },
        { step: 200, value: 'oklch(91% 0.07 195)', hex: '#c9f3fb' },
        { step: 300, value: 'oklch(84% 0.10 195)', hex: '#96e3ef' },
        { step: 400, value: 'oklch(74% 0.13 195)', hex: '#55c9db' },
        { step: 500, value: 'oklch(64% 0.13 195)', hex: '#1faabe' },
        { step: 600, value: 'oklch(54% 0.12 195)', hex: '#16889a' },
        { step: 700, value: 'oklch(45% 0.10 195)', hex: '#146c7a' },
        { step: 800, value: 'oklch(36% 0.08 195)', hex: '#13515b' },
        { step: 900, value: 'oklch(27% 0.06 195)', hex: '#0f3940' },
    ] },
    { name: 'Изумруд', description: 'Успех', shades: [
        { step: 100, value: 'oklch(95% 0.04 155)', hex: '#e9f9ef' },
        { step: 200, value: 'oklch(89% 0.08 155)', hex: '#c8f0d8' },
        { step: 300, value: 'oklch(80% 0.12 155)', hex: '#91dfb5' },
        { step: 400, value: 'oklch(70% 0.15 155)', hex: '#55c889' },
        { step: 500, value: 'oklch(60% 0.16 155)', hex: '#25aa63' },
        { step: 600, value: 'oklch(51% 0.15 155)', hex: '#19864d' },
        { step: 700, value: 'oklch(43% 0.13 155)', hex: '#14693d' },
        { step: 800, value: 'oklch(34% 0.10 155)', hex: '#104d30' },
        { step: 900, value: 'oklch(25% 0.07 155)', hex: '#0b3421' },
    ] },
    { name: 'Янтарь', description: 'Предупреждение', shades: [
        { step: 100, value: 'oklch(97% 0.05 80)', hex: '#fff6d7' },
        { step: 200, value: 'oklch(93% 0.09 80)', hex: '#ffe8a4' },
        { step: 300, value: 'oklch(88% 0.13 78)', hex: '#ffd66d' },
        { step: 400, value: 'oklch(82% 0.15 76)', hex: '#f9bd3c' },
        { step: 500, value: 'oklch(74% 0.15 74)', hex: '#df9c16' },
        { step: 600, value: 'oklch(63% 0.14 70)', hex: '#b97510' },
        { step: 700, value: 'oklch(52% 0.12 64)', hex: '#8e560f' },
        { step: 800, value: 'oklch(41% 0.10 58)', hex: '#673d10' },
        { step: 900, value: 'oklch(30% 0.08 54)', hex: '#44280d' },
    ] },
    { name: 'Коралл', description: 'Опасность и теплое действие', shades: [
        { step: 100, value: 'oklch(95% 0.04 25)', hex: '#fff0ec' },
        { step: 200, value: 'oklch(89% 0.08 25)', hex: '#ffd3c7' },
        { step: 300, value: 'oklch(80% 0.13 25)', hex: '#ffa899' },
        { step: 400, value: 'oklch(70% 0.18 25)', hex: '#ff7464' },
        { step: 500, value: 'oklch(59% 0.20 25)', hex: '#e84539' },
        { step: 600, value: 'oklch(50% 0.19 25)', hex: '#bd2f2b' },
        { step: 700, value: 'oklch(41% 0.16 25)', hex: '#912622' },
        { step: 800, value: 'oklch(33% 0.12 25)', hex: '#681f1c' },
        { step: 900, value: 'oklch(25% 0.09 25)', hex: '#451715' },
    ] },
    { name: 'Сланец', description: 'Нейтральный UI', shades: [
        { step: 100, value: 'oklch(96% 0.004 245)', hex: '#f1f3f6' },
        { step: 200, value: 'oklch(90% 0.006 245)', hex: '#dfe4ea' },
        { step: 300, value: 'oklch(82% 0.008 245)', hex: '#c5ccd7' },
        { step: 400, value: 'oklch(70% 0.010 245)', hex: '#9ea8b7' },
        { step: 500, value: 'oklch(58% 0.012 245)', hex: '#778292' },
        { step: 600, value: 'oklch(48% 0.014 245)', hex: '#5e6878' },
        { step: 700, value: 'oklch(38% 0.012 245)', hex: '#454d5b' },
        { step: 800, value: 'oklch(28% 0.010 245)', hex: '#2f3540' },
        { step: 900, value: 'oklch(19% 0.008 245)', hex: '#1d222b' },
    ] },
];

const tableColumns = [
    { key: 'project', label: 'Проект' },
    { key: 'status', label: 'Статус' },
    { key: 'owner', label: 'Владелец' },
    { key: 'date', label: 'Срок' },
    { key: 'score', label: 'Оценка', align: 'right' },
];

const tableRows = [
    { id: 1, project: 'UI-кит', status: <Badge tone="success">Готово</Badge>, owner: 'Дизайн', date: '12 мая', score: 92 },
    { id: 2, project: 'Загрузчик командной строки', status: <Badge tone="warning">Черновик</Badge>, owner: 'Платформа', date: '18 мая', score: 61 },
    { id: 3, project: 'Документация', status: <Badge tone="accent">Активно</Badge>, owner: 'DX', date: '22 мая', score: 78 },
    { id: 4, project: 'Графики', status: <Badge tone="danger">Риск</Badge>, owner: 'Данные', date: '28 мая', score: 44 },
];

const selectOptions = [
    { value: 'weekly', label: 'Еженедельно', description: 'Сводка каждый понедельник' },
    { value: 'daily', label: 'Ежедневно', description: 'Короткая лента важных событий' },
    { value: 'manual', label: 'Вручную', description: 'Только по запросу' },
    { value: 'paused', label: 'Пауза', description: 'Недоступный пример', disabled: true },
];

const tabsPreview = [
    { value: 'summary', label: 'Сводка', badge: '4', content: 'Краткий обзор с главным решением, уровнем риска и следующим действием.' },
    { value: 'activity', label: 'Активность', badge: '12', content: 'Последние обновления, смены владельца и заметки ревью находятся здесь.' },
    { value: 'files', label: 'Файлы', description: 'Экспорт', content: 'Здесь можно прикрепить договоры, скриншоты и сгенерированные спецификации.' },
    { value: 'archive', label: 'Архив', disabled: true },
];

const densityOptions = [
    { value: 'compact', label: 'Плотно', icon: <KitIcon name="menu" />, description: 'Плотные таблицы' },
    { value: 'cozy', label: 'Удобно', icon: <KitIcon name="spark" />, description: 'Обычное рабочее пространство', badge: 'ИИ' },
    { value: 'roomy', label: 'Свободно', icon: <KitIcon name="file" />, description: 'Презентационный режим' },
];

function Section({ title, description, children, wide = false }) {
    return (
        <section className={wide ? styles.sectionWide : styles.section}>
            <h2 className="section-title">{title}</h2>
            {description && <p className={styles.description}>{description}</p>}
            {children}
        </section>
    );
}

function DemoCard({ label, description, children }) {
    return (
        <div className="demo-card">
            <div className="demo-card-label">{label}</div>
            {description && <p className={styles.cardDescription}>{description}</p>}
            {children}
        </div>
    );
}

function Foundations({ type }) {
    if (type === 'colors') return <Section title="Шкала токенов" wide><ColorScale colors={COLORS} /></Section>;
    if (type === 'typography') return <Section title="Типографика" wide><TypographyScale /></Section>;
    if (type === 'spacing') {
        return <div className={styles.twoColumn}><DemoCard label="Отступы"><SpacingScale /></DemoCard><DemoCard label="Радиусы"><div className={styles.radiiGrid}>{['--r-xs', '--r-sm', '--r-md', '--r-lg', '--r-xl', '--r-full'].map(token => <div key={token}><span style={{ borderRadius: 'var(' + token + ')' }} /><code>{token}</code></div>)}</div></DemoCard></div>;
    }
    return null;
}

function Forms({ type }) {
    if (type === 'inputs') {
        return <div className={styles.twoColumn}>
            <DemoCard label="С очисткой"><Input label="Название проекта" placeholder="Продуктовый дашборд" hint="Ясные состояния фокуса и валидации." defaultValue="Доска исследования" clearable required /></DemoCard>
            <DemoCard label="Префикс и суффикс"><Input variant="filled" label="Адрес рабочей области" prefix="/" suffix=".app" placeholder="design-system" meta="URL" /></DemoCard>
            <DemoCard label="Поиск команд"><Input variant="command" iconLeft={<KitIcon name="search" />} placeholder="Поиск компонентов" clearable loading /></DemoCard>
            <DemoCard label="Тон валидации"><Input tone="success" label="Канал релиза" defaultValue="стабильный" hint="Семантические тона показывают статус до отправки." /></DemoCard>
            <DemoCard label="Быстрое редактирование"><Input variant="inline" label="Заголовок на месте" defaultValue="Спецификация без названия" clearable /></DemoCard>
            <DemoCard label="Многострочное поле"><Textarea variant="paper" label="Бриф" placeholder="Опишите сценарий..." defaultValue="Улучшить состояния, варианты и клавиатурную обратную связь." maxLength={140} showCount autoGrow /></DemoCard>
        </div>;
    }
    if (type === 'checkbox') return <Section title="Пример вопроса" wide><div className={styles.questionGrid}><div className={styles.questionCard}><h3>Выберите один ответ</h3><p>Какую стратегию валидации форма должна использовать по умолчанию?</p><div className={styles.optionStack}><Radio name="validation" label="Проверять при потере фокуса" variant="card" defaultChecked /><Radio name="validation" label="Проверять при отправке" variant="card" /><Radio name="validation" label="Проверять во время ввода" variant="card" /></div></div><div className={styles.questionCard}><h3>Выберите несколько ответов</h3><p>Какие состояния полей должны быть видны в галерее компонентов?</p><div className={styles.optionStack}><Checkbox label="По умолчанию и наведение" variant="card" defaultChecked /><Checkbox label="Фокус и клавиатура" variant="card" defaultChecked /><Checkbox label="Ошибка, успех, отключено" variant="tile" indeterminate /><Checkbox label="Загрузка" variant="card" /></div></div></div></Section>;
    if (type === 'radio') return <Section title="Варианты радиокнопок"><div className={styles.stack}><Radio name="plan" label="Старт" defaultChecked /><Radio name="plan" label="Карточка команды" variant="card" /><Radio name="plan" label="Корпоративный сегмент" variant="segment" /></div></Section>;
    if (type === 'toggle') return <Section title="Варианты переключателей"><div className="demo-row"><Toggle label="Обычный" defaultChecked /><Toggle label="Питание" variant="power" defaultChecked /><Toggle label="Разделенный" variant="split" /><Toggle label="Отключен" disabled /></div></Section>;
    if (type === 'select') return <div className={styles.twoColumn}><DemoCard label="С поиском"><Select searchable clearable label="Частота отчетов" options={selectOptions} defaultValue="weekly" hint="Введите текст для фильтрации, используйте стрелки и Enter для выбора." /></DemoCard><DemoCard label="Тональный"><Select variant="tonal" label="Приоритет" options={selectOptions} defaultValue="daily" /></DemoCard><DemoCard label="Стеклянный"><Select variant="glass" label="Окружение" options={selectOptions} defaultValue="manual" /></DemoCard><DemoCard label="Крупный тихий"><Select variant="quiet" size="lg" label="Релизный поток" options={selectOptions} placeholder="Выберите частоту" /></DemoCard></div>;
    if (type === 'tabs') return <Section title="Вкладки"><div className={styles.stack}><Tabs variant="underline" tabs={tabsPreview} defaultValue="summary" /><Tabs variant="pill" tabs={tabsPreview} defaultValue="activity" renderPanel={false} /><Tabs variant="cards" tabs={tabsPreview} defaultValue="files" stretch /><Tabs variant="rail" tabs={tabsPreview} defaultValue="summary" /></div></Section>;
    if (type === 'segmented') return <Section title="Сегментный переключатель"><div className={styles.stack}><SegmentedControl variant="default" options={densityOptions} defaultValue="cozy" /><SegmentedControl variant="floating" options={densityOptions} defaultValue="compact" /><SegmentedControl variant="toolbar" options={densityOptions} defaultValue="roomy" /><SegmentedControl variant="cards" options={densityOptions} defaultValue="cozy" equal /></div></Section>;
    return <div className={styles.twoColumn}><DemoCard label="Композиция поля"><Input label="API-ключ" action={<Kbd>Ctrl</Kbd>} defaultValue="sk_live_hidden" /></DemoCard><DemoCard label="Пошаговый ввод"><SteppedProgress variant="cards" steps={['Данные', 'Проверка', 'Запуск']} current={1} /></DemoCard></div>;
}

function Content({ type }) {
    if (type === 'icons') return <Section title="Набор иконок" wide><IconGrid /></Section>;
    if (type === 'cards') return <Section title="Варианты карточек" wide><div className={styles.cardGrid}><Card title="Обычная карточка" description="Спокойная поверхность для коротких продуктовых сводок." mediaLabel="ОБЫЧНАЯ" footer={<><Badge tone="success">В эфире</Badge><Button size="sm" variant="secondary">Открыть</Button></>} /><Card variant="elevated" title="Карточка действия" description="Подъем подходит задаче с очевидным следующим шагом." footer={<><Badge tone="warning">2 шага</Badge><Button size="sm">Проверить</Button></>}><div className={styles.checkList}><span>Интерфейс готов</span><span>Копирование ожидает</span><span>Владелец назначен</span></div></Card><Card variant="spotlight" title="Акцентная карточка" description="Темная панель для промо, предупреждений или приоритетных состояний." mediaLabel="ФИЧА" footer={<><Badge tone="accent" appearance="glass">Фокус</Badge><Button size="sm" variant="secondary">Детали</Button></>} /><Card variant="metric" title="Карточка метрики" description="92%" footer={<><span className={styles.deltaGood}>+12% за неделю</span><Button size="sm" variant="ghost">Изучить</Button></>}><div className={styles.sparkline}>{[42, 48, 51, 64, 70, 84, 92].map(value => <span key={value} style={{ height: value + '%' }} />)}</div></Card></div></Section>;
    if (type === 'avatars') return <div className={styles.twoColumn}><DemoCard label="Варианты аватаров"><div className="demo-row"><Avatar name="Анна Петрова" size="xs" /><Avatar name="Анна Петрова" size="sm" variant="solid" color="var(--accent)" /><Avatar name="Анна Петрова" variant="gradient" /><Avatar name="Анна Петрова" size="lg" variant="ring" /><Avatar name="Анна Петрова" size="xl" /></div></DemoCard><DemoCard label="Бейджи и стек"><div className="demo-row"><AvatarStack users={[{ name: 'Анна', variant: 'gradient' }, { name: 'Борис', variant: 'solid', color: 'var(--success-500)' }, { name: 'Дарья', variant: 'ring' }]} /><Badge dot>Нейтрально</Badge><Badge tone="accent" appearance="glass" dot>Стекло</Badge><Badge tone="danger" appearance="outline">Опасность</Badge></div></DemoCard></div>;
    if (type === 'table') return <Section title="Таблица данных" description="Три режима таблицы: выбор строк, аналитическая шапка и компактная плотность для рабочих экранов." wide><div className={styles.stack}><DataTable caption="Очередь проектов" columns={tableColumns} rows={tableRows} variant="zebra" sortable selectable /><DataTable caption="Рейтинг аналитики" columns={tableColumns} rows={tableRows} variant="analytics" sortable /><DataTable caption="Компактный статус" columns={tableColumns.slice(0, 4)} rows={tableRows} variant="compact" density="sm" /></div></Section>;
    if (type === 'charts') return <Section title="Графики" description="Каждый график сохраняет стабильное соотношение сторон и показывает метрику, тренд, цель или распределение." wide><div className={styles.chartGrid}><MiniChart title="Недельное использование" subtitle="Столбцы со значениями при наведении" values={[32, 48, 28, 72, 58, 86, 64, 92]} unit="%" /><MiniChart title="Конверсия" subtitle="Целевая линия и областной тренд" variant="area" target={72} values={[22, 38, 34, 52, 70, 66, 82, 78]} unit="%" /><MiniChart title="Задержка" subtitle="Линия с точками и целевым порогом" variant="line" target={64} values={[81, 72, 69, 64, 58, 52, 49]} unit="мс" /><MiniChart title="Покрытие" subtitle="Доля выполненного объема" variant="donut" values={[18, 26, 52, 78]} /><MiniChart title="Распределение трафика" subtitle="Сегментированное распределение" variant="stacked" values={[38, 26, 22, 14]} segments={[{ label: 'Веб', value: 38 }, { label: 'API', value: 26 }, { label: 'Командная строка', value: 22 }, { label: 'Документы', value: 14 }]} /></div></Section>;
    if (type === 'graph') return <Section title="Графы" description="Графы показывают зависимости, математические функции и деревья в горизонтальном и вертикальном направлении." wide><GraphSection /></Section>;
    if (type === 'sliders') return <Section title="Слайдеры и прогресс" description="Слайдеры используют точное позиционирование ползунка, отдельный цвет для риска и реальные отметки степпера." wide><div className={styles.controlShowcase}><div className={styles.controlPanel}><h3>Элементы решения</h3><Slider label="Уверенность" defaultValue={68} marks={[{ value: 0, label: 'Низко' }, { value: 50, label: 'Средне' }, { value: 100, label: 'Высоко' }]} /><Slider label="Риск" variant="meter" defaultValue={42} marks={[{ value: 0, label: 'Безопасно' }, { value: 50, label: 'Следить' }, { value: 100, label: 'Стоп' }]} /><Slider label="Шаги" variant="stepped" min={1} max={5} step={1} defaultValue={3} suffix="/5" marks={[{ value: 1, label: '1' }, { value: 2, label: '2' }, { value: 3, label: '3' }, { value: 4, label: '4' }, { value: 5, label: '5' }]} /></div><div className={styles.controlPanel}><h3>Состояния прогресса</h3><Progress label="Заполнение профиля" value={68} variant="ribbon" showValue /><Progress label="Синхронизация" value={84} variant="pulse" showValue /><Progress label="Индикатор риска" value={42} variant="meter" showValue /><Progress label="Чеклист" value={60} variant="segmented" tone="success" showValue /></div></div></Section>;
    if (type === 'data') return <Section title="Карточки данных" description="Первая метрика оставлена базовой, остальные карточки показывают стековые состояния и разные типы операционных метрик." wide><div className={styles.statsGrid}><StatCard label="Компоненты" value="42" delta="+12%" variant="accent" tone="primary" description="Базовая карточка с метрикой библиотеки." trend="7 новых" /><StatCard label="Основной стек" value="86%" delta="+8%" variant="stack" tone="primary" description="Основной стек для ключевого прогресса." meta="Релиз" /><StatCard label="Стек успеха" value="24" delta="+6" variant="stack" tone="success" description="Стек успеха для завершенных задач." meta="Готово" /><StatCard label="Стек предупреждения" value="3" delta="-2" variant="stack" tone="warning" description="Стек предупреждения для рисков и просрочек." meta="Риск" /></div></Section>;
    if (type === 'timeline') return <Section title="Таймлайн" description="Этапы кликабельны: активный шаг подсвечивается, завершенные шаги получают отдельное состояние." wide><Timeline variant="cards" items={[{ title: 'Выделить интерфейс', description: 'Проверить пропсы, состояния и ограничения компонента.', badge: 'Готово', tone: 'success', done: true, meta: '09:40' }, { title: 'Собрать галерею', description: 'Показать компонент в сценарии, а не в вакууме.', badge: 'Активно', tone: 'accent', meta: '11:10' }, { title: 'Подготовить документацию', description: 'Добавить описание, граничные случаи и пример импорта.', badge: 'Далее', tone: 'warning', meta: '13:20' }]} /></Section>;
    if (type === 'kanban') return <Section title="Канбан" description="Карточки выбираются, показывают приоритет, прогресс и срок, поэтому компонент выглядит как рабочий инструмент." wide><KanbanBoard columns={[{ title: 'Бэклог', tone: 'neutral', cards: [{ title: 'Состояния выбора', description: 'Поиск, очистка и отключенные варианты.', priority: 'P2', progress: '34%' }, { title: 'Клавиатура дерева', description: 'Навигация стрелками и уровни доступности.', priority: 'P3', progress: '18%' }] }, { title: 'В работе', tone: 'accent', cards: [{ title: 'Макеты модального окна', description: 'Разделенная, панельная и обычная структуры.', priority: 'P1', progress: '68%', tone: 'accent' }, { title: 'Пересборка графиков', description: 'Фикс пропорций и информативности.', priority: 'P1', progress: '82%', tone: 'warning' }] }, { title: 'Готово', tone: 'success', cards: [{ title: 'Варианты кнопок', description: 'Волна клика, фокус и семейство градиентов.', priority: 'Готово', progress: '100%', tone: 'success' }]}]} /></Section>;
    return null;
}

function GraphSection() {
    return <div className={styles.stack}><div><h3 className={styles.subhead}>Графы: узлы и связи</h3><p className={styles.description}>Зависимости и кластеры показывают направленные связи между узлами.</p><div className={styles.graphGrid}>{['dependency', 'decision', 'cluster'].map(variant => <NetworkGraph key={variant} variant={variant} />)}</div></div><div><h3 className={styles.subhead}>Деревья</h3><p className={styles.description}>Горизонтальное и вертикальное дерево подходят для иерархий, навигации и деревьев решений.</p><div className={styles.graphGrid}>{['treeVertical', 'treeHorizontal'].map(variant => <NetworkGraph key={variant} variant={variant} />)}</div></div><div><h3 className={styles.subhead}>Графики функций</h3><p className={styles.description}>Математические графики сохраняют пропорции и читаемую координатную сетку.</p><div className={styles.graphGrid}>{['sine', 'quadratic', 'logistic'].map(variant => <GraphPlot key={variant} variant={variant} />)}</div></div></div>;
}

function Navigation({ type }) {
    if (type === 'navbars') return <Section title="Варианты верхней навигации" description="Все навбары занимают одну ширину контейнера и стартуют от одной левой границы." wide><div className={styles.navbarStack}>{['default', 'pill', 'glass', 'bordered', 'dark', 'command', 'wings'].map(variant => <Navbar key={variant} variant={variant} />)}</div></Section>;
    if (type === 'breadcrumbs') return <Section title="Хлебные крошки" description="Варианты не просто рисуют путь: можно выбрать уровень, увидеть текущий шаг и выполнить быстрое действие."><div className={styles.stack}>{['slash', 'pill', 'steps', 'path'].map(variant => <Breadcrumbs key={variant} variant={variant} items={[{ label: 'Проекты' }, { label: 'UI-кит' }, { label: 'Компоненты', current: true }]} />)}</div></Section>;
    if (type === 'sidebar') return <Section title="Боковая навигация" description="Боковая навигация показывает обычный список, узкий режим и вариант рабочей области с бейджами и активным пунктом." wide><div className={styles.sidebarGrid}><SidebarNav title="Дизайн-система" items={[{ label: 'Обзор', icon: 'home', count: 4 }, { label: 'Компоненты', icon: 'layers', count: 42, tone: 'accent' }, { label: 'Токены', icon: 'settings' }, { label: 'Изменения', icon: 'file', count: 8, tone: 'warning' }]} /><SidebarNav variant="rail" items={[{ label: 'Домой', icon: 'home' }, { label: 'Слои', icon: 'layers' }, { label: 'Данные', icon: 'database' }, { label: 'Настройки', icon: 'settings' }]} /><SidebarNav variant="workspace" title="Рабочая область" items={[{ label: 'Входящие', icon: 'bell', count: 12, tone: 'warning' }, { label: 'План работ', icon: 'trend', count: 6, tone: 'success' }, { label: 'Файлы', icon: 'folder' }, { label: 'Безопасность', icon: 'shield' }]} /><SidebarNav variant="stacked" title="Разделы" items={[{ label: 'Основа', icon: 'grid', count: 3 }, { label: 'Паттерны', icon: 'layers', count: 5 }, { label: 'Обратная связь', icon: 'spark', count: 8 }]} /></div></Section>;
    if (type === 'palette') return <Section title="Палитра команд" wide><CommandPalette variant="spotlight" commands={['Создать компонент', 'Открыть токены', 'Скопировать импорт']} /></Section>;
    if (type === 'tree') return <Section title="Дерево"><TreeView nodes={[{ label: 'src', children: ['App.js', 'index.js'] }, { label: 'shared', children: ['ui', 'lib'] }, { label: 'package.json' }]} /></Section>;
    return null;
}

function Feedback({ type }) {
    if (type === 'loaders') return <Section title="Индикаторы загрузки"><div className="demo-row"><Loader /><Loader variant="orbit" /><Loader variant="ring" /><Loader variant="bars" /><Loader variant="bar" /></div></Section>;
    if (type === 'skeletons') return <DemoCard label="Скелетон макета"><div className={styles.skeletonStack}><Skeleton type="card" /><Skeleton style={{ width: '80%' }} /><Skeleton style={{ width: '55%' }} /></div></DemoCard>;
    if (type === 'modal') return <Section title="Модальное окно" description="Первый вариант оставлен классическим, а следующие отличаются структурой: разделенная информация и нижняя панель команд." wide><div className={styles.stack}><Modal title="Опубликовать изменения" eyebrow="Публикация" footer={<><Button variant="secondary">Отмена</Button><Button>Опубликовать</Button></>}>Проверьте видимость, участников и список изменений перед запуском.</Modal><Modal variant="split" title="Проверить релиз" eyebrow="Релиз" aside="4 компонента готовы к публикации" footer={<><Button variant="secondary">Назад</Button><Button>Подтвердить</Button></>}>Разделенное модальное окно отделяет контекст от основного действия и подходит для сложных подтверждений.</Modal><Modal variant="panel" title="Панель команд" eyebrow="Быстрое действие" footer={<Button>Запустить проверку</Button>}>Нижняя панель удобна для мобильных и коротких рабочих действий.</Modal></div></Section>;
    if (type === 'tooltip') return <Section title="Подсказка"><div className="demo-row"><Tooltip content="Скопировать импорт"><Button variant="secondary">Сверху</Button></Tooltip><Tooltip side="right" content="Открыть документацию"><Button variant="secondary">Справа</Button></Tooltip></div></Section>;
    if (type === 'toast') return <Section title="Уведомление" description="Уведомления показывают разные сценарии: успешное сохранение, синхронизацию с действием, прогресс и ошибку."><div className={styles.stack}><Toast title="Сохранено" description="Изменения темы применены." /><Toast tone="accent" variant="glass" title="Синхронизировано" description="Метаданные пакета обновлены." action="Открыть" /><Toast tone="warning" variant="timeline" title="Импорт выполняется" description="Идет синхронизация токенов." progress={64} /><Toast tone="danger" variant="ribbon" title="Ошибка" description="Токен реестра отсутствует." action="Исправить" /></div></Section>;
    if (type === 'dialogs') return <Section title="Диалоги" wide><div className={styles.stack}><DialogPreview /><DialogPreview tone="success" /><DialogPreview tone="danger" /></div></Section>;
    if (type === 'drawer') return <Section title="Выезжающая панель" wide><div className={styles.stack}><Drawer title="Фильтры"><Input label="Поиск" placeholder="Название" /><Select label="Статус" options={selectOptions} defaultValue="daily" /><Button fullWidth>Применить</Button></Drawer><Drawer side="bottom" title="Нижняя панель"><p>Компактные действия удобно размещать ближе к большим пальцам на мобильных.</p></Drawer></div></Section>;
    if (type === 'coachmark') return <Section title="Обучающая подсказка" wide><div className={styles.stack}><Coachmark title="Быстрая настройка">Подсветите новое действие и оставьте следующий шаг коротким.</Coachmark><Coachmark variant="beacon" title="Маяк">Мягкая пульсация привлекает внимание и не перетягивает интерфейс на себя.</Coachmark></div></Section>;
    return null;
}

function Special({ type }) {
    if (type === 'user-menu') return <Section title="Меню пользователя" description="Меню профиля раскрывается, показывает статусы, быстрые действия, уведомления и режим команд." wide><div className={styles.userMenuGrid}><UserMenu /><UserMenu variant="profile" /><UserMenu variant="command" /><UserMenu variant="compact" /></div></Section>;
    if (type === 'chat') return <Section title="Чат" description="Чат показывает разные сценарии: ИИ-ассистент, переписку поддержки и компактный режим." wide><div className={styles.chatGrid}><ChatPanel variant="ai" /><ChatPanel variant="support" /><ChatPanel variant="compact" /></div></Section>;
    if (type === 'kbd') return <Section title="Клавиши клавиатуры"><div className="demo-row"><Kbd>Ctrl</Kbd><Kbd variant="accent">K</Kbd><Kbd>Shift</Kbd><Kbd variant="dark">Enter</Kbd></div></Section>;
    if (type === 'map') return <Section title="Карта" description="Карта показывает несколько прикладных режимов: маршрут, тепловую карту и логистику." wide><div className={styles.stack}><MiniMap variant="route" /><MiniMap variant="heat" /><MiniMap variant="fleet" /></div></Section>;
    if (type === 'diff') return <Section title="Сравнение" description="Сравнение читается как инструмент ревью: есть заголовок файла, номера строк, единый и разделенный режимы." wide><div className={styles.stack}><DiffView /><DiffView variant="split" /></div></Section>;
    if (type === 'code') return <Section title="Код" description="Код показывает оформление редактора, режим терминала, подсветку JSX и кнопку копирования." wide><div className={styles.codeGrid}><Code filename="ButtonExample.jsx" code={`import { Button, GradientButton, Input } from '@your-scope/ui-kit';\n\nexport function Toolbar() {\n    return (\n        <form>\n            <Input label="Проект" placeholder="UI-кит" />\n            <Button>Сохранить</Button>\n            <GradientButton gradient="mesh">Обновить</GradientButton>\n        </form>\n    );\n}`} /><Code variant="terminal" filename="terminal" code={`npm run build\n\nСборка прошла успешно.\nРазмеры файлов после gzip:\n  68.4 kB  build/static/js/main.js`} /><Code variant="paper" filename="tokens.css" code={`:root {\n    --accent: oklch(60% 0.25 290);\n    --radius: var(--r-md);\n}`} /></div></Section>;
    return null;
}

function Patterns({ type }) {
    if (type === 'auth') return <Section title="Авторизация" description="Форма входа получила SSO, сценарий без пароля, чекбокс, восстановление пароля и понятную иерархию." wide><div className={styles.authGrid}><AuthCard /><AuthCard variant="split" /><AuthCard variant="passwordless" /></div></Section>;
    if (type === 'settings') return <Section title="Настройки" wide><SettingsPanel /></Section>;
    if (type === 'wizard') return <Section title="Мастер" description="Мастер показывает реальный прогресс, кликабельные действия и чеклист готовности без съехавших элементов." wide><div className={styles.stack}><WizardSteps steps={['Профиль', 'Доступ', 'Проверка']} current={1} /><WizardSteps variant="vertical" steps={['Бриф', 'Токены', 'Экспорт', 'Публикация']} current={2} /></div></Section>;
    if (type === 'pricing') return <Section title="Тарифы" description="Тарифы получили более сильную иерархию, список возможностей и сравнительный режим." wide><div className={styles.stack}><PricingCards /><PricingCards variant="comparison" /></div></Section>;
    if (type === 'error') return <Section title="Состояние ошибки"><ErrorState /></Section>;
    return null;
}

function renderContent(id, group) {
    if (group === 'Foundations') return <Foundations type={id} />;
    if (group === 'Forms') return <Forms type={id} />;
    if (group === 'Content') return <Content type={id} />;
    if (group === 'Navigation') return <Navigation type={id} />;
    if (group === 'Feedback') return <Feedback type={id} />;
    if (group === 'Special') return <Special type={id} />;
    if (group === 'Page Patterns') return <Patterns type={id} />;
    return null;
}

export function GalleryPage({ id, group, label }) {
    const content = renderContent(id, group);
    const description = PAGE_DESCRIPTIONS[id] || 'Живые примеры на общих токенах темы. Компоненты разделены по папкам с FSD-структурой и готовы к дальнейшему развитию.';
    const groupLabel = GROUP_LABELS[group] || group;

    return <div><div className="kit-head"><div className="kit-eyebrow">{groupLabel.toUpperCase()}</div><h1 className="kit-title">{label}</h1><p className="kit-lede">{description}</p></div>{content || <DemoCard label="В разработке" description="Маршрут зарегистрирован и готов для полноценной реализации компонента.">Компонент появится здесь после добавления сценариев, состояний и адаптивного поведения.</DemoCard>}</div>;
}
