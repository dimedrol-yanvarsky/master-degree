import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, KitIcon } from '../../../shared/ui/kit';
import { apiClientTestResults } from '../../../entities/test';
import { apiClientEmotionGraph, buildEmotionGraphPoints } from '../../../entities/emotion';
import {
    apiDeleteAssignedRecommendation,
    apiSpecialistAssignedRecommendations,
} from '../../../entities/recommendation';
import {
    apiCollaborationRequests,
    apiFinishCollaboration,
    apiRespondCollaborationRequest,
} from '../../../entities/collaboration';
import { formatDomainLabel, formatResultDate } from '../../../features/testing';
import { EmotionStateGraph } from '../../emotion-state-graph';

function isPendingRequest(request) {
    return String(request.status || '').startsWith('pending');
}

function formatAnswerCount(result) {
    const count = result?.answeredCount || result?.answers?.length || 0;
    if (!count) return 'Ответы не сохранены';
    return `${count} ответов`;
}

function ClientResultCard({ result, styles }) {
    return (
        <article className={styles.testResultCard}>
            <div className={styles.testResultHead}>
                <div>
                    <span className={styles.testResultCode}>{String(result.testCode || result.testId).toUpperCase()}</span>
                    <strong>{result.scoreLabel || result.score || 'Результат сохранен'}</strong>
                    <p>Дата прохождения: {formatResultDate(result.completedAt)}</p>
                </div>
                <Badge tone="success">{formatAnswerCount(result)}</Badge>
            </div>
            <div className={styles.testResultStats}>
                <span>{result.level || 'Интерпретация сохранена'}</span>
                <span>{result.summary || 'Краткое описание отсутствует'}</span>
            </div>
            {result.domains?.length > 0 && (
                <div className={styles.traitGrid}>
                    {result.domains.map((domain) => {
                        const label = formatDomainLabel(domain.label);

                        return (
                            <article key={label}>
                                <span>{label}</span>
                                <strong>{domain.score}</strong>
                            </article>
                        );
                    })}
                </div>
            )}
            {result.answers?.length > 0 && (
                <details className={styles.answerDetails}>
                    <summary>Выбранные ответы</summary>
                    <ol>
                        {result.answers.map((answer) => (
                            <li key={`${result.id}-${answer.questionIndex}`}>
                                Вопрос {answer.questionIndex + 1}: вариант {answer.value}
                            </li>
                        ))}
                    </ol>
                </details>
            )}
        </article>
    );
}

function RequestCard({ request, styles, isUpdating, onRespond }) {
    const isIncoming = request.direction === 'incoming';
    const title = request.counterpartName || request.counterpartEmail || 'Клиент';

    return (
        <article className={styles.roleCard}>
            <div>
                <strong>{title}</strong>
                <p>{request.counterpartDescription || (isIncoming ? 'Клиент хочет начать совместную работу.' : 'Заявка отправлена клиенту.')}</p>
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
                            variant="gradient"
                            gradient="radial"
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

function ClientInfoModal({
    mode,
    client,
    styles,
    clientDataLoading,
    clientDataError,
    graphPoints,
    clientResults,
    recommendations,
    recommendationsError,
    deletingAssignmentId,
    onDeleteAssignment,
    onClose,
}) {
    const title = {
        data: 'Данные клиента',
        recommendations: 'Персональные рекомендации',
        graph: 'Граф эмоций',
    }[mode] || 'Данные клиента';
    const clientName = client?.counterpartName || client?.counterpartEmail || 'Клиент';

    const renderContent = () => {
        if (!client) {
            return (
                <div className={styles.modalEmpty}>
                    <p>Клиент не выбран.</p>
                </div>
            );
        }

        if (mode === 'recommendations') {
            if (recommendationsError) {
                return (
                    <div className={styles.modalEmpty}>
                        <p>{recommendationsError}</p>
                    </div>
                );
            }

            if (recommendations.length === 0) {
                return (
                    <div className={styles.modalEmpty}>
                        <p>Назначенных рекомендаций для этого клиента пока нет.</p>
                    </div>
                );
            }

            return (
                <div className={styles.modalList}>
                    {recommendations.map((assignment) => (
                        <article className={styles.roleCard} key={assignment.id}>
                            <div>
                                <strong>Персональная рекомендация</strong>
                                <p>{assignment.text || 'Текст рекомендации не заполнен.'}</p>
                                {assignment.assignedAt && (
                                    <span className={styles.collaborationMeta}>
                                        Назначена {formatResultDate(assignment.assignedAt)}
                                    </span>
                                )}
                            </div>
                            <div className={styles.roleActions}>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    iconRight={<KitIcon name="trash" />}
                                    disabled={deletingAssignmentId === assignment.id}
                                    onClick={() => onDeleteAssignment(assignment)}>
                                    {deletingAssignmentId === assignment.id ? 'Удаляем...' : 'Удалить'}
                                </Button>
                            </div>
                        </article>
                    ))}
                </div>
            );
        }

        if (clientDataLoading) {
            return (
                <div className={styles.modalEmpty}>
                    <p>Загружаем данные клиента...</p>
                </div>
            );
        }

        if (clientDataError) {
            return (
                <div className={styles.modalEmpty}>
                    <p>{clientDataError}</p>
                </div>
            );
        }

        if (mode === 'graph') {
            return graphPoints.length > 0 ? (
                <EmotionStateGraph points={graphPoints} />
            ) : (
                <div className={styles.modalEmpty}>
                    <p>Данных для графа эмоций пока нет.</p>
                </div>
            );
        }

        return clientResults.length > 0 ? (
            <div className={styles.testResultList}>
                {clientResults.map((result) => (
                    <ClientResultCard key={result.id} result={result} styles={styles} />
                ))}
            </div>
        ) : (
            <div className={styles.modalEmpty}>
                <p>Сохраненных результатов тестов пока нет.</p>
            </div>
        );
    };

    return (
        <div className={styles.clientModalLayer} role="presentation" onMouseDown={onClose}>
            <section
                className={styles.clientModal}
                role="dialog"
                aria-modal="true"
                aria-labelledby="specialist-client-modal-title"
                onMouseDown={(event) => event.stopPropagation()}>
                <button className={styles.clientModalClose} type="button" aria-label="Закрыть" onClick={onClose}>
                    <KitIcon name="close" size={18} />
                </button>
                <div className={styles.clientModalHeader}>
                    <div>
                        <span>{clientName}</span>
                        <h2 id="specialist-client-modal-title">{title}</h2>
                        {client?.counterpartEmail && <p>{client.counterpartEmail}</p>}
                    </div>
                </div>
                <div className={styles.clientModalContent}>
                    {renderContent()}
                </div>
            </section>
        </div>
    );
}

export function SpecialistAccountPanel({ notify, styles }) {
    const [requests, setRequests] = useState([]);
    const [requestsError, setRequestsError] = useState('');
    const [updatingRequestId, setUpdatingRequestId] = useState('');
    const [finishingCollaborationId, setFinishingCollaborationId] = useState('');
    const [selectedCareClientId, setSelectedCareClientId] = useState('');
    const [clientModal, setClientModal] = useState(null);
    const [clientResults, setClientResults] = useState([]);
    const [clientGraphPoints, setClientGraphPoints] = useState([]);
    const [clientDataLoading, setClientDataLoading] = useState(false);
    const [clientDataError, setClientDataError] = useState('');
    const [assignedRecommendations, setAssignedRecommendations] = useState([]);
    const [assignedRecommendationsError, setAssignedRecommendationsError] = useState('');
    const [deletingAssignmentId, setDeletingAssignmentId] = useState('');

    const pendingRequests = useMemo(
        () => requests.filter(isPendingRequest),
        [requests]
    );
    const incomingRequests = useMemo(
        () => pendingRequests.filter((request) => request.direction === 'incoming'),
        [pendingRequests]
    );
    const acceptedClients = useMemo(
        () => requests.filter((request) => request.direction === 'accepted' || request.status === 'accepted'),
        [requests]
    );

    const selectedCareClient = useMemo(
        () => acceptedClients.find((request) => request.counterpartId === selectedCareClientId) || null,
        [acceptedClients, selectedCareClientId]
    );
    const graphPoints = useMemo(() => buildEmotionGraphPoints(clientGraphPoints), [clientGraphPoints]);
    const selectedClientRecommendations = useMemo(() => {
        if (!selectedCareClient) return [];
        return assignedRecommendations.filter((assignment) => assignment.clientId === selectedCareClient.counterpartId);
    }, [assignedRecommendations, selectedCareClient]);

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
        return apiSpecialistAssignedRecommendations()
            .then((items) => {
                setAssignedRecommendations(items);
                setAssignedRecommendationsError('');
            })
            .catch((error) => {
                setAssignedRecommendations([]);
                setAssignedRecommendationsError(error.message || 'Не удалось загрузить назначенные рекомендации.');
            });
    }, []);

    const loadClientData = useCallback((clientId) => {
        return Promise.all([apiClientTestResults(clientId), apiClientEmotionGraph(clientId)])
            .then(([results, graph]) => ({
                results: Array.isArray(results) ? results : [],
                graphPoints: Array.isArray(graph?.points) ? graph.points : [],
            }));
    }, []);

    useEffect(() => {
        loadRequests();
        loadAssignedRecommendations();
    }, [loadAssignedRecommendations, loadRequests]);

    useEffect(() => {
        if (acceptedClients.length === 0) {
            if (selectedCareClientId) setSelectedCareClientId('');
            return;
        }

        if (!selectedCareClientId) {
            setSelectedCareClientId(acceptedClients[0].counterpartId);
        }
        if (selectedCareClientId && !acceptedClients.some((request) => request.counterpartId === selectedCareClientId)) {
            setSelectedCareClientId(acceptedClients[0]?.counterpartId || '');
        }
    }, [acceptedClients, selectedCareClientId]);

    useEffect(() => {
        if (!selectedCareClientId) {
            setClientResults([]);
            setClientGraphPoints([]);
            setClientDataError('');
            setClientDataLoading(false);
            return undefined;
        }

        let active = true;
        setClientDataLoading(true);
        setClientDataError('');

        loadClientData(selectedCareClientId)
            .then(({ results, graphPoints: nextGraphPoints }) => {
                if (!active) return;
                setClientResults(results);
                setClientGraphPoints(nextGraphPoints);
            })
            .catch((error) => {
                if (!active) return;
                setClientResults([]);
                setClientGraphPoints([]);
                setClientDataError(error.message || 'Не удалось загрузить данные клиента.');
            })
            .finally(() => {
                if (active) setClientDataLoading(false);
            });

        return () => {
            active = false;
        };
    }, [loadClientData, selectedCareClientId]);

    const handleRequestDecision = async (requestId, decision) => {
        setUpdatingRequestId(requestId);
        try {
            await apiRespondCollaborationRequest(requestId, decision);
            await loadRequests();
            notify?.({
                tone: decision === 'accepted' ? 'success' : 'warning',
                title: decision === 'accepted' ? 'Заявка принята' : 'Заявка отклонена',
                description: decision === 'accepted'
                    ? 'Клиент добавлен в текущую работу.'
                    : 'Заявка клиента отклонена.',
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

    const handleFinishCollaboration = async (request) => {
        setFinishingCollaborationId(request.id);
        try {
            await apiFinishCollaboration(request.id);
            await loadRequests();
            if (selectedCareClientId === request.counterpartId) {
                setClientModal(null);
            }
            notify?.({
                tone: 'success',
                title: 'Работа завершена',
                description: 'Клиент убран из текущей работы, история сотрудничества сохранена.',
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

    const openClientModal = (request, mode) => {
        if (selectedCareClientId !== request.counterpartId) {
            setClientResults([]);
            setClientGraphPoints([]);
            setClientDataError('');
            setClientDataLoading(true);
        }
        setSelectedCareClientId(request.counterpartId);
        setClientModal(mode);
    };

    const handleDeleteAssignment = async (assignment) => {
        setDeletingAssignmentId(assignment.id);
        try {
            const items = await apiDeleteAssignedRecommendation(assignment.id);
            setAssignedRecommendations(items);
            notify?.({
                tone: 'warning',
                title: 'Рекомендация удалена',
                description: 'Персональная рекомендация больше не отображается у клиента.',
            });
        } catch (error) {
            notify?.({
                tone: 'danger',
                title: 'Не удалось удалить рекомендацию',
                description: error.message || 'Попробуйте ещё раз.',
            });
        } finally {
            setDeletingAssignmentId('');
        }
    };

    return (
        <div className={styles.rolePanel}>
            <section className={styles.accountSection}>
                <div className={styles.sectionHead}>
                    <div>
                        <h2>Клиенты и персональные рекомендации</h2>
                        <p>Клиенты в работе, назначенные рекомендации, результаты тестов и граф эмоционального состояния.</p>
                    </div>
                    <Badge tone={acceptedClients.length > 0 ? 'success' : 'accent'}>
                        {acceptedClients.length > 0 ? `${acceptedClients.length} в работе` : 'Нет клиентов'}
                    </Badge>
                </div>
                {requestsError ? (
                    <div className={styles.emptyState}>
                        <p>{requestsError}</p>
                    </div>
                ) : acceptedClients.length > 0 ? (
                    <div className={`${styles.roleGrid} ${styles.clientCareGrid}`}>
                        {acceptedClients.map((request) => (
                            <article className={`${styles.roleCard} ${styles.clientCareCard}`} key={request.id}>
                                <div>
                                    <strong>{request.counterpartName || request.counterpartEmail || 'Клиент'}</strong>
                                    <p>{request.counterpartEmail || 'План сопровождения активен.'}</p>
                                    {request.startedAt && (
                                        <span className={styles.collaborationMeta}>
                                            В работе с {formatResultDate(request.startedAt)}
                                        </span>
                                    )}
                                </div>
                                <div className={styles.roleActions}>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        iconRight={<KitIcon name="chart" />}
                                        onClick={() => openClientModal(request, 'data')}>
                                        Данные
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        iconRight={<KitIcon name="heart" />}
                                        onClick={() => openClientModal(request, 'recommendations')}>
                                        Персональные рекомендации
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        iconRight={<KitIcon name="graph" />}
                                        onClick={() => openClientModal(request, 'graph')}>
                                        Граф эмоций
                                    </Button>
                                    <Button
                                        className={styles.finishClientButton}
                                        variant="danger"
                                        size="sm"
                                        iconRight={<KitIcon name="check" />}
                                        disabled={finishingCollaborationId === request.id}
                                        onClick={() => handleFinishCollaboration(request)}>
                                        {finishingCollaborationId === request.id ? 'Завершаем...' : 'Завершить'}
                                    </Button>
                                </div>
                            </article>
                        ))}
                    </div>
                ) : (
                    <div className={styles.emptyState}>
                        <p>Пока нет клиентов с активным сотрудничеством.</p>
                    </div>
                )}
            </section>

            <section className={styles.accountSection}>
                <div className={styles.sectionHead}>
                    <div>
                        <h2>Заявки на сотрудничество</h2>
                        <p>Входящие заявки от клиентов и исходящие приглашения специалиста.</p>
                    </div>
                    {pendingRequests.length > 0 && (
                        <Badge tone={incomingRequests.length > 0 ? 'warning' : 'accent'}>
                            {`${pendingRequests.length} ожидает`}
                        </Badge>
                    )}
                </div>
                {requestsError ? (
                    <div className={styles.emptyState}>
                        <p>{requestsError}</p>
                    </div>
                ) : pendingRequests.length > 0 ? (
                    <div className={`${styles.roleGrid} ${styles.clientCareGrid}`}>
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
                    </div>
                )}
            </section>

            {clientModal && (
                <ClientInfoModal
                    mode={clientModal}
                    client={selectedCareClient}
                    styles={styles}
                    clientDataLoading={clientDataLoading}
                    clientDataError={clientDataError}
                    graphPoints={graphPoints}
                    clientResults={clientResults}
                    recommendations={selectedClientRecommendations}
                    recommendationsError={assignedRecommendationsError}
                    deletingAssignmentId={deletingAssignmentId}
                    onDeleteAssignment={handleDeleteAssignment}
                    onClose={() => setClientModal(null)}
                />
            )}
        </div>
    );
}
