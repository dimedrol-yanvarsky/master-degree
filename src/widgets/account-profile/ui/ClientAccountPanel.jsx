import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, KitIcon } from '../../../shared/ui/kit';
import { getTestStatusKey, hasCompletedTest } from '../../../entities/user';
import { formatResultDate } from '../../../features/testing';
import {
    apiCollaboratingSpecialists,
    apiCollaborationRequests,
    apiFinishCollaboration,
    apiRespondCollaborationRequest,
} from '../../../entities/collaboration';
import { apiMyAssignedRecommendations } from '../../../entities/recommendation';
import { apiTests } from '../../../entities/test';
import { ROUTES } from '../../../shared/routes';

function getStoredTestResult(testStatus, testId) {
    return testStatus?.[`${getTestStatusKey(testId)}Result`] || null;
}

function isPendingRequest(request) {
    return String(request.status || '').startsWith('pending');
}

function formatRecommendationCount(count) {
    const lastTwoDigits = Math.abs(count) % 100;
    const lastDigit = lastTwoDigits % 10;

    if (lastTwoDigits > 10 && lastTwoDigits < 20) return `${count} рекомендаций`;
    if (lastDigit === 1) return `${count} рекомендация`;
    if (lastDigit >= 2 && lastDigit <= 4) return `${count} рекомендации`;
    return `${count} рекомендаций`;
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

function CollaborationMiniCard({ specialist, styles, isUpdating, onFinish }) {
    const isFinished = specialist.status === 'finished';

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
                <Badge tone={isFinished ? 'accent' : 'success'}>{isFinished ? 'Завершено' : 'Сотрудничаете'}</Badge>
                {specialist.experience && <span>стаж: {specialist.experience}</span>}
                {!isFinished && (
                    <Button
                        variant="ghost"
                        size="sm"
                        iconRight={<KitIcon name="check" />}
                        disabled={isUpdating}
                        onClick={() => onFinish(specialist.id)}>
                        Завершить
                    </Button>
                )}
            </div>
        </article>
    );
}

function PersonalityTraits({ result, styles }) {
    const domains = Array.isArray(result?.domains) ? result.domains : [];
    if (domains.length === 0) return null;

    return (
        <section className={styles.accountSection}>
            <div className={styles.sectionHead}>
                <div>
                    <h2>Выявленные личностные особенности</h2>
                    <p>Данные из пройденного Big Five Inventory-2.</p>
                </div>
                <Badge tone="success">{domains.length} шкал</Badge>
            </div>
            <div className={styles.traitGrid}>
                {domains.map((domain) => (
                    <article key={domain.label}>
                        <span>{domain.label}</span>
                        <strong>{domain.score} из 5</strong>
                    </article>
                ))}
            </div>
        </section>
    );
}

function AssignedRecommendationCard({ recommendation, styles }) {
    return (
        <article className={styles.roleCard}>
            <div>
                <strong>{recommendation.specialistName || 'Специалист'}</strong>
                <p>{recommendation.text || 'Текст рекомендации не заполнен.'}</p>
                {recommendation.assignedAt && (
                    <span className={styles.collaborationMeta}>
                        Назначена {formatResultDate(recommendation.assignedAt)}
                    </span>
                )}
            </div>
            <Badge tone="success">Назначена</Badge>
        </article>
    );
}

function RequestCard({ request, styles, isUpdating, onRespond }) {
    const isIncoming = request.direction === 'incoming';
    const title = request.counterpartName || request.counterpartEmail || 'Специалист';

    return (
        <article className={styles.roleCard}>
            <div>
                <strong>{title}</strong>
                <p>{request.counterpartDescription || (isIncoming ? 'Предлагает начать совместную работу.' : 'Заявка отправлена специалисту.')}</p>
                {request.startedAt && (
                    <span className={styles.collaborationMeta}>
                        {isIncoming ? 'Получена' : 'Отправлена'} {formatResultDate(request.startedAt)}
                    </span>
                )}
            </div>
            <div className={styles.roleActions}>
                {isIncoming && request.canRespond ? (
                    <>
                        <Button
                            variant="success"
                            iconRight={<KitIcon name="check" />}
                            disabled={isUpdating}
                            onClick={() => onRespond(request.id, 'accepted')}>
                            Принять
                        </Button>
                        <Button
                            variant="ghost"
                            iconRight={<KitIcon name="close" />}
                            disabled={isUpdating}
                            onClick={() => onRespond(request.id, 'rejected')}>
                            Отклонить
                        </Button>
                    </>
                ) : (
                    <Badge tone="warning">Ожидает ответа</Badge>
                )}
            </div>
        </article>
    );
}

export function ClientAccountPanel({
    testStatus,
    notify,
    styles,
}) {
    const [systemTests, setSystemTests] = useState([]);
    const [testsError, setTestsError] = useState('');
    const [collaboratingSpecialists, setCollaboratingSpecialists] = useState([]);
    const [collaborationsError, setCollaborationsError] = useState('');
    const [requests, setRequests] = useState([]);
    const [requestsError, setRequestsError] = useState('');
    const [assignedRecommendations, setAssignedRecommendations] = useState([]);
    const [assignedRecommendationsError, setAssignedRecommendationsError] = useState('');
    const [assignedRecommendationsLoading, setAssignedRecommendationsLoading] = useState(true);
    const [updatingRequestId, setUpdatingRequestId] = useState('');
    const [finishingCollaborationId, setFinishingCollaborationId] = useState('');
    const completedTests = systemTests
        .filter((test) => hasCompletedTest(testStatus, test.id))
        .map((test) => ({ test, result: getStoredTestResult(testStatus, test.id) }));
    const bfi2Result = getStoredTestResult(testStatus, 'bfi-2');
    const pendingRequests = requests.filter(isPendingRequest);
    const incomingRequests = pendingRequests.filter((request) => request.direction === 'incoming');

    const loadCollaborations = useCallback(() => {
        return apiCollaboratingSpecialists()
            .then((items) => {
                setCollaboratingSpecialists(items);
                setCollaborationsError('');
            })
            .catch((error) => {
                setCollaboratingSpecialists([]);
                setCollaborationsError(error.message || 'Не удалось загрузить специалистов.');
            });
    }, []);

    const loadRequests = useCallback(() => {
        return apiCollaborationRequests()
            .then((items) => {
                setRequests(items.filter(Boolean));
                setRequestsError('');
            })
            .catch((error) => {
                setRequests([]);
                setRequestsError(error.message || 'Не удалось загрузить заявки.');
            });
    }, []);

    const loadAssignedRecommendations = useCallback(() => {
        setAssignedRecommendationsLoading(true);
        return apiMyAssignedRecommendations()
            .then((items) => {
                setAssignedRecommendations(items);
                setAssignedRecommendationsError('');
            })
            .catch((error) => {
                setAssignedRecommendations([]);
                setAssignedRecommendationsError(error.message || 'Не удалось загрузить рекомендации специалиста.');
            })
            .finally(() => {
                setAssignedRecommendationsLoading(false);
            });
    }, []);

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
        loadCollaborations().finally(() => {
            if (!active) return;
        });
        loadRequests().finally(() => {
            if (!active) return;
        });
        loadAssignedRecommendations().finally(() => {
            if (!active) return;
        });

        return () => {
            active = false;
        };
    }, [loadCollaborations, loadRequests, loadAssignedRecommendations]);

    const handleRequestDecision = async (requestId, decision) => {
        setUpdatingRequestId(requestId);
        try {
            await apiRespondCollaborationRequest(requestId, decision);
            await Promise.all([loadRequests(), loadCollaborations()]);
            notify?.({
                tone: decision === 'accepted' ? 'success' : 'warning',
                title: decision === 'accepted' ? 'Заявка принята' : 'Заявка отклонена',
                description: decision === 'accepted'
                    ? 'Специалист добавлен в текущую работу.'
                    : 'Заявка специалиста отклонена.',
            });
        } catch (error) {
            notify?.({
                tone: 'danger',
                title: 'Не удалось обработать заявку',
                description: error.message || 'Попробуйте ещё раз.',
            });
        } finally {
            setUpdatingRequestId('');
        }
    };

    const handleFinishCollaboration = async (collaborationId) => {
        setFinishingCollaborationId(collaborationId);
        try {
            await apiFinishCollaboration(collaborationId);
            await loadCollaborations();
            notify?.({
                tone: 'success',
                title: 'Работа завершена',
                description: 'Специалист останется в истории сотрудничества.',
            });
        } catch (error) {
            notify?.({
                tone: 'danger',
                title: 'Не удалось завершить работу',
                description: error.message || 'Попробуйте ещё раз.',
            });
        } finally {
            setFinishingCollaborationId('');
        }
    };

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

            <PersonalityTraits result={bfi2Result} styles={styles} />

            <section className={styles.accountSection}>
                <div className={styles.sectionHead}>
                    <div>
                        <h2>Назначенные рекомендации</h2>
                        <p>Персональные шаги от специалистов, с которыми клиент сотрудничает.</p>
                    </div>
                    <Badge tone={assignedRecommendations.length > 0 ? 'success' : 'accent'}>
                        {assignedRecommendationsLoading ? 'Загрузка...' : formatRecommendationCount(assignedRecommendations.length)}
                    </Badge>
                </div>
                {assignedRecommendationsLoading ? (
                    <div className={styles.emptyState}>
                        <p>Загружаем назначенные рекомендации...</p>
                    </div>
                ) : assignedRecommendationsError ? (
                    <div className={styles.emptyState}>
                        <p>{assignedRecommendationsError}</p>
                    </div>
                ) : assignedRecommendations.length > 0 ? (
                    <div className={styles.roleGrid}>
                        {assignedRecommendations.map((recommendation) => (
                            <AssignedRecommendationCard
                                key={recommendation.id}
                                recommendation={recommendation}
                                styles={styles}
                            />
                        ))}
                    </div>
                ) : (
                    <div className={styles.emptyState}>
                        <p>Пока специалист не назначал персональные рекомендации.</p>
                    </div>
                )}
            </section>

            <section className={styles.accountSection}>
                <div className={styles.sectionHead}>
                    <div>
                        <h2>Специалисты в работе</h2>
                        <p>Перечень специалистов, с которыми клиент сотрудничает сейчас или сотрудничал раньше.</p>
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
                            <CollaborationMiniCard
                                key={specialist.id || specialist.name}
                                specialist={specialist}
                                styles={styles}
                                isUpdating={finishingCollaborationId === specialist.id}
                                onFinish={handleFinishCollaboration}
                            />
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
                        <h2>Заявки на сотрудничество</h2>
                        <p>Входящие заявки от специалистов и исходящие обращения клиента.</p>
                    </div>
                    <Badge tone={incomingRequests.length > 0 ? 'warning' : pendingRequests.length > 0 ? 'accent' : 'success'}>
                        {pendingRequests.length > 0 ? `${pendingRequests.length} ожидает` : 'Нет заявок'}
                    </Badge>
                </div>
                {requestsError ? (
                    <div className={styles.emptyState}>
                        <p>{requestsError}</p>
                    </div>
                ) : pendingRequests.length > 0 ? (
                    <div className={styles.roleGrid}>
                        {pendingRequests.map((request) => (
                            <RequestCard
                                key={request.id}
                                request={request}
                                styles={styles}
                                isUpdating={updatingRequestId === request.id}
                                onRespond={handleRequestDecision}
                            />
                        ))}
                    </div>
                ) : (
                    <div className={styles.emptyState}>
                        <p>Сейчас нет входящих или исходящих заявок на сотрудничество.</p>
                        <Link to={ROUTES.specialists}>Найти специалиста</Link>
                    </div>
                )}
            </section>
        </div>
    );
}
