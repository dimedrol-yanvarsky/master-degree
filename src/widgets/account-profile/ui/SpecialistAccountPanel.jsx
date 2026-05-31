import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, Input, KitIcon, Select } from '../../../shared/ui/kit';
import { apiClients } from '../../../entities/user';
import { apiClientTestResults } from '../../../entities/test';
import { apiClientEmotionGraph, buildEmotionGraphPoints } from '../../../entities/emotion';
import {
    apiAssignRecommendation,
    apiDeleteAssignedRecommendation,
    apiSpecialistAssignedRecommendations,
} from '../../../entities/recommendation';
import {
    apiCollaborationRequests,
    apiCreateCollaborationRequest,
    apiFinishCollaboration,
    apiRespondCollaborationRequest,
} from '../../../entities/collaboration';
import { formatResultDate } from '../../../features/testing';
import { EmotionStateGraph } from '../../emotion-state-graph';

function isPendingRequest(request) {
    return String(request.status || '').startsWith('pending');
}

function clientLabel(client) {
    return client.displayName || client.email || 'Клиент';
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
                    {result.domains.map((domain) => (
                        <article key={domain.label}>
                            <span>{domain.label}</span>
                            <strong>{domain.score}</strong>
                        </article>
                    ))}
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

export function SpecialistAccountPanel({ notify, styles }) {
    const [clients, setClients] = useState([]);
    const [requests, setRequests] = useState([]);
    const [clientsError, setClientsError] = useState('');
    const [requestsError, setRequestsError] = useState('');
    const [selectedClientId, setSelectedClientId] = useState('');
    const [assignedClientId, setAssignedClientId] = useState('');
    const [isSendingRequest, setIsSendingRequest] = useState(false);
    const [isAssigningRecommendation, setIsAssigningRecommendation] = useState(false);
    const [updatingRequestId, setUpdatingRequestId] = useState('');
    const [finishingCollaborationId, setFinishingCollaborationId] = useState('');
    const [selectedCareClientId, setSelectedCareClientId] = useState('');
    const [clientResults, setClientResults] = useState([]);
    const [clientGraphPoints, setClientGraphPoints] = useState([]);
    const [clientDataLoading, setClientDataLoading] = useState(false);
    const [clientDataError, setClientDataError] = useState('');
    const [assignedRecommendations, setAssignedRecommendations] = useState([]);
    const [assignedRecommendationsError, setAssignedRecommendationsError] = useState('');
    const [deletingAssignmentId, setDeletingAssignmentId] = useState('');

    const pendingRequests = requests.filter(isPendingRequest);
    const incomingRequests = pendingRequests.filter((request) => request.direction === 'incoming');
    const acceptedClients = requests.filter((request) => request.direction === 'accepted');

    const clientOptions = useMemo(
        () => clients.map((client) => ({
            value: client.id,
            label: clientLabel(client),
            description: client.email || client.about || '',
        })),
        [clients]
    );

    const acceptedClientOptions = useMemo(
        () => acceptedClients.map((request) => ({
            value: request.counterpartId,
            label: request.counterpartName || request.counterpartEmail || 'Клиент',
            description: request.counterpartEmail || 'Сотрудничество активно',
        })),
        [acceptedClients]
    );
    const selectedCareClient = useMemo(
        () => acceptedClients.find((request) => request.counterpartId === selectedCareClientId) || acceptedClients[0] || null,
        [acceptedClients, selectedCareClientId]
    );
    const graphPoints = useMemo(() => buildEmotionGraphPoints(clientGraphPoints), [clientGraphPoints]);

    const loadClients = useCallback(() => {
        return apiClients()
            .then((items) => {
                setClients(items);
                setClientsError('');
            })
            .catch((error) => {
                setClients([]);
                setClientsError(error.message || 'Не удалось загрузить клиентов.');
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
        if (!clientId) {
            setClientResults([]);
            setClientGraphPoints([]);
            setClientDataError('');
            return Promise.resolve();
        }

        setClientDataLoading(true);
        setClientDataError('');
        return Promise.all([apiClientTestResults(clientId), apiClientEmotionGraph(clientId)])
            .then(([results, graph]) => {
                setClientResults(Array.isArray(results) ? results : []);
                setClientGraphPoints(Array.isArray(graph?.points) ? graph.points : []);
            })
            .catch((error) => {
                setClientResults([]);
                setClientGraphPoints([]);
                setClientDataError(error.message || 'Не удалось загрузить данные клиента.');
            })
            .finally(() => {
                setClientDataLoading(false);
            });
    }, []);

    useEffect(() => {
        loadClients();
        loadRequests();
        loadAssignedRecommendations();
    }, [loadAssignedRecommendations, loadClients, loadRequests]);

    useEffect(() => {
        if (!selectedClientId && clientOptions.length > 0) {
            setSelectedClientId(clientOptions[0].value);
        }
    }, [clientOptions, selectedClientId]);

    useEffect(() => {
        if (!assignedClientId && acceptedClientOptions.length > 0) {
            setAssignedClientId(acceptedClientOptions[0].value);
        }
        if (assignedClientId && !acceptedClientOptions.some((option) => option.value === assignedClientId)) {
            setAssignedClientId(acceptedClientOptions[0]?.value || '');
        }
    }, [acceptedClientOptions, assignedClientId]);

    useEffect(() => {
        if (!selectedCareClientId && acceptedClientOptions.length > 0) {
            setSelectedCareClientId(acceptedClientOptions[0].value);
        }
        if (selectedCareClientId && !acceptedClientOptions.some((option) => option.value === selectedCareClientId)) {
            setSelectedCareClientId(acceptedClientOptions[0]?.value || '');
        }
    }, [acceptedClientOptions, selectedCareClientId]);

    useEffect(() => {
        loadClientData(selectedCareClientId || acceptedClientOptions[0]?.value || '');
    }, [acceptedClientOptions, loadClientData, selectedCareClientId]);

    const handleSendRequest = async (event) => {
        event.preventDefault();
        if (!selectedClientId) return;

        setIsSendingRequest(true);
        try {
            await apiCreateCollaborationRequest({ targetUserId: selectedClientId });
            await loadRequests();
            notify?.({
                tone: 'success',
                title: 'Заявка отправлена',
                description: 'Клиент увидит запрос в личном кабинете.',
            });
        } catch (error) {
            notify?.({
                tone: error.status === 409 ? 'warning' : 'danger',
                title: error.status === 409 ? 'Заявка уже существует' : 'Не удалось отправить заявку',
                description: error.status === 409
                    ? 'По этому клиенту уже есть заявка или активное сотрудничество.'
                    : (error.message || 'Попробуйте ещё раз.'),
            });
        } finally {
            setIsSendingRequest(false);
        }
    };

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

    const handleRecommendationSubmit = async (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const text = String(formData.get('recommendation') || '').trim();
        const assignedClient = acceptedClientOptions.find((option) => option.value === assignedClientId);
        if (!assignedClientId || !text) return;

        setIsAssigningRecommendation(true);
        try {
            await apiAssignRecommendation({ clientId: assignedClientId, text });
            await loadAssignedRecommendations();
            notify?.({
                tone: 'success',
                title: 'Рекомендация назначена',
                description: `Рекомендация для клиента "${assignedClient?.label || 'Клиент'}" сохранена в базе данных.`,
            });
            event.currentTarget.reset();
        } catch (error) {
            notify?.({
                tone: 'danger',
                title: 'Рекомендация не назначена',
                description: error.message || 'Сервер не сохранил рекомендацию.',
            });
        } finally {
            setIsAssigningRecommendation(false);
        }
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
                        <h2>Все клиенты</h2>
                        <p>Активные клиентские учетные записи, загруженные из базы данных.</p>
                    </div>
                    <Badge tone={clients.length > 0 ? 'success' : 'accent'}>
                        {clients.length > 0 ? `${clients.length} клиентов` : 'Нет клиентов'}
                    </Badge>
                </div>
                {clientsError ? (
                    <div className={styles.emptyState}>
                        <p>{clientsError}</p>
                    </div>
                ) : clients.length > 0 ? (
                    <div className={styles.roleGrid}>
                        {clients.map((client) => (
                            <article className={styles.roleCard} key={client.id || client.email}>
                                <div>
                                    <strong>{clientLabel(client)}</strong>
                                    <p>{client.about || client.email || 'Описание клиента пока не заполнено.'}</p>
                                </div>
                                <Badge tone="accent">Доступен</Badge>
                            </article>
                        ))}
                    </div>
                ) : (
                    <div className={styles.emptyState}>
                        <p>В системе пока нет активных клиентов.</p>
                    </div>
                )}
            </section>

            <section className={styles.accountSection}>
                <div className={styles.sectionHead}>
                    <div>
                        <h2>Данные клиента</h2>
                        <p>Результаты тестов, выбранные ответы и граф эмоционального состояния выбранного клиента.</p>
                    </div>
                    <Badge tone={selectedCareClient ? 'success' : 'accent'}>
                        {selectedCareClient ? (selectedCareClient.counterpartName || selectedCareClient.counterpartEmail || 'Клиент выбран') : 'Нет клиента'}
                    </Badge>
                </div>
                {acceptedClientOptions.length > 0 && (
                    <Select
                        label="Клиент"
                        options={acceptedClientOptions}
                        value={selectedCareClientId}
                        onChange={setSelectedCareClientId}
                        placeholder="Выберите клиента"
                    />
                )}
                {clientDataLoading ? (
                    <div className={styles.emptyState}>
                        <p>Загружаем данные клиента...</p>
                    </div>
                ) : clientDataError ? (
                    <div className={styles.emptyState}>
                        <p>{clientDataError}</p>
                    </div>
                ) : !selectedCareClient ? (
                    <div className={styles.emptyState}>
                        <p>Примите заявку клиента или дождитесь подтверждения своей заявки, чтобы открыть данные.</p>
                    </div>
                ) : (
                    <>
                        {graphPoints.length > 0 ? (
                            <EmotionStateGraph points={graphPoints} />
                        ) : (
                            <div className={styles.emptyState}>
                                <p>У клиента пока нет точек графа эмоционального состояния.</p>
                            </div>
                        )}
                        {clientResults.length > 0 ? (
                            <div className={styles.testResultList}>
                                {clientResults.map((result) => (
                                    <ClientResultCard key={result.id} result={result} styles={styles} />
                                ))}
                            </div>
                        ) : (
                            <div className={styles.emptyState}>
                                <p>У клиента пока нет сохраненных результатов тестов.</p>
                            </div>
                        )}
                    </>
                )}
            </section>

            <section className={styles.accountSection}>
                <div className={styles.sectionHead}>
                    <div>
                        <h2>Клиенты в работе</h2>
                        <p>Клиенты, с которыми специалист уже сотрудничает.</p>
                    </div>
                    <Badge tone={acceptedClients.length > 0 ? 'success' : 'accent'}>
                        {acceptedClients.length > 0 ? `${acceptedClients.length} в работе` : 'Нет сотрудничества'}
                    </Badge>
                </div>
                {requestsError ? (
                    <div className={styles.emptyState}>
                        <p>{requestsError}</p>
                    </div>
                ) : acceptedClients.length > 0 ? (
                    <div className={styles.roleGrid}>
                        {acceptedClients.map((request) => (
                            <article className={styles.roleCard} key={request.id}>
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
                                        variant={selectedCareClient?.id === request.id ? 'secondary' : 'ghost'}
                                        size="sm"
                                        iconRight={<KitIcon name="chart" />}
                                        onClick={() => setSelectedCareClientId(request.counterpartId)}>
                                        Данные
                                    </Button>
                                    <Button
                                        variant="ghost"
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
                    <Badge tone={incomingRequests.length > 0 ? 'warning' : pendingRequests.length > 0 ? 'accent' : 'success'}>
                        {pendingRequests.length > 0 ? `${pendingRequests.length} ожидает` : 'Нет заявок'}
                    </Badge>
                </div>
                <form className={styles.compactForm} onSubmit={handleSendRequest}>
                    <Select
                        label="Клиент"
                        options={clientOptions}
                        value={selectedClientId}
                        onChange={setSelectedClientId}
                        placeholder="Выберите клиента"
                        disabled={clientOptions.length === 0 || isSendingRequest}
                    />
                    <Button
                        type="submit"
                        variant="gradient"
                        gradient="radial"
                        iconRight={<KitIcon name="arrowRight" />}
                        disabled={!selectedClientId || isSendingRequest}>
                        {isSendingRequest ? 'Отправляем...' : 'Отправить заявку'}
                    </Button>
                </form>
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
                    </div>
                )}
            </section>

            <section className={styles.accountSection}>
                <div className={styles.sectionHead}>
                    <div>
                        <h2>Назначить рекомендацию</h2>
                        <p>Специалист может выбрать клиента в работе и добавить персональный шаг.</p>
                    </div>
                </div>
                <form className={styles.compactForm} onSubmit={handleRecommendationSubmit}>
                    <Select
                        label="Клиент"
                        options={acceptedClientOptions}
                        value={assignedClientId}
                        onChange={setAssignedClientId}
                        placeholder="Нет клиентов в работе"
                        disabled={acceptedClientOptions.length === 0 || isAssigningRecommendation}
                    />
                    <Input
                        name="recommendation"
                        label="Рекомендация"
                        placeholder="Например: вести дневник состояния 7 дней"
                        required
                        disabled={acceptedClientOptions.length === 0 || isAssigningRecommendation}
                    />
                    <Button
                        type="submit"
                        variant="gradient"
                        gradient="radial"
                        iconRight={<KitIcon name="check" />}
                        disabled={acceptedClientOptions.length === 0 || isAssigningRecommendation}>
                        {isAssigningRecommendation ? 'Назначаем...' : 'Назначить'}
                    </Button>
                </form>
                {assignedRecommendationsError ? (
                    <div className={styles.emptyState}>
                        <p>{assignedRecommendationsError}</p>
                    </div>
                ) : assignedRecommendations.length > 0 ? (
                    <div className={styles.roleGrid}>
                        {assignedRecommendations.map((assignment) => (
                            <article className={styles.roleCard} key={assignment.id}>
                                <div>
                                    <strong>{assignment.clientName || assignment.clientEmail || 'Клиент'}</strong>
                                    <p>{assignment.text || 'Текст рекомендации не заполнен.'}</p>
                                    {assignment.assignedAt && (
                                        <span className={styles.collaborationMeta}>
                                            Назначена {formatResultDate(assignment.assignedAt)}
                                        </span>
                                    )}
                                </div>
                                <div className={styles.roleActions}>
                                    <Badge tone="success">Активна</Badge>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        iconRight={<KitIcon name="trash" />}
                                        disabled={deletingAssignmentId === assignment.id}
                                        onClick={() => handleDeleteAssignment(assignment)}>
                                        {deletingAssignmentId === assignment.id ? 'Удаляем...' : 'Удалить'}
                                    </Button>
                                </div>
                            </article>
                        ))}
                    </div>
                ) : (
                    <div className={styles.emptyState}>
                        <p>Пока нет назначенных персональных рекомендаций.</p>
                    </div>
                )}
            </section>
        </div>
    );
}
