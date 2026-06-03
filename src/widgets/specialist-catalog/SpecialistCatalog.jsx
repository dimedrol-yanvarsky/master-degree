import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Avatar, Badge, Button, KitIcon } from '../../shared/ui/kit';
import { apiCollaborationRequests } from '../../entities/collaboration';
import { apiClients, apiUsers } from '../../entities/user';
import { apiSpecialists, getSpecialistsPage } from '../../entities/specialist';
import { SpecialistWorkButton } from '../../features/specialist-work-request';
import styles from './SpecialistCatalog.module.css';

const roleLabels = {
    client: 'Клиент',
    specialist: 'Специалист',
    admin: 'Администратор',
};

const accountStatusLabels = {
    active: 'Активна',
    blocked: 'Заблокирована',
    deleted: 'Удалена',
};

function formatAccountDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('ru-RU', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    }).format(date);
}

function relationshipStatusFromRequest(request) {
    const status = String(request?.status || '').trim().toLowerCase();
    if (status === 'accepted') return 'accepted';
    if (status.startsWith('pending')) return status;
    return '';
}

function relationKeyFromRequest(request, targetRole) {
    return targetRole === 'client'
        ? request?.clientId || request?.counterpartId || ''
        : request?.specialistId || request?.counterpartId || '';
}

function buildWorkRelations(requests, targetRole) {
    return (requests || []).reduce((relations, request) => {
        const key = relationKeyFromRequest(request, targetRole);
        const status = relationshipStatusFromRequest(request);
        if (!key || !status) return relations;
        if (relations[key] === 'accepted') return relations;
        return {
            ...relations,
            [key]: status,
        };
    }, {});
}

function getCatalogDescription(item, isClientCatalog) {
    if (isClientCatalog) {
        return item.about || 'Клиент сервиса, доступный для приглашения к совместной психологической работе.';
    }
    return item.description;
}

export function SpecialistCatalog({ isAuth = false, status = null }) {
    const [searchParams, setSearchParams] = useSearchParams();
    const [items, setItems] = useState([]);
    const [workRelations, setWorkRelations] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const isUserCatalog = isAuth && status === 'admin';
    const isClientCatalog = isAuth && status === 'specialist';
    const targetRole = isClientCatalog ? 'client' : 'specialist';
    const pageParam = searchParams.get('page');
    const requestedPage = Number(pageParam || 1);

    useEffect(() => {
        let isActual = true;

        setIsLoading(true);
        setLoadError('');
        const request = isUserCatalog ? apiUsers : isClientCatalog ? apiClients : apiSpecialists;
        request()
            .then((items) => {
                if (!isActual) return;
                setItems(isClientCatalog ? items.filter((item) => item.role === 'client' && item.status === 'active') : items);
            })
            .catch((error) => {
                if (isActual) setLoadError(error.message || (isUserCatalog ? 'Не удалось загрузить пользователей.' : isClientCatalog ? 'Не удалось загрузить клиентов.' : 'Не удалось загрузить специалистов.'));
            })
            .finally(() => {
                if (isActual) setIsLoading(false);
            });

        return () => {
            isActual = false;
        };
    }, [isUserCatalog, isClientCatalog]);

    useEffect(() => {
        let isActual = true;
        const shouldLoadRelations = isAuth && !isUserCatalog && (status === 'client' || status === 'specialist');
        if (!shouldLoadRelations) {
            setWorkRelations({});
            return () => {
                isActual = false;
            };
        }

        apiCollaborationRequests()
            .then((requests) => {
                if (isActual) setWorkRelations(buildWorkRelations(requests, targetRole));
            })
            .catch(() => {
                if (isActual) setWorkRelations({});
            });

        return () => {
            isActual = false;
        };
    }, [isAuth, isUserCatalog, status, targetRole]);

    const handleRequestCreated = (request) => {
        const key = relationKeyFromRequest(request, targetRole);
        const nextStatus = relationshipStatusFromRequest(request) || 'pending';
        if (!key) return;
        setWorkRelations((currentRelations) => ({
            ...currentRelations,
            [key]: nextStatus,
        }));
    };

    const catalogPage = useMemo(
        () => getSpecialistsPage(items, requestedPage),
        [items, requestedPage]
    );

    useEffect(() => {
        if (pageParam !== String(catalogPage.page)) {
            setSearchParams({ page: String(catalogPage.page) }, { replace: true });
        }
    }, [catalogPage.page, pageParam, setSearchParams]);

    const goToPage = (page) => {
        const nextPage = Math.min(catalogPage.pageCount, Math.max(1, page));
        setSearchParams({ page: String(nextPage) });
    };

    return (
        <section className={styles.root}>
            <header className={styles.heading}>
                <div>
                    <h1>{isUserCatalog ? 'Пользователи' : isClientCatalog ? 'Клиенты' : 'Специалисты'}</h1>
                    <p>{isUserCatalog ? 'Список учетных записей, загруженный из системы.' : isClientCatalog ? 'Список клиентов, которым специалист может отправить заявку на совместную работу.' : 'Выберите понравившегося специалиста'}</p>
                </div>
                <div className={styles.summary}>
                    <KitIcon name="user" size={18} />
                    <span>{isLoading ? 'Загрузка...' : `${items.length} ${isUserCatalog ? 'пользователей' : isClientCatalog ? 'клиентов' : 'специалистов'}`}</span>
                </div>
            </header>

            {isLoading && <p className={styles.statusMessage}>{isUserCatalog ? 'Загружаем пользователей...' : isClientCatalog ? 'Загружаем клиентов...' : 'Загружаем специалистов...'}</p>}
            {!isLoading && loadError && <p className={styles.statusMessage}>{loadError}</p>}
            {!isLoading && !loadError && items.length === 0 && (
                <p className={styles.statusMessage}>{isUserCatalog ? 'В базе пока нет пользователей для отображения.' : isClientCatalog ? 'В базе пока нет активных клиентов.' : 'В базе пока нет специалистов для отображения.'}</p>
            )}

            {!isLoading && !loadError && items.length > 0 && (
                <div className={styles.grid}>
                    {catalogPage.items.map((item) => (
                        <article className={styles.card} key={item.id || item.name || item.email}>
                            <div className={styles.cardTop}>
                                <Avatar
                                    name={item.displayName || item.name}
                                    size="lg"
                                    variant="ring"
                                    color={item.color}
                                />
                                <div className={styles.specialistHead}>
                                    <h2>{item.displayName || item.name}</h2>
                                    {isUserCatalog ? (
                                        <div className={styles.tags}>
                                            <Badge tone="accent" appearance="glass">{roleLabels[item.role] || item.role}</Badge>
                                            <Badge tone={item.status === 'active' ? 'success' : item.status === 'blocked' ? 'warning' : 'danger'} appearance="glass">
                                                {accountStatusLabels[item.status] || item.status}
                                            </Badge>
                                        </div>
                                    ) : !isClientCatalog && item.experience && (
                                        <div className={styles.tags}>
                                            <Badge tone="accent" appearance="glass">стаж: {item.experience}</Badge>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <p className={styles.description}>
                                {isUserCatalog
                                    ? [item.email, formatAccountDate(item.createdAt) && `создана ${formatAccountDate(item.createdAt)}`].filter(Boolean).join(' · ')
                                    : getCatalogDescription(item, isClientCatalog)}
                            </p>

                            {!isUserCatalog && (
                                <div className={styles.cardFooter}>
                                    <SpecialistWorkButton
                                        isAuth={isAuth}
                                        status={status}
                                        specialistId={item.id}
                                        targetRole={targetRole}
                                        relationshipStatus={workRelations[item.id] || ''}
                                        onRequestCreated={handleRequestCreated}
                                    />
                                </div>
                            )}
                        </article>
                    ))}
                </div>
            )}

            {!isLoading && !loadError && items.length > 0 && (
                <nav className={styles.pagination} aria-label={isUserCatalog ? 'Пагинация пользователей' : isClientCatalog ? 'Пагинация клиентов' : 'Пагинация специалистов'}>
                    <Button
                        variant="ghost"
                        iconLeft={<KitIcon name="arrowLeft" size={16} />}
                        disabled={catalogPage.page === 1}
                        onClick={() => goToPage(catalogPage.page - 1)}>
                        Назад
                    </Button>

                    <div className={styles.pageButtons}>
                        {Array.from({ length: catalogPage.pageCount }, (_, index) => {
                            const page = index + 1;
                            const isCurrent = page === catalogPage.page;

                            return (
                                <Button
                                    key={page}
                                    variant={isCurrent ? 'primary' : 'secondary'}
                                    iconOnly
                                    iconLeft={<span>{page}</span>}
                                    aria-label={`Страница ${page}`}
                                    aria-current={isCurrent ? 'page' : undefined}
                                    onClick={() => goToPage(page)}
                                />
                            );
                        })}
                    </div>

                    <Button
                        variant="ghost"
                        iconRight={<KitIcon name="arrowRight" size={16} />}
                        disabled={catalogPage.page === catalogPage.pageCount}
                        onClick={() => goToPage(catalogPage.page + 1)}>
                        Вперед
                    </Button>
                </nav>
            )}
        </section>
    );
}
