import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Badge, Button, ErrorState, Input, KitIcon, Textarea } from '../../shared/ui/kit';
import { getTestStatusKey, hasCompletedTest } from '../../entities/user';
import styles from './TestingPage.module.css';
import { answerScale } from '../../entities/test';
import { getCustomTests, makeCustomTest, saveCustomTests, TEST_MANAGER_ROLES, buildTestResult, formatResultDate } from '../../features/testing';
import { apiTests } from '../../shared/api';

// Период блокировки повторного прохождения. Оставшееся время считается как разница
// между текущей датой и датой последнего прохождения теста.
const TEST_COOLDOWN_DAYS = {
    'bfi-2': 7,
    bds: 1,
};

function resolveScale(testOrId) {
    const testId = typeof testOrId === 'string' ? testOrId : testOrId?.id;
    if (Array.isArray(testOrId?.scaleOptions) && testOrId.scaleOptions.length > 0) {
        return testOrId.scaleOptions;
    }

    if (testId === 'bds') {
        return answerScale.slice(0, 4).map((item, index) => ({
            ...item,
            label: ['Совсем нет', 'Немного', 'Довольно сильно', 'Очень сильно'][index],
        }));
    }

    return answerScale;
}

function getStoredResult(testStatus, testId) {
    return testStatus?.[`${getTestStatusKey(testId)}Result`] || null;
}

function getRemainingCooldownDays(testId, completedAt) {
    const cooldown = TEST_COOLDOWN_DAYS[testId] ?? 0;
    if (!cooldown || !completedAt) return 0;

    const elapsedDays = Math.floor((Date.now() - new Date(completedAt).getTime()) / 86400000);
    return Math.max(0, cooldown - elapsedDays);
}

function pluralizeDays(count) {
    const mod10 = count % 10;
    const mod100 = count % 100;

    if (mod10 === 1 && mod100 !== 11) return 'день';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'дня';
    return 'дней';
}

function pluralizeQuestions(count) {
    const mod10 = count % 10;
    const mod100 = count % 100;

    if (mod10 === 1 && mod100 !== 11) return 'вопрос';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'вопроса';
    return 'вопросов';
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

function TestCard({ test, onStart, isCompleted = false, remainingDays = 0 }) {
    const isLocked = isCompleted && remainingDays > 0;

    return (
        <article className={[styles.testCard, isCompleted ? styles.completedTestCard : ''].filter(Boolean).join(' ')}>
            <div className={styles.testTopline}>
                <h2>{test.title}</h2>
                {isCompleted && <Badge tone="success">Пройден</Badge>}
            </div>
            <p className={styles.testMeta}>{test.meta}</p>
            <p>{test.description}</p>
            {isLocked ? (
                <p className={styles.lockNote}>
                    <KitIcon name="lock" size={15} />
                    Будет доступен через {remainingDays} {pluralizeDays(remainingDays)}
                </p>
            ) : (
                <Button
                    className={styles.startButton}
                    variant={isCompleted ? 'secondary' : 'gradient'}
                    gradient="radial"
                    size="lg"
                    iconRight={<KitIcon name="arrowRight" />}
                    onClick={() => onStart(test)}>
                    {isCompleted ? 'Пройти снова' : 'Пройти'}
                </Button>
            )}
        </article>
    );
}

function AttemptResultSummary({ test, result }) {
    if (result?.domains?.length > 0) {
        return (
            <div className={styles.attemptTraits}>
                {result.domains.map((domain) => (
                    <div className={styles.attemptTrait} key={domain.label}>
                        <span>{domain.label}</span>
                        <strong>{domain.score} из 5</strong>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className={styles.attemptLevel}>
            <div>
                <span>{test.id === 'bds' ? 'Суммарный балл' : 'Средний балл'}</span>
                <strong>{result?.scoreLabel || result?.score || 'Не рассчитан'}</strong>
            </div>
            <div>
                <span>Уровень состояния</span>
                <strong>{result?.level || 'Сохранён'}</strong>
            </div>
        </div>
    );
}

function CompletedAttemptCard({ test, result, onView }) {
    return (
        <article className={styles.attemptCard}>
            <div className={styles.attemptHead}>
                <div>
                    <span className={styles.attemptCode}>{test.code}</span>
                    <h3>{test.title}</h3>
                </div>
                <Badge tone="success">Пройден</Badge>
            </div>
            <p className={styles.attemptDate}>Дата прохождения: {formatResultDate(result?.completedAt)}</p>
            <AttemptResultSummary test={test} result={result} />
            <Button
                className={styles.attemptViewButton}
                variant="secondary"
                size="sm"
                iconRight={<KitIcon name="arrowRight" />}
                onClick={() => onView(test)}>
                Просмотреть результаты
            </Button>
        </article>
    );
}

function AttemptDetail({ test, result, onBack }) {
    const scale = resolveScale(test);
    const answerByIndex = new Map((result?.answers || []).map((answer) => [answer.questionIndex, answer.value]));

    return (
        <div className={styles.attemptDetail}>
            <button type="button" className={styles.backLink} onClick={onBack}>
                <KitIcon name="arrowLeft" size={16} />
                К списку тестов
            </button>
            <h2>{test.title}</h2>
            <p className={styles.attemptDate}>Дата прохождения: {formatResultDate(result?.completedAt)}</p>
            <AttemptResultSummary test={test} result={result} />
            <ol className={styles.answerReview}>
                {test.questions.map((question, index) => {
                    const value = answerByIndex.get(index);
                    const optionLabel = scale.find((option) => option.value === value)?.label;

                    return (
                        <li className={styles.answerReviewItem} key={`${test.id}-${index}`}>
                            <span className={styles.answerReviewQuestion}>{String(index + 1).padStart(2, '0')}. {question}</span>
                            <span className={styles.answerReviewValue}>
                                {value != null ? `${value} — ${optionLabel}` : 'Нет ответа'}
                            </span>
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}

function ResultsModal({ availableTests, testStatus, onClose }) {
    const [activeTestId, setActiveTestId] = useState(null);
    const completedTests = availableTests.filter((test) => hasCompletedTest(testStatus, test.id));
    const activeTest = completedTests.find((test) => test.id === activeTestId) || null;

    return (
        <div className={styles.modalLayer} role="presentation" onMouseDown={onClose}>
            <section
                className={[styles.modal, styles.resultsModal].join(' ')}
                role="dialog"
                aria-modal="true"
                aria-label="Пройденные тесты"
                onMouseDown={(event) => event.stopPropagation()}>
                <button className={styles.closeButton} type="button" aria-label="Закрыть" onClick={onClose}>
                    <KitIcon name="close" />
                </button>

                {activeTest ? (
                    <AttemptDetail
                        test={activeTest}
                        result={getStoredResult(testStatus, activeTest.id)}
                        onBack={() => setActiveTestId(null)}
                    />
                ) : (
                    <>
                        <Badge tone="accent">История прохождений</Badge>
                        <h2>Пройденные тесты</h2>
                        {completedTests.length > 0 ? (
                            <div className={styles.attemptList}>
                                {completedTests.map((test) => (
                                    <CompletedAttemptCard
                                        key={test.id}
                                        test={test}
                                        result={getStoredResult(testStatus, test.id)}
                                        onView={(target) => setActiveTestId(target.id)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <p className={styles.attemptEmpty}>
                                Пока нет пройденных тестов. Завершите тест — и он появится здесь вместе с ответами.
                            </p>
                        )}
                    </>
                )}
            </section>
        </div>
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

function TestingLanding({ isAuth, status, testStatus, canManageTests, initialPrompt, availableTests, testsLoading, testsError, onAddTest }) {
    const navigate = useNavigate();
    const [authPrompt, setAuthPrompt] = useState(initialPrompt || null);
    const [resultsOpen, setResultsOpen] = useState(false);
    const canViewResults = isAuth && (status === 'client' || status === 'specialist');

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
                <h1>Тестирования</h1>
                <p>
                    Выберите опросник, чтобы получить структурированную картину состояния. Результаты будут полезны для личной динамики и работы со специалистом.
                </p>
            </div>

            {canViewResults && (
                <div className={styles.landingToolbar}>
                    <Button variant="secondary" iconLeft={<KitIcon name="file" />} onClick={() => setResultsOpen(true)}>
                        Пройденные тесты
                    </Button>
                </div>
            )}

            {testsLoading && <p className={styles.attemptEmpty}>Загружаем тесты...</p>}
            {testsError && !testsLoading && <p className={styles.attemptEmpty}>{testsError}</p>}
            {!testsLoading && !testsError && availableTests.length === 0 && (
                <p className={styles.attemptEmpty}>В системе пока нет активных тестов.</p>
            )}
            {availableTests.length > 0 && (
                <div className={styles.testingGrid}>
                    {availableTests.map((test) => {
                        const isCompleted = hasCompletedTest(testStatus, test.id);
                        const remainingDays = isCompleted
                            ? getRemainingCooldownDays(test.id, getStoredResult(testStatus, test.id)?.completedAt)
                            : 0;

                        return (
                            <TestCard
                                key={test.id}
                                test={test}
                                isCompleted={isCompleted}
                                remainingDays={remainingDays}
                                onStart={handleStart}
                            />
                        );
                    })}
                </div>
            )}

            {canManageTests && <ManualTestPanel onAddTest={onAddTest} />}
            <AuthModal test={authPrompt} onClose={() => setAuthPrompt(null)} />
            {resultsOpen && (
                <ResultsModal
                    availableTests={availableTests}
                    testStatus={testStatus}
                    onClose={() => setResultsOpen(false)}
                />
            )}
        </section>
    );
}

function CompletedTestPage({ test, result, remainingDays = 0 }) {
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
                {remainingDays > 0 && (
                    <p className={styles.lockNote}>
                        <KitIcon name="lock" size={15} />
                        Повторное прохождение будет доступно через {remainingDays} {pluralizeDays(remainingDays)}
                    </p>
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
    const scale = useMemo(() => resolveScale(test), [test]);
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

    return (
        <section className={styles.questionnaire}>
            <div className={styles.questionnaireHead}>
                <Link className={styles.backLink} to="/testing">
                    <KitIcon name="arrowLeft" size={16} />
                    Все тесты
                </Link>
                <div className={styles.headTop}>
                    <span className={styles.headMeta}>{test.questions.length} {pluralizeQuestions(test.questions.length)}</span>
                </div>
                <h1>{test.title}</h1>
                <p>{test.description}</p>
                <div className={styles.progressDock}>
                    <div className={styles.progressInfo}>
                        <span className={styles.progressLabel}>Прогресс</span>
                        <strong className={styles.progressText}>{answeredCount} / {test.questions.length}</strong>
                    </div>
                    <div className={styles.progress} aria-label={`Отвечено ${answeredCount} из ${test.questions.length}`}>
                        <span style={{ width: `${progress}%` }} />
                    </div>
                    {test.scale && <span className={styles.scaleHint}>{test.scale}</span>}
                </div>
            </div>

            <form className={styles.questions} onSubmit={handleSubmit}>
                {test.questions.map((question, index) => {
                    const isAnswered = answers[index] !== undefined;

                    return (
                        <fieldset
                            className={[styles.questionCard, isAnswered ? styles.questionAnswered : ''].filter(Boolean).join(' ')}
                            key={`${test.id}-${index}`}>
                            <legend className={styles.questionLegend}>
                                <span className={styles.questionRow}>
                                    <span className={styles.questionNum} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                                    <span className={styles.questionText}>{question}</span>
                                </span>
                            </legend>
                            <div className={styles.scaleField}>
                                <div className={styles.scale}>
                                    {scale.map((option) => (
                                        <label className={styles.scaleOption} key={option.value} title={option.label}>
                                            <input
                                                className={styles.scaleInput}
                                                type="radio"
                                                name={`${test.id}-${index}`}
                                                value={option.value}
                                                checked={answers[index] === option.value}
                                                onChange={() => handleAnswerChange(index, option.value)}
                                            />
                                            <span className={styles.scaleMark} aria-hidden="true">{option.value}</span>
                                            <span className={styles.scaleSr}>{option.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </fieldset>
                    );
                })}
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

function TestNotFound() {
    const navigate = useNavigate();

    return (
        <section className={styles.questionnaire}>
            <ErrorState
                title="Страница не найдена"
                description="Такого раздела пока нет. Проверьте адрес или вернитесь к дневнику эмоций."
                actionLabel="Вернуться к эмоциям"
                onAction={() => navigate('/')}
            />
        </section>
    );
}

export default function TestingPage({ isAuth = false, userRole = null, status = null, testStatus = null, onTestComplete }) {
    const { testId } = useParams();
    const navigate = useNavigate();
    const [systemTests, setSystemTests] = useState([]);
    const [testsLoading, setTestsLoading] = useState(true);
    const [testsError, setTestsError] = useState('');
    const [customTests, setCustomTests] = useState(getCustomTests);
    const availableTests = useMemo(() => [...systemTests, ...customTests], [systemTests, customTests]);
    const canManageTests = isAuth && TEST_MANAGER_ROLES.includes(userRole);
    const test = availableTests.find((item) => item.id === testId) || null;

    useEffect(() => {
        let active = true;
        setTestsLoading(true);
        apiTests()
            .then((items) => {
                if (!active) return;
                setSystemTests(items);
                setTestsError('');
            })
            .catch((error) => {
                if (!active) return;
                setSystemTests([]);
                setTestsError(error.message || 'Не удалось загрузить тесты из системы.');
            })
            .finally(() => {
                if (active) setTestsLoading(false);
            });

        return () => {
            active = false;
        };
    }, []);

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

    if (testId && testsLoading) {
        return (
            <section className={styles.questionnaire}>
                <p className={styles.attemptEmpty}>Загружаем тесты...</p>
            </section>
        );
    }
    if (testId && testsError && !test) {
        return (
            <section className={styles.questionnaire}>
                <ErrorState
                    title="Тесты не загрузились"
                    description={testsError}
                    actionLabel="Вернуться к тестам"
                    onAction={() => navigate('/testing')}
                />
            </section>
        );
    }
    if (testId && !test) return <TestNotFound />;
    if (testId && isAuth && test && hasCompletedTest(testStatus, test.id)) {
        const result = getStoredResult(testStatus, test.id);
        const remainingDays = getRemainingCooldownDays(test.id, result?.completedAt);

        // Пока действует период блокировки — показываем результат; после него тест можно пройти снова.
        if (remainingDays > 0) {
            return <CompletedTestPage test={test} result={result} remainingDays={remainingDays} />;
        }
    }
    if (testId && isAuth && test) {
        return <QuestionnairePage test={test} onComplete={onTestComplete} />;
    }

    return (
        <TestingLanding
            isAuth={isAuth}
            status={status}
            testStatus={testStatus}
            canManageTests={canManageTests}
            initialPrompt={testId && !isAuth ? test : null}
            availableTests={availableTests}
            testsLoading={testsLoading}
            testsError={testsError}
            onAddTest={handleAddTest}
        />
    );
}
