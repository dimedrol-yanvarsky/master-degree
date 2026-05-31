// API сущности «отзыв» (feedback): публичная лента, собственные отзывы клиента и
// модерация (админ).
import { apiFetch } from '../../../shared/api';

function mapServerReview(review) {
    return {
        id: review.id || `${review.userId || 'review'}-${review.createdAt || ''}`,
        userId: review.userId || '',
        authorName: review.authorName || 'Пользователь',
        authorEmail: review.authorEmail || '',
        text: review.text || '',
        createdAt: review.createdAt || '',
        status: review.status || '',
    };
}

export async function apiReviews() {
    const payload = await apiFetch('/reviews');
    return Array.isArray(payload?.items) ? payload.items.map(mapServerReview) : [];
}

export async function apiCreateReview(text) {
    const payload = await apiFetch('/reviews', {
        method: 'POST',
        auth: true,
        body: { text },
    });
    return mapServerReview(payload?.item);
}

export async function apiMyReviews() {
    const payload = await apiFetch('/me/reviews', { auth: true });
    return Array.isArray(payload?.items) ? payload.items.map(mapServerReview) : [];
}

export async function apiUpdateOwnReview(reviewId, text) {
    const payload = await apiFetch(`/me/reviews/${encodeURIComponent(reviewId)}`, {
        method: 'PATCH',
        auth: true,
        body: { text },
    });
    return mapServerReview(payload?.item);
}

export async function apiDeleteOwnReview(reviewId) {
    await apiFetch(`/me/reviews/${encodeURIComponent(reviewId)}`, {
        method: 'DELETE',
        auth: true,
    });
}

export async function apiModerationReviews() {
    const payload = await apiFetch('/admin/reviews', { auth: true });
    return Array.isArray(payload?.items) ? payload.items.map(mapServerReview) : [];
}

export async function apiSetReviewStatus(reviewId, status) {
    const payload = await apiFetch(`/admin/reviews/${encodeURIComponent(reviewId)}/status`, {
        method: 'PATCH',
        auth: true,
        body: { status },
    });
    return Array.isArray(payload?.items) ? payload.items.map(mapServerReview) : [];
}

export async function apiDeleteReview(reviewId) {
    const payload = await apiFetch(`/admin/reviews/${encodeURIComponent(reviewId)}`, {
        method: 'DELETE',
        auth: true,
    });
    return Array.isArray(payload?.items) ? payload.items.map(mapServerReview) : [];
}
