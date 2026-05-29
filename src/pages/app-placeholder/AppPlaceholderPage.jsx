import { Badge, KitIcon } from '../../shared/ui/kit';
import styles from './AppPlaceholderPage.module.css';

const copyByKind = {
    recommendations: {
        eyebrow: 'Будущий раздел',
        title: 'Рекомендации',
        description: 'Здесь появятся персональные сценарии поддержки на основе эмоциональных записей и динамики состояния.',
        icon: 'spark',
    },
    specialists: {
        eyebrow: 'Каталог',
        title: 'Специалисты',
        description: 'Здесь появится подборка психологов и консультантов, к которым можно будет обратиться за профессиональной поддержкой.',
        icon: 'heart',
    },
    reviews: {
        eyebrow: 'Обратная связь',
        title: 'Отзывы',
        description: 'Здесь появятся отзывы клиентов о работе со специалистами и качестве рекомендаций.',
        icon: 'star',
    },
    testing: {
        eyebrow: 'Тесты',
        title: 'Тестирования',
        description: 'Здесь будут психологические опросники, результаты прохождения и история изменений.',
        icon: 'check',
    },
    userAgreement: {
        eyebrow: 'Правовые условия',
        title: 'Пользовательское соглашение',
        description: 'Здесь будет размещен текст пользовательского соглашения, правила использования сервиса и условия обработки учетной записи.',
        icon: 'file',
    },
    benchmark: {
        eyebrow: 'Будущий раздел',
        title: 'Бенчмарк',
        description: 'Здесь появятся сравнительные метрики тестов, рекомендаций и динамики качества самонаблюдения.',
        icon: 'trend',
    },
};

const testingCards = [
    {
        code: 'BFI-2',
        title: 'Big Five Inventory-2',
        accent: 'Профиль личности',
        meta: '60 утверждений · примерно 5-7 минут',
        description: 'Опросник самооценки по модели Большой пятерки: экстраверсия, доброжелательность, добросовестность, негативная эмоциональность и открытость опыту.',
        details: ['5 доменов личности', '15 более точных граней', 'Подходит для базового профиля пользователя'],
    },
    {
        code: 'BDS',
        title: 'Breakup Distress Scale',
        accent: 'Эмоции при расставании',
        meta: '16 пунктов · шкала интенсивности переживаний',
        description: 'Шкала помогает бережно оценить выраженность переживаний после расставания: навязчивые мысли, одиночество, злость, боль, избегание напоминаний и трудность принятия.',
        details: ['Фокус на состоянии после разрыва', 'Ответы от "совсем нет" до "очень сильно"', 'Полезна для динамики восстановления'],
    },
];

function TestingContent() {
    return (
        <>
            <div className={styles.testingGrid}>
                {testingCards.map((test) => (
                    <article className={styles.testCard} key={test.code}>
                        <div className={styles.testTopline}>
                            <span className={styles.testCode}>{test.code}</span>
                            <Badge tone="accent">{test.accent}</Badge>
                        </div>
                        <h2>{test.title}</h2>
                        <p className={styles.testMeta}>{test.meta}</p>
                        <p>{test.description}</p>
                        <ul>
                            {test.details.map((detail) => (
                                <li key={detail}>{detail}</li>
                            ))}
                        </ul>
                    </article>
                ))}
            </div>
            <p className={styles.note}>
                Эти тесты не ставят диагноз и не заменяют консультацию специалиста. Они нужны как спокойный инструмент самонаблюдения и отслеживания динамики.
            </p>
        </>
    );
}

export default function AppPlaceholderPage({ kind = 'recommendations' }) {
    const page = copyByKind[kind] || copyByKind.recommendations;

    return (
        <section className={styles.root}>
            <div className={styles.intro}>
                <div className={styles.icon}>
                    <KitIcon name={page.icon} size={26} />
                </div>
                <Badge tone="accent">{page.eyebrow}</Badge>
                <h1>{page.title}</h1>
                <p>{page.description}</p>
            </div>
            {kind === 'testing' && <TestingContent />}
        </section>
    );
}
