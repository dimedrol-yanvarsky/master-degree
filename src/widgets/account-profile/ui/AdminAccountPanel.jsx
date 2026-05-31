import { useEffect, useState } from 'react';
import { Badge, Button, Input, KitIcon, Select } from '../../../shared/ui/kit';
import { apiCreateUser, apiDeleteUser, apiSetUserStatus, apiUsers, statusInfo } from '../../../entities/user';
import { apiDeleteReview, apiModerationReviews, apiSetReviewStatus } from '../../../entities/feedback';

const conditionLabels = {
    active: 'Активна',
    blocked: 'Заблокирована',
    deleted: 'Удалена',
};

const reviewStatusLabels = {
    active: 'Опубликован',
    pending: 'На проверке',
    hidden: 'Скрыт',
};

const reviewStatusTones = {
    active: 'success',
    pending: 'warning',
    hidden: 'accent',
};

function formatReviewDate(value) {
    if (!value) return 'Дата не указана';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Дата не указана';
    return new Intl.DateTimeFormat('ru-RU', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    }).format(date);
}

function formatReviewCount(count) {
    const lastTwoDigits = Math.abs(count) % 100;
    const lastDigit = lastTwoDigits % 10;

    if (lastTwoDigits > 10 && lastTwoDigits < 20) return `${count} отзывов`;
    if (lastDigit === 1) return `${count} отзыв`;
    if (lastDigit >= 2 && lastDigit <= 4) return `${count} отзыва`;
    return `${count} отзывов`;
}

export function AdminAccountPanel({ notify, styles }) {
    const [accounts, setAccounts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [createdStatus, setCreatedStatus] = useState('client');
    const [isCreating, setIsCreating] = useState(false);
    const [reviews, setReviews] = useState([]);
    const [reviewsLoading, setReviewsLoading] = useState(true);
    const [reviewsError, setReviewsError] = useState('');
    const [updatingReviewId, setUpdatingReviewId] = useState('');

    useEffect(() => {
        let active = true;
        setIsLoading(true);
        setLoadError('');
        apiUsers()
            .then((items) => {
                if (!active) return;
                setAccounts(items);
            })
            .catch((error) => {
                if (!active) return;
                setAccounts([]);
                setLoadError(error.message || 'Не удалось загрузить учетные записи.');
            })
            .finally(() => {
                if (active) setIsLoading(false);
            });

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        let active = true;
        setReviewsLoading(true);
        setReviewsError('');
        apiModerationReviews()
            .then((items) => {
                if (!active) return;
                setReviews(items);
            })
            .catch((error) => {
                if (!active) return;
                setReviews([]);
                setReviewsError(error.message || 'Не удалось загрузить отзывы для модерации.');
            })
            .finally(() => {
                if (active) setReviewsLoading(false);
            });

        return () => {
            active = false;
        };
    }, []);

    const handleCreateAccount = async (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const email = String(formData.get('accountEmail') || '').trim();
        const surname = String(formData.get('accountSurname') || '').trim();
        const name = String(formData.get('accountName') || '').trim();
        const patronymic = String(formData.get('accountPatronymic') || '').trim();

        if (!email) {
            notify?.({
                tone: 'danger',
                title: 'Аккаунт не создан',
                description: 'Введите почту учетной записи.',
            });
            return;
        }

        setIsCreating(true);
        try {
            const items = await apiCreateUser({
                email,
                surname,
                name,
                patronymic,
                role: createdStatus,
            });
            setAccounts(items);
            event.currentTarget.reset();
            setCreatedStatus('client');
            notify?.({
                tone: 'success',
                title: 'Аккаунт создан',
                description: 'Пользователю отправлена ссылка для установки пароля. Без SMTP она появится в логе сервера.',
            });
        } catch (error) {
            notify?.({
                tone: error.status === 409 ? 'warning' : 'danger',
                title: error.status === 409 ? 'Аккаунт уже существует' : 'Аккаунт не создан',
                description: error.message || 'Сервер не создал учетную запись.',
            });
        } finally {
            setIsCreating(false);
        }
    };

    const handleBlockAccount = (account) => {
        apiSetUserStatus(account.id, 'blocked')
            .then((items) => {
                setAccounts(items);
                notify?.({
                    tone: 'warning',
                    title: 'Аккаунт заблокирован',
                    description: `Учетная запись "${account.displayName}" переведена в статус блокировки.`,
                });
            })
            .catch((error) => {
                notify?.({
                    tone: 'danger',
                    title: 'Не удалось заблокировать',
                    description: error.message || 'Сервер не сохранил изменение статуса.',
                });
            });
    };

    const handleDeleteAccount = (account) => {
        apiDeleteUser(account.id)
            .then((items) => {
                setAccounts(items);
                notify?.({
                    tone: 'danger',
                    title: 'Аккаунт удален',
                    description: `Учетная запись "${account.displayName}" помечена как удаленная.`,
                });
            })
            .catch((error) => {
                notify?.({
                    tone: 'danger',
                    title: 'Не удалось удалить',
                    description: error.message || 'Сервер не сохранил удаление аккаунта.',
                });
            });
    };

    const handleReviewStatus = async (review, status) => {
        setUpdatingReviewId(review.id);
        try {
            const items = await apiSetReviewStatus(review.id, status);
            setReviews(items);
            notify?.({
                tone: status === 'active' ? 'success' : 'warning',
                title: status === 'active' ? 'Отзыв опубликован' : 'Отзыв скрыт',
                description: status === 'active'
                    ? 'Отзыв будет отображаться на публичной странице.'
                    : 'Отзыв убран с публичной страницы.',
            });
        } catch (error) {
            notify?.({
                tone: 'danger',
                title: 'Статус отзыва не изменен',
                description: error.message || 'Сервер не сохранил модерацию отзыва.',
            });
        } finally {
            setUpdatingReviewId('');
        }
    };

    const handleReviewDelete = async (review) => {
        setUpdatingReviewId(review.id);
        try {
            const items = await apiDeleteReview(review.id);
            setReviews(items);
            notify?.({
                tone: 'danger',
                title: 'Отзыв удален',
                description: 'Отзыв помечен как удаленный и больше не участвует в модерации.',
            });
        } catch (error) {
            notify?.({
                tone: 'danger',
                title: 'Отзыв не удален',
                description: error.message || 'Сервер не сохранил удаление отзыва.',
            });
        } finally {
            setUpdatingReviewId('');
        }
    };

    const pendingReviewCount = reviews.filter((review) => (review.status || 'active') === 'pending').length;

    return (
        <div className={styles.rolePanel}>
            <section className={styles.accountSection}>
                <div className={styles.sectionHead}>
                    <div>
                        <h2>Учетные записи</h2>
                        <p>Создание, блокировка и удаление пользователей.</p>
                    </div>
                </div>
                {isLoading ? (
                    <div className={styles.emptyState}>
                        <p>Загружаем учетные записи...</p>
                    </div>
                ) : loadError ? (
                    <div className={styles.emptyState}>
                        <p>{loadError}</p>
                    </div>
                ) : (
                    <div className={styles.adminList}>
                        {accounts.map((account) => (
                            <article className={styles.roleCard} key={account.id || account.email}>
                                <div>
                                    <strong>{account.displayName}</strong>
                                    <p>{statusInfo[account.role]?.label || account.role} · {conditionLabels[account.status] || account.status}</p>
                                </div>
                                <div className={styles.roleActions}>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        iconRight={<KitIcon name="shield" />}
                                        disabled={account.status === 'blocked' || account.status === 'deleted'}
                                        onClick={() => handleBlockAccount(account)}>
                                        Блокировать
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        iconRight={<KitIcon name="trash" />}
                                        disabled={account.status === 'deleted'}
                                        onClick={() => handleDeleteAccount(account)}>
                                        Удалить
                                    </Button>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            <section className={styles.accountSection}>
                <div className={styles.sectionHead}>
                    <div>
                        <h2>Создать аккаунт</h2>
                        <p>Администратор может завести пользователя с нужной ролью.</p>
                    </div>
                </div>
                <form className={styles.compactForm} onSubmit={handleCreateAccount}>
                    <Input name="accountEmail" label="Почта" type="email" placeholder="new-user@example.com" required disabled={isCreating} />
                    <Input name="accountSurname" label="Фамилия" placeholder="Иванова" disabled={isCreating} />
                    <Input name="accountName" label="Имя" placeholder="Анна" disabled={isCreating} />
                    <Input name="accountPatronymic" label="Отчество" placeholder="Сергеевна" disabled={isCreating} />
                    <Select
                        label="Роль"
                        options={[
                            { value: 'client', label: 'Клиент' },
                            { value: 'specialist', label: 'Специалист' },
                            { value: 'admin', label: 'Администратор' },
                        ]}
                        value={createdStatus}
                        onChange={setCreatedStatus}
                        disabled={isCreating}
                    />
                    <Button type="submit" variant="gradient" gradient="radial" iconRight={<KitIcon name="plus" />} disabled={isCreating}>
                        {isCreating ? 'Создаем...' : 'Создать'}
                    </Button>
                </form>
            </section>

            <section className={styles.accountSection}>
                <div className={styles.sectionHead}>
                    <div>
                        <h2>Модерация отзывов</h2>
                        <p>Публикация, скрытие и удаление отзывов из базы данных.</p>
                    </div>
                    <Badge tone={pendingReviewCount > 0 ? 'warning' : reviews.length > 0 ? 'success' : 'accent'}>
                        {reviewsLoading
                            ? 'Загрузка...'
                            : pendingReviewCount > 0
                                ? `${pendingReviewCount} на проверке`
                                : formatReviewCount(reviews.length)}
                    </Badge>
                </div>
                {reviewsLoading ? (
                    <div className={styles.emptyState}>
                        <p>Загружаем отзывы для модерации...</p>
                    </div>
                ) : reviewsError ? (
                    <div className={styles.emptyState}>
                        <p>{reviewsError}</p>
                    </div>
                ) : reviews.length === 0 ? (
                    <div className={styles.emptyState}>
                        <p>Нет отзывов для модерации.</p>
                    </div>
                ) : (
                    <div className={styles.roleGrid}>
                        {reviews.map((review) => {
                            const status = review.status || 'active';
                            const isUpdating = updatingReviewId === review.id;

                            return (
                                <article className={styles.roleCard} key={review.id}>
                                    <div>
                                        <strong>{review.authorName || review.authorEmail || 'Пользователь'}</strong>
                                        <p>{review.text || 'Текст отзыва не заполнен.'}</p>
                                        <span className={styles.collaborationMeta}>
                                            {formatReviewDate(review.createdAt)}
                                        </span>
                                    </div>
                                    <div className={styles.roleActions}>
                                        <Badge tone={reviewStatusTones[status] || 'accent'}>
                                            {reviewStatusLabels[status] || status}
                                        </Badge>
                                        {status !== 'active' && (
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                iconRight={<KitIcon name="check" />}
                                                disabled={isUpdating}
                                                onClick={() => handleReviewStatus(review, 'active')}>
                                                Опубликовать
                                            </Button>
                                        )}
                                        {status !== 'hidden' && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                iconRight={<KitIcon name="eye" />}
                                                disabled={isUpdating}
                                                onClick={() => handleReviewStatus(review, 'hidden')}>
                                                Скрыть
                                            </Button>
                                        )}
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            iconRight={<KitIcon name="trash" />}
                                            disabled={isUpdating}
                                            onClick={() => handleReviewDelete(review)}>
                                            Удалить
                                        </Button>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
}
