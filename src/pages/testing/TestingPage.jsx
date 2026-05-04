import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { NotFoundPage } from '../not-found';
import { Badge, Button, Input, KitIcon, Textarea } from '../../shared/ui/kit';
import styles from './TestingPage.module.css';
import { answerScale, getTestById, tests } from './testingData';

const CUSTOM_TESTS_STORAGE_KEY = 'lumen_custom_tests';
const TEST_MANAGER_ROLES = ['admin', 'doctor'];

function getCustomTests() {
    if (typeof window === 'undefined') return [];

    try {
        const parsed = JSON.parse(localStorage.getItem(CUSTOM_TESTS_STORAGE_KEY) || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function makeCustomTest({ title, code, questions }) {
    const fallbackCode = code || 'CUSTOM';
    const slug = fallbackCode
        .toLowerCase()
        .replace(/[^a-z0-9а-яё-]+/gi, '-')
        .replace(/^-+|-+$/g, '');

    return {
        id: `custom-${slug || Date.now()}`,
        code: fallbackCode.toUpperCase(),
        title,
        accent: 'Добавлен вручную',
        meta: `${questions.length} утверждений · ручной тест`,
        scale: '1 - совсем нет, 5 - полностью да',
        sourceNote: 'Тест добавлен вручную администратором или врачом.',
        description: 'Пользовательский опросник для сценариев, которые специалист добавляет без изменения кода приложения.',
        details: ['Ручной список вопросов', 'Единая 5-балльная шкала ответов', 'Можно использовать как основу будущей админ-панели'],
        questions,
    };
}

function AuthModal({ test, onClose }) {
    const navigate = useNavigate();

    if (!test) return null;

    return (
        <div className={styles.modalLayer} role="presentation" onMouseDown={onClose}>
            <section
                className={styles.modal}
                role="dialog"
                aria-modal="true"
                aria-labelledby="auth-required-title"
                onMouseDown={(event) => event.stopPropagation()}>
                <button className={styles.closeButton} type="button" aria-label="Закрыть" onClick={onClose}>
                    <KitIcon name="close" />
                </button>
                <div className={styles.modalIcon} aria-hidden="true">
                    <KitIcon name="lock" size={24} />
                </div>
                <Badge tone="accent">Требуется вход</Badge>
                <h2 id="auth-required-title">Авторизуйтесь, чтобы пройти {test.code}</h2>
                <p>
                    Мы сохраним результат в личном кабинете и сможем показать динамику после повторного прохождения.
                </p>
                <div className={styles.modalActions}>
                    <Button variant="gradient" gradient="radial" size="lg" iconRight={<KitIcon name="arrowRight" />} onClick={() => navigate('/login')}>
                        Войти
                    </Button>
                    <Button variant="secondary" size="lg" onClick={() => navigate('/register')}>
                        Зарегистрироваться
                    </Button>
                </div>
            </section>
        </div>
    );
}

function TestCard({ test, onStart }) {
    return (
        <article className={styles.testCard}>
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
            <Button
                className={styles.startButton}
                variant="gradient"
                gradient="radial"
                size="lg"
                iconRight={<KitIcon name="arrowRight" />}
                onClick={() => onStart(test)}>
                Пройти
            </Button>
        </article>
    );
}

function ManualTestPanel({ onAddTest }) {
    const [createdTitle, setCreatedTitle] = useState('');

    const handleSubmit = (event) => {
        event.preventDefault();

        const [titleField, codeField, questionsField] = event.currentTarget.elements;
        const questions = String(questionsField?.value || '')
            .split('\n')
            .map((question) => question.trim())
            .filter(Boolean);
        const test = onAddTest({
            title: String(titleField?.value || '').trim() || 'Новый тест',
            code: String(codeField?.value || '').trim(),
            questions: questions.length ? questions : ['Первый вопрос нового теста.'],
        });

        setCreatedTitle(test.title);
        event.currentTarget.reset();
    };

    return (
        <section className={styles.manualPanel}>
            <div className={styles.manualIntro}>
                <Badge tone="accent">Администратор или врач</Badge>
                <h2>Добавить тест вручную</h2>
                <p>
                    Заготовка для будущей панели: специалист сможет добавить название, инструкцию, шкалу ответов и список вопросов без изменения кода.
                </p>
            </div>
            <form className={styles.manualForm} onSubmit={handleSubmit}>
                <Input label="Название теста" placeholder="Например, шкала состояния после сессии" size="lg" />
                <Input label="Код" placeholder="Например, custom-01" size="lg" />
                <Textarea
                    label="Вопросы"
                    placeholder="Каждый вопрос с новой строки"
                    autoGrow
                    rows={4}
                    defaultValue={'Я понимаю свое текущее состояние.\nМне хватает поддержки в ближайшие дни.'}
                />
                <Button variant="secondary" size="lg" type="submit" iconRight={<KitIcon name="plus" />}>
                    Подготовить тест
                </Button>
                {createdTitle && <p className={styles.formNotice}>Тест «{createdTitle}» добавлен в список.</p>}
            </form>
        </section>
    );
}

function TestingLanding({ isAuth, canManageTests, initialPrompt, availableTests, onAddTest }) {
    const navigate = useNavigate();
    const [authPrompt, setAuthPrompt] = useState(initialPrompt || null);

    useEffect(() => {
        setAuthPrompt(initialPrompt || null);
    }, [initialPrompt]);

    const handleStart = (test) => {
        if (!isAuth) {
            setAuthPrompt(test);
            return;
        }

        navigate(`/testing/${test.id}`);
    };

    return (
        <section className={styles.root}>
            <div className={styles.hero}>
                <div className={styles.icon} aria-hidden="true">
                    <KitIcon name="check" size={26} />
                </div>
                <Badge tone="accent">Тесты</Badge>
                <h1>Тестирования</h1>
                <p>
                    Выберите опросник, чтобы получить структурированную картину состояния. Результаты будут полезны для личной динамики и работы со специалистом.
                </p>
            </div>

            <div className={styles.testingGrid}>
                {availableTests.map((test) => (
                    <TestCard key={test.id} test={test} onStart={handleStart} />
                ))}
            </div>

            {canManageTests && <ManualTestPanel onAddTest={onAddTest} />}
            <AuthModal test={authPrompt} onClose={() => setAuthPrompt(null)} />
        </section>
    );
}

function QuestionnairePage({ test }) {
    const scale = useMemo(() => {
        if (test.id === 'bds') {
            return answerScale.slice(0, 4).map((item, index) => ({
                ...item,
                label: ['Совсем нет', 'Немного', 'Довольно сильно', 'Очень сильно'][index],
            }));
        }

        return answerScale;
    }, [test.id]);

    return (
        <section className={styles.questionnaire}>
            <div className={styles.questionnaireHead}>
                <Link className={styles.backLink} to="/testing">
                    <KitIcon name="arrowLeft" size={16} />
                    Все тесты
                </Link>
                <Badge tone="accent">{test.code}</Badge>
                <h1>{test.title}</h1>
                <p>{test.description}</p>
                <span>{test.scale}</span>
                <small>{test.sourceNote}</small>
            </div>

            <form className={styles.questions}>
                {test.questions.map((question, index) => (
                    <fieldset className={styles.questionCard} key={question}>
                        <legend>
                            <span>{String(index + 1).padStart(2, '0')}</span>
                            {question}
                        </legend>
                        <div className={styles.scale} style={{ gridTemplateColumns: `repeat(${scale.length}, minmax(0, 1fr))` }}>
                            {scale.map((option) => (
                                <label key={option.value}>
                                    <input type="radio" name={`${test.id}-${index}`} value={option.value} />
                                    <span>{option.label}</span>
                                </label>
                            ))}
                        </div>
                    </fieldset>
                ))}
                <div className={styles.submitRow}>
                    <Button variant="gradient" gradient="radial" size="lg" iconRight={<KitIcon name="arrowRight" />}>
                        Завершить тест
                    </Button>
                </div>
            </form>
        </section>
    );
}

export default function TestingPage({ isAuth = false, userRole = null }) {
    const { testId } = useParams();
    const [customTests, setCustomTests] = useState(getCustomTests);
    const availableTests = useMemo(() => [...tests, ...customTests], [customTests]);
    const canManageTests = isAuth && TEST_MANAGER_ROLES.includes(userRole);
    const test = availableTests.find((item) => item.id === testId) || getTestById(testId);

    useEffect(() => {
        try {
            localStorage.setItem(CUSTOM_TESTS_STORAGE_KEY, JSON.stringify(customTests));
        } catch {
            // localStorage can be unavailable in private or restricted browser modes.
        }
    }, [customTests]);

    const handleAddTest = (draft) => {
        const customTest = makeCustomTest(draft);
        setCustomTests((currentTests) => [
            customTest,
            ...currentTests.filter((item) => item.id !== customTest.id),
        ]);
        return customTest;
    };

    if (testId && !test) return <NotFoundPage />;
    if (testId && isAuth && test) return <QuestionnairePage test={test} />;

    return (
        <TestingLanding
            isAuth={isAuth}
            canManageTests={canManageTests}
            initialPrompt={testId && !isAuth ? test : null}
            availableTests={availableTests}
            onAddTest={handleAddTest}
        />
    );
}
