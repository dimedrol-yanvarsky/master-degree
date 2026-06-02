import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, KitIcon } from '../../../shared/ui/kit';
import { formatResultDate } from '../../../features/testing';
import {
    apiCollaboratingSpecialists,
    apiCollaborationRequests,
    apiFinishCollaboration,
    apiRespondCollaborationRequest,
} from '../../../entities/collaboration';
import { ROUTES } from '../../../shared/routes';

function isPendingRequest(request) {
    return String(request.status || '').startsWith('pending');
}

function formatCollaborationDate(value) {
    return formatResultDate(value).replace(' в ', ', ');
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
                        Сотрудничество с {formatCollaborationDate(specialist.startedAt)}
                    </span>
                )}
            </div>
            <div className={styles.collaborationSide}>
                <Badge tone={isFinished ? 'accent' : 'success'}>
                    {specialist.experience ? `стаж: ${specialist.experience}` : (isFinished ? 'Завершено' : 'Сотрудничаете')}
                </Badge>
                {!isFinished && (
                    <Button
                        variant="secondary"
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
    notify,
    styles,
}) {
    const [collaboratingSpecialists, setCollaboratingSpecialists] = useState([]);
    const [collaborationsError, setCollaborationsError] = useState('');
    const [requests, setRequests] = useState([]);
    const [requestsError, setRequestsError] = useState('');
    const [updatingRequestId, setUpdatingRequestId] = useState('');
    const [finishingCollaborationId, setFinishingCollaborationId] = useState('');
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

    useEffect(() => {
        let active = true;
        loadCollaborations().finally(() => {
            if (!active) return;
        });
        loadRequests().finally(() => {
            if (!active) return;
        });

        return () => {
            active = false;
        };
    }, [loadCollaborations, loadRequests]);

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
