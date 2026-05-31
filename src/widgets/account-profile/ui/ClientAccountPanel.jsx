import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, KitIcon } from '../../../shared/ui/kit';
import { getTestStatusKey, hasCompletedTest } from '../../../entities/user';
import { formatResultDate } from '../../../features/testing';
import { apiCollaboratingSpecialists, apiTests } from '../../../shared/api';
import { ROUTES } from '../../../shared/routes';

function getStoredTestResult(testStatus, testId) {
    return testStatus?.[`${getTestStatusKey(testId)}Result`] || null;
}

function CompletedTestMiniCard({ test, result, styles }) {
    return (
        <article className={styles.testResultCard}>
            <div className={styles.testResultHead}>
                <div>
                    <span className={styles.testResultCode}>{test.code}</span>
                    <strong>{test.title}</strong>
                    <p>Дата прохождения: {formatResultDate(result?.completedAt)}</p>
                </div>
                <Badge tone="success">Пройден</Badge>
            </div>
            <div className={styles.testResultStats}>
                <span>{result?.scoreLabel || result?.score || 'Результат сохранён'}</span>
                <span>{result?.level || 'Интерпретация сохранена'}</span>
            </div>
        </article>
    );
}

function CollaborationMiniCard({ specialist, styles }) {
    return (
        <article className={styles.collaborationCard}>
            <div>
                <strong>{specialist.name}</strong>
                <p>{specialist.description || 'Специалист сопровождает текущую работу клиента.'}</p>
                {specialist.startedAt && (
                    <span className={styles.collaborationMeta}>
                        Сотрудничество с {formatResultDate(specialist.startedAt)}
                    </span>
                )}
            </div>
            <div className={styles.collaborationSide}>
                <Badge tone="success">Сотрудничаете</Badge>
                {specialist.experience && <span>стаж: {specialist.experience}</span>}
            </div>
        </article>
    );
}

export function ClientAccountPanel({
    testStatus,
    incomingRequest,
    setIncomingRequest,
    notify,
    styles,
}) {
    const [systemTests, setSystemTests] = useState([]);
    const [testsError, setTestsError] = useState('');
    const [collaboratingSpecialists, setCollaboratingSpecialists] = useState([]);
    const [collaborationsError, setCollaborationsError] = useState('');
    const completedTests = systemTests
        .filter((test) => hasCompletedTest(testStatus, test.id))
        .map((test) => ({ test, result: getStoredTestResult(testStatus, test.id) }));

    useEffect(() => {
        let active = true;
        apiTests()
            .then((items) => {
                if (!active) return;
                setSystemTests(items);
                setTestsError('');
            })
            .catch((error) => {
                if (!active) return;
                setSystemTests([]);
                setTestsError(error.message || 'Не удалось загрузить тесты.');
            });

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        let active = true;
        apiCollaboratingSpecialists()
            .then((items) => {
                if (!active) return;
                setCollaboratingSpecialists(items);
                setCollaborationsError('');
            })
            .catch((error) => {
                if (!active) return;
                setCollaboratingSpecialists([]);
                setCollaborationsError(error.message || 'Не удалось загрузить специалистов.');
            });

        return () => {
            active = false;
        };
    }, []);

    return (
        <div className={styles.rolePanel}>
            <section className={styles.accountSection}>
                <div className={styles.sectionHead}>
                    <div>
                        <h2>Пройденные тесты</h2>
                        <p>Результаты текущего пользователя, загруженные из системы.</p>
                    </div>
                    <Badge tone={completedTests.length > 0 ? 'success' : 'accent'}>
                        {completedTests.length > 0 ? `${completedTests.length} пройдено` : 'Нет результатов'}
                    </Badge>
                </div>
                {testsError ? (
                    <div className={styles.emptyState}>
                        <p>{testsError}</p>
                    </div>
                ) : completedTests.length > 0 ? (
                    <div className={styles.testResultList}>
                        {completedTests.map(({ test, result }) => (
                            <CompletedTestMiniCard key={test.id} test={test} result={result} styles={styles} />
                        ))}
                    </div>
                ) : (
                    <div className={styles.emptyState}>
                        <p>Пока для текущего пользователя нет пройденных тестов.</p>
                        <Link to={ROUTES.testing}>Перейти к тестам</Link>
                    </div>
                )}
            </section>
            <section className={styles.accountSection}>
                <div className={styles.sectionHead}>
                    <div>
                        <h2>Специалисты в работе</h2>
                        <p>Перечень специалистов, с которыми клиент уже сотрудничает.</p>
                    </div>
                    <Badge tone={collaboratingSpecialists.length > 0 ? 'success' : 'accent'}>
                        {collaboratingSpecialists.length > 0 ? `${collaboratingSpecialists.length} в работе` : 'Нет сотрудничества'}
                    </Badge>
                </div>
                {collaborationsError ? (
                    <div className={styles.emptyState}>
                        <p>{collaborationsError}</p>
                    </div>
                ) : collaboratingSpecialists.length > 0 ? (
                    <div className={styles.collaborationList}>
                        {collaboratingSpecialists.map((specialist) => (
                            <CollaborationMiniCard key={specialist.id || specialist.name} specialist={specialist} styles={styles} />
                        ))}
                    </div>
                ) : (
                    <div className={styles.emptyState}>
                        <p>Пока нет специалистов, с которыми клиент уже сотрудничает.</p>
                        <Link to={ROUTES.specialists}>Перейти к специалистам</Link>
                    </div>
                )}
            </section>
            <section className={styles.accountSection}>
                <div className={styles.sectionHead}>
                    <div>
                        <h2>Запрос специалиста</h2>
                        <p>Клиент может принять или отклонить входящую заявку на работу.</p>
                    </div>
                    <Badge tone={incomingRequest === 'accepted' ? 'success' : incomingRequest === 'declined' ? 'danger' : 'warning'}>
                        {incomingRequest === 'accepted' ? 'Принята' : incomingRequest === 'declined' ? 'Отклонена' : 'Ожидает решения'}
                    </Badge>
                </div>
                <div className={styles.roleCard}>
                    <div>
                        <strong>Марина Игоревна</strong>
                        <p>Предлагает сопровождение по теме горевания и эмоциональной саморегуляции.</p>
                    </div>
                    <div className={styles.roleActions}>
                        <Button
                            variant="success"
                            iconRight={<KitIcon name="check" />}
                            onClick={() => {
                                setIncomingRequest('accepted');
                                notify?.({
                                    tone: 'success',
                                    title: 'Запрос принят',
                                    description: 'Специалист добавлен в текущую работу.',
                                });
                            }}>
                            Принять
                        </Button>
                        <Button
                            variant="ghost"
                            iconRight={<KitIcon name="close" />}
                            onClick={() => {
                                setIncomingRequest('declined');
                                notify?.({
                                    tone: 'warning',
                                    title: 'Запрос отклонен',
                                    description: 'Заявка специалиста отклонена.',
                                });
                            }}>
                            Отклонить
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    );
}
