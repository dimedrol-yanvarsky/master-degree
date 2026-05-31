// API сущности «эмоциональное состояние»: граф текущего пользователя и графы
// клиентов (для специалиста). Точки приходят уже в готовом виде с сервера.
import { apiFetch } from '../../../shared/api';

export async function apiEmotionGraph() {
    return apiFetch('/me/emotion-graph', { auth: true });
}

export async function apiClientEmotionGraph(clientId) {
    return apiFetch(`/clients/${encodeURIComponent(clientId)}/emotion-graph`, { auth: true });
}
