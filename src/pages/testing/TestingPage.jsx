import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { NotFoundPage } from '../not-found';
import { Badge, Button, Input, KitIcon, Textarea } from '../../shared/ui/kit';
import { getTestStatusKey, hasCompletedTest } from '../../entities/user';
import styles from './TestingPage.module.css';
import { answerScale, getTestById, tests } from '../../entities/test';
import { getCustomTests, makeCustomTest, saveCustomTests, TEST_MANAGER_ROLES, buildTestResult, formatResultDate } from '../../features/testing';

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

function TestCard({ test, onStart, isCompleted = false }) {
    return (
        <article className={[styles.testCard, isCompleted ? styles.completedTestCard : ''].filter(Boolean).join(' ')}>
            <div className={styles.testTopline}>
                <span className={styles.testCode}>{test.code}</span>
                <Badge tone={isCompleted ? 'success' : 'accent'}>{isCompleted ? 'Пройден' : test.accent}</Badge>
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
                variant={isCompleted ? 'secondary' : 'gradient'}
                gradient="radial"
                size="lg"
                iconRight={<KitIcon name="arrowRight" />}
                onClick={() => onStart(test)}>
                {isCompleted ? 'Посмотреть результат' : 'Пройти'}
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

function TestingLanding({ isAuth, testStatus, canManageTests, initialPrompt, availableTests, onAddTest }) {
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
                    <TestCard
                        key={test.id}
                        test={test}
                        isCompleted={hasCompletedTest(testStatus, test.id)}
                        onStart={handleStart}
                    />
                ))}
            </div>

            {canManageTests && <ManualTestPanel onAddTest={onAddTest} />}
            <AuthModal test={authPrompt} onClose={() => setAuthPrompt(null)} />
        </section>
    );
}

function CompletedTestPage({ test, result }) {
    const answersCount = result?.answeredCount || result?.answers?.length || 0;

    return (
        <section className={styles.questionnaire}>
            <div className={styles.completedPanel}>
                <div className={styles.icon} aria-hidden="true">
                    <KitIcon name="check" size={26} />
                </div>
                <Badge tone="success">Тест пройден</Badge>
                <h1>{test.title}</h1>
                <p>{result?.summary || 'Результат сохранен для текущего пользователя.'}</p>
                <div className={styles.resultGrid}>
                    <article>
                        <span>Дата прохождения</span>
                        <strong>{formatResultDate(result?.completedAt)}</strong>
                    </article>
                    <article>
                        <span>{test.id === 'bds' ? 'Суммарный балл' : 'Средний балл'}</span>
                        <strong>{result?.scoreLabel || result?.score || 'Не рассчитан'}</strong>
                    </article>
                    <article>
                        <span>Интерпретация</span>
                        <strong>{result?.level || 'Результат сохранен'}</strong>
                    </article>
                    <article>
                        <span>Ответов сохранено</span>
                        <strong>{answersCount} из {test.questions.length}</strong>
                    </article>
                </div>
                {result?.answers?.length > 0 && (
                    <details className={styles.answersDetails}>
                        <summary>Показать выбранные ответы</summary>
                        <ol>
                            {result.answers.map((answer) => (
                                <li key={answer.questionIndex}>
                                    Вопрос {answer.questionIndex + 1}: вариант {answer.value}
                                </li>
                            ))}
                        </ol>
                    </details>
                )}
                {result?.domains?.length > 0 && (
                    <div className={styles.domainGrid}>
                        {result.domains.map((domain) => (
                            <article key={domain.label}>
                                <span>{domain.label}</span>
                                <strong>{domain.score} из 5</strong>
                            </article>
                        ))}
                    </div>
                )}
                <p className={styles.resultNote}>
                    Результат не является диагнозом и нужен для самонаблюдения и обсуждения со специалистом.
                </p>
                <div className={styles.resultActions}>
                    <Link className={styles.backLink} to="/testing">
                        <KitIcon name="arrowLeft" size={16} />
                        Вернуться к тестам
                    </Link>
                    <Link className={styles.backLink} to="/account">
                        Открыть личный кабинет
                        <KitIcon name="arrowRight" size={16} />
                    </Link>
                </div>
            </div>
        </section>
    );
}

function QuestionnairePage({ test, onComplete }) {
    const [answers, setAnswers] = useState({});
    const [formError, setFormError] = useState('');
    const scale = useMemo(() => {
        if (test.id === 'bds') {
            return answerScale.slice(0, 4).map((item, index) => ({
                ...item,
                label: ['Совсем нет', 'Немного', 'Довольно сильно', 'Очень сильно'][index],
            }));
        }

        return answerScale;
    }, [test.id]);
    const answeredCount = Object.keys(answers).length;
    const progress = Math.round((answeredCount / test.questions.length) * 100);

    const handleAnswerChange = (questionIndex, value) => {
        setAnswers((currentAnswers) => ({
            ...currentAnswers,
            [questionIndex]: Number(value),
        }));
        setFormError('');
    };

    const handleSubmit = (event) => {
        event.preventDefault();

        if (answeredCount !== test.questions.length) {
            setFormError('Ответьте на все вопросы, чтобы завершить тест.');
            return;
        }

        onComplete?.(test.id, answers, buildTestResult(test, answers));
    };

    const buildQuestionTitle = (question, index) => {
        const prefix = test.itemPrefix ? `${test.itemPrefix.replace(/\s*\.\.\.$/, '')} ` : '';
        return `${String(index + 1).padStart(2, '0')}. ${prefix}${question}`;
    };

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
                {test.instruction && <p>{test.instruction}</p>}
                <span>{test.scale}</span>
                <small>{test.sourceNote}</small>
                <div className={styles.progress} aria-label={`Отвечено ${answeredCount} из ${test.questions.length}`}>
                    <span style={{ width: `${progress}%` }} />
                </div>
                <strong className={styles.progressText}>{answeredCount} / {test.questions.length}</strong>
            </div>

            <form className={styles.questions} onSubmit={handleSubmit}>
                {test.questions.map((question, index) => (
                    <fieldset className={styles.questionCard} key={`${test.id}-${index}`}>
                        <legend>
                            <strong>{buildQuestionTitle(question, index)}</strong>
                        </legend>
                        <div className={styles.scale} style={{ '--scale-columns': scale.length }}>
                            {scale.map((option) => (
                                <label key={option.value}>
                                    <input
                                        type="radio"
                                        name={`${test.id}-${index}`}
                                        value={option.value}
                                        checked={answers[index] === option.value}
                                        onChange={() => handleAnswerChange(index, option.value)}
                                    />
                                    <span>{option.label}</span>
                                </label>
                            ))}
                        </div>
                    </fieldset>
                ))}
                {formError && (
                    <p className={styles.formError} role="alert">
                        {formError}
                    </p>
                )}
                <div className={styles.submitRow}>
                    <Button type="submit" variant="gradient" gradient="radial" size="lg" iconRight={<KitIcon name="arrowRight" />}>
                        Завершить тест
                    </Button>
                </div>
            </form>
        </section>
    );
}

export default function TestingPage({ isAuth = false, userRole = null, testStatus = null, onTestComplete }) {
    const { testId } = useParams();
    const [customTests, setCustomTests] = useState(getCustomTests);
    const availableTests = useMemo(() => [...tests, ...customTests], [customTests]);
    const canManageTests = isAuth && TEST_MANAGER_ROLES.includes(userRole);
    const test = availableTests.find((item) => item.id === testId) || getTestById(testId);

    useEffect(() => {
        saveCustomTests(customTests);
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
    if (testId && isAuth && test && hasCompletedTest(testStatus, test.id)) {
        return <CompletedTestPage test={test} result={testStatus?.[`${getTestStatusKey(test.id)}Result`]} />;
    }
    if (testId && isAuth && test) {
        return <QuestionnairePage test={test} onComplete={onTestComplete} />;
    }

    return (
        <TestingLanding
            isAuth={isAuth}
            testStatus={testStatus}
            canManageTests={canManageTests}
            initialPrompt={testId && !isAuth ? test : null}
            availableTests={availableTests}
            onAddTest={handleAddTest}
        />
    );
}
