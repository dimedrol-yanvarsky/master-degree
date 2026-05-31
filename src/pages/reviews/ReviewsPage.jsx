import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, KitIcon, Textarea } from '../../shared/ui/kit';
import { apiCreateReview, apiDeleteOwnReview, apiMyReviews, apiReviews, apiUpdateOwnReview } from '../../entities/feedback';
import { ROUTES } from '../../shared/routes';
import styles from './ReviewsPage.module.css';

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

function getInitials(name) {
    const parts = String(name || 'Пользователь')
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : parts[0]?.slice(0, 2) || 'П')
        .toLocaleUpperCase('ru-RU');
}

function formatReviewCount(count) {
    const lastTwoDigits = Math.abs(count) % 100;
    const lastDigit = lastTwoDigits % 10;

    if (lastTwoDigits > 10 && lastTwoDigits < 20) return `${count} отзывов`;
    if (lastDigit === 1) return `${count} отзыв`;
    if (lastDigit >= 2 && lastDigit <= 4) return `${count} отзыва`;
    return `${count} отзывов`;
}

export default function ReviewsPage({ isAuth = false, status = null }) {
    const [reviews, setReviews] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [reviewText, setReviewText] = useState('');
    const [submitError, setSubmitError] = useState('');
    const [submitSuccess, setSubmitSuccess] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [ownReviews, setOwnReviews] = useState([]);
    const [ownReviewsError, setOwnReviewsError] = useState('');
    const [editingReviewId, setEditingReviewId] = useState('');
    const [editingText, setEditingText] = useState('');
    const [updatingReviewId, setUpdatingReviewId] = useState('');
    const canCreateReview = isAuth && status === 'client';

    const loadReviews = useCallback(() => {
        let active = true;
        setIsLoading(true);
        setLoadError('');
        apiReviews()
            .then((items) => {
                if (!active) return;
                setReviews(items);
            })
            .catch((error) => {
                if (!active) return;
                setReviews([]);
                setLoadError(error.message || 'Не удалось загрузить отзывы.');
            })
            .finally(() => {
                if (active) setIsLoading(false);
            });

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => loadReviews(), [loadReviews]);

    const loadOwnReviews = useCallback(() => {
        if (!canCreateReview) {
            setOwnReviews([]);
            setOwnReviewsError('');
            return Promise.resolve();
        }
        return apiMyReviews()
            .then((items) => {
                setOwnReviews(items);
                setOwnReviewsError('');
            })
            .catch((error) => {
                setOwnReviews([]);
                setOwnReviewsError(error.message || 'Не удалось загрузить ваши отзывы.');
            });
    }, [canCreateReview]);

    useEffect(() => {
        loadOwnReviews();
    }, [loadOwnReviews]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        const text = reviewText.trim();
        setSubmitError('');
        setSubmitSuccess('');

        if (!text) {
            setSubmitError('Напишите текст отзыва.');
            return;
        }
        if (text.length > 1200) {
            setSubmitError('Отзыв должен быть не длиннее 1200 символов.');
            return;
        }

        setIsSubmitting(true);
        try {
            await apiCreateReview(text);
            await loadOwnReviews();
            setReviewText('');
            setSubmitSuccess('Спасибо. Отзыв отправлен на модерацию и появится после публикации администратором.');
        } catch (error) {
            setSubmitError(error.message || 'Не удалось отправить отзыв.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const startEditReview = (review) => {
        setEditingReviewId(review.id);
        setEditingText(review.text || '');
        setSubmitError('');
        setSubmitSuccess('');
    };

    const handleUpdateReview = async (event, review) => {
        event.preventDefault();
        const text = editingText.trim();
        if (!text) {
            setSubmitError('Напишите текст отзыва.');
            return;
        }

        setUpdatingReviewId(review.id);
        try {
            await apiUpdateOwnReview(review.id, text);
            setEditingReviewId('');
            setEditingText('');
            await loadOwnReviews();
            setSubmitSuccess('Отзыв обновлен и снова отправлен на модерацию.');
        } catch (error) {
            setSubmitError(error.message || 'Не удалось обновить отзыв.');
        } finally {
            setUpdatingReviewId('');
        }
    };

    const handleDeleteReview = async (review) => {
        setUpdatingReviewId(review.id);
        try {
            await apiDeleteOwnReview(review.id);
            if (editingReviewId === review.id) {
                setEditingReviewId('');
                setEditingText('');
            }
            await loadOwnReviews();
            await loadReviews();
            setSubmitSuccess('Отзыв удален.');
        } catch (error) {
            setSubmitError(error.message || 'Не удалось удалить отзыв.');
        } finally {
            setUpdatingReviewId('');
        }
    };

    return (
        <section className={styles.root}>
            <header className={styles.heading}>
                <div>
                    <h1>Отзывы</h1>
                    <p>Обратная связь клиентов, загруженная из системы.</p>
                </div>
                <div className={styles.summary}>
                    <KitIcon name="star" size={18} />
                    <span>{isLoading ? 'Загрузка...' : formatReviewCount(reviews.length)}</span>
                </div>
            </header>

            <section className={styles.formPanel}>
                {canCreateReview ? (
                    <form className={styles.form} onSubmit={handleSubmit}>
                        <Textarea
                            label="Оставить отзыв"
                            placeholder="Расскажите, что было полезно в работе с сервисом или специалистом"
                            value={reviewText}
                            onChange={(event) => {
                                setReviewText(event.target.value);
                                setSubmitError('');
                                setSubmitSuccess('');
                            }}
                            maxLength={1200}
                            showCount
                            autoGrow
                            required
                            disabled={isSubmitting}
                        />
                        <div className={styles.formActions}>
                            <Button
                                type="submit"
                                variant="gradient"
                                gradient="radial"
                                iconRight={<KitIcon name="arrowRight" />}
                                disabled={isSubmitting}>
                                {isSubmitting ? 'Отправляем...' : 'Отправить на модерацию'}
                            </Button>
                            {submitError && <p className={styles.formError}>{submitError}</p>}
                            {submitSuccess && <p className={styles.formSuccess}>{submitSuccess}</p>}
                        </div>
                    </form>
                ) : (
                    <div className={styles.formNotice}>
                        <div>
                            <strong>{isAuth ? 'Отзывы оставляют клиенты' : 'Войдите, чтобы оставить отзыв'}</strong>
                            <p>
                                {isAuth
                                    ? 'Для специалиста и администратора доступен просмотр опубликованной обратной связи.'
                                    : 'После входа клиент сможет отправить отзыв на модерацию.'}
                            </p>
                        </div>
                        {!isAuth && <Link to={ROUTES.login}>Войти</Link>}
                    </div>
                )}
            </section>

            {canCreateReview && (
                <section className={styles.formPanel}>
                    <div className={styles.form}>
                        <div className={styles.formNotice}>
                            <div>
                                <strong>Мои отзывы</strong>
                                <p>Здесь можно изменить или удалить собственные отзывы. После изменения отзыв снова уйдет на модерацию.</p>
                            </div>
                            <Badge tone={ownReviews.length > 0 ? 'success' : 'accent'}>
                                {formatReviewCount(ownReviews.length)}
                            </Badge>
                        </div>
                        {ownReviewsError && <p className={styles.formError}>{ownReviewsError}</p>}
                        {ownReviews.length === 0 ? (
                            <p className={styles.statusMessage}>У вас пока нет отзывов.</p>
                        ) : (
                            <div className={styles.grid}>
                                {ownReviews.map((review) => {
                                    const isEditing = editingReviewId === review.id;
                                    const isBusy = updatingReviewId === review.id;

                                    return (
                                        <article className={styles.card} key={review.id}>
                                            <div className={styles.cardHead}>
                                                <span className={styles.avatar} aria-hidden="true">
                                                    {getInitials(review.authorName)}
                                                </span>
                                                <div>
                                                    <h2>{review.authorName}</h2>
                                                    <span>{formatReviewDate(review.createdAt)}</span>
                                                </div>
                                                <Badge tone={review.status === 'active' ? 'success' : review.status === 'hidden' ? 'accent' : 'warning'}>
                                                    {review.status === 'active' ? 'Опубликован' : review.status === 'hidden' ? 'Скрыт' : 'На модерации'}
                                                </Badge>
                                            </div>
                                            {isEditing ? (
                                                <form className={styles.form} onSubmit={(event) => handleUpdateReview(event, review)}>
                                                    <Textarea
                                                        value={editingText}
                                                        onChange={(event) => setEditingText(event.target.value)}
                                                        maxLength={1200}
                                                        showCount
                                                        autoGrow
                                                        disabled={isBusy}
                                                    />
                                                    <div className={styles.formActions}>
                                                        <Button type="submit" variant="secondary" iconRight={<KitIcon name="check" />} disabled={isBusy}>
                                                            {isBusy ? 'Сохраняем...' : 'Сохранить'}
                                                        </Button>
                                                        <Button type="button" variant="ghost" onClick={() => setEditingReviewId('')} disabled={isBusy}>
                                                            Отмена
                                                        </Button>
                                                    </div>
                                                </form>
                                            ) : (
                                                <>
                                                    <p>{review.text}</p>
                                                    <div className={styles.formActions}>
                                                        <Button variant="secondary" size="sm" iconRight={<KitIcon name="edit" />} disabled={isBusy} onClick={() => startEditReview(review)}>
                                                            Редактировать
                                                        </Button>
                                                        <Button variant="destructive" size="sm" iconRight={<KitIcon name="trash" />} disabled={isBusy} onClick={() => handleDeleteReview(review)}>
                                                            {isBusy ? 'Удаляем...' : 'Удалить'}
                                                        </Button>
                                                    </div>
                                                </>
                                            )}
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </section>
            )}

            {isLoading && <p className={styles.statusMessage}>Загружаем отзывы...</p>}
            {!isLoading && loadError && <p className={styles.statusMessage}>{loadError}</p>}
            {!isLoading && !loadError && reviews.length === 0 && (
                <p className={styles.statusMessage}>В базе пока нет опубликованных отзывов.</p>
            )}

            {!isLoading && !loadError && reviews.length > 0 && (
                <div className={styles.grid}>
                    {reviews.map((review) => (
                        <article className={styles.card} key={review.id}>
                            <div className={styles.cardHead}>
                                <span className={styles.avatar} aria-hidden="true">
                                    {getInitials(review.authorName)}
                                </span>
                                <div>
                                    <h2>{review.authorName}</h2>
                                    <span>{formatReviewDate(review.createdAt)}</span>
                                </div>
                                <Badge tone="success">Опубликован</Badge>
                            </div>
                            <p>{review.text}</p>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}
