// API сущности «сотрудничество» (связь специалист↔клиент): список действующих
// связей, входящие/исходящие заявки, их создание, ответ и завершение.
import { apiFetch } from '../../../shared/api';

function mapServerCollaboration(item) {
    return {
        id: item.id || item.specialistId || item.name,
        specialistId: item.specialistId || '',
        name: item.name || '',
        experience: item.experience || '',
        description: item.description || '',
        startedAt: item.startedAt || '',
        status: item.status || '',
    };
}

function mapServerWorkRequest(item) {
    if (!item) return null;
    return {
        id: item.id || '',
        specialistId: item.specialistId || '',
        clientId: item.clientId || '',
        counterpartId: item.counterpartId || '',
        counterpartName: item.counterpartName || '',
        counterpartEmail: item.counterpartEmail || '',
        counterpartRole: item.counterpartRole || '',
        counterpartDescription: item.counterpartDescription || '',
        startedAt: item.startedAt || '',
        status: item.status || '',
        direction: item.direction || '',
        canRespond: Boolean(item.canRespond),
    };
}

export async function apiCollaboratingSpecialists() {
    const payload = await apiFetch('/me/collaborations', { auth: true });
    return Array.isArray(payload?.items) ? payload.items.map(mapServerCollaboration) : [];
}

export async function apiCollaborationRequests() {
    const payload = await apiFetch('/me/collaboration-requests', { auth: true });
    return Array.isArray(payload?.items) ? payload.items.map(mapServerWorkRequest) : [];
}

export async function apiCreateCollaborationRequest({ targetUserId }) {
    const payload = await apiFetch('/me/collaboration-requests', {
        method: 'POST',
        auth: true,
        body: { targetUserId },
    });
    return mapServerWorkRequest(payload?.item);
}

export async function apiRespondCollaborationRequest(requestId, decision) {
    const payload = await apiFetch(`/me/collaboration-requests/${encodeURIComponent(requestId)}`, {
        method: 'PATCH',
        auth: true,
        body: { decision },
    });
    return mapServerWorkRequest(payload?.item);
}

export async function apiFinishCollaboration(collaborationId) {
    const payload = await apiFetch(`/me/collaborations/${encodeURIComponent(collaborationId)}/finish`, {
        method: 'PATCH',
        auth: true,
    });
    return mapServerWorkRequest(payload?.item);
}
