// API сущности «рекомендация»: дерево разделов/блоков, его правки (специалист/
// админ) и персональные назначения клиенту.
import { apiFetch } from '../../../shared/api';
import { RECOMMENDATION_BLOCKS_PER_PAGE } from '../model/pagination';

function normalizeTags(tags) {
    if (Array.isArray(tags)) return tags.map((tag) => String(tag).trim()).filter(Boolean);
    return String(tags || '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
}

function normalizeRecommendationBlock(block) {
    return {
        id: block.id || '',
        title: block.title || '',
        summary: block.summary || '',
        content: block.content || '',
        tags: normalizeTags(block.tags),
    };
}

function normalizeRecommendationSection(section) {
    return {
        id: section.id || '',
        // Номер раздела из БД (section_number). Источник истины для нумерации на
        // странице — благодаря ему нумерация не сбрасывается при пагинации.
        number: typeof section.number === 'string' ? section.number.trim() : '',
        title: section.title || '',
        description: section.description || '',
        blocks: Array.isArray(section.blocks) ? section.blocks.map(normalizeRecommendationBlock).filter((block) => block.id) : [],
        children: normalizeRecommendationSections(section.children),
    };
}

function normalizeRecommendationSections(items) {
    return Array.isArray(items) ? items.map(normalizeRecommendationSection).filter((section) => section.id) : [];
}

function normalizePositiveInteger(value, fallback = 1) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 1 ? number : fallback;
}

function normalizeNonNegativeInteger(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function normalizeRecommendationPage(payload, fallbackPage = 1) {
    const items = normalizeRecommendationSections(payload?.items);
    return {
        items,
        page: normalizePositiveInteger(payload?.page, fallbackPage),
        pageCount: normalizePositiveInteger(payload?.pageCount, 1),
        totalBlocks: normalizeNonNegativeInteger(payload?.totalBlocks),
        startBlock: normalizeNonNegativeInteger(payload?.startBlock),
        endBlock: normalizeNonNegativeInteger(payload?.endBlock),
        perPage: normalizePositiveInteger(payload?.perPage, RECOMMENDATION_BLOCKS_PER_PAGE),
    };
}

function mapServerAssignedRecommendation(item) {
    return {
        id: item?.id || `${item?.clientId || 'client'}-${item?.assignedAt || ''}`,
        collaborationId: item?.collaborationId || '',
        specialistId: item?.specialistId || '',
        specialistName: item?.specialistName || 'Специалист',
        specialistEmail: item?.specialistEmail || '',
        clientId: item?.clientId || '',
        clientName: item?.clientName || '',
        clientEmail: item?.clientEmail || '',
        text: item?.text || '',
        assignedAt: item?.assignedAt || '',
        status: item?.status || '',
    };
}

export async function apiRecommendations() {
    const payload = await apiFetch('/recommendations');
    return normalizeRecommendationSections(payload?.items);
}

export async function apiRecommendationsPage(page = 1) {
    const requestedPage = normalizePositiveInteger(page);
    const payload = await apiFetch(`/recommendations?page=${encodeURIComponent(String(requestedPage))}`);
    return normalizeRecommendationPage(payload, requestedPage);
}

export async function apiMyAssignedRecommendations() {
    const payload = await apiFetch('/me/recommendation-assignments', { auth: true });
    return Array.isArray(payload?.items) ? payload.items.map(mapServerAssignedRecommendation) : [];
}

export async function apiAssignRecommendation({ clientId, text }) {
    const payload = await apiFetch('/recommendations/assignments', {
        method: 'POST',
        auth: true,
        body: { clientId, text },
    });
    return mapServerAssignedRecommendation(payload?.item);
}

export async function apiSpecialistAssignedRecommendations() {
    const payload = await apiFetch('/recommendations/assignments', { auth: true });
    return Array.isArray(payload?.items) ? payload.items.map(mapServerAssignedRecommendation) : [];
}

export async function apiDeleteAssignedRecommendation(assignmentId) {
    const payload = await apiFetch(`/recommendations/assignments/${encodeURIComponent(assignmentId)}`, {
        method: 'DELETE',
        auth: true,
    });
    return Array.isArray(payload?.items) ? payload.items.map(mapServerAssignedRecommendation) : [];
}

export async function apiCreateRecommendationSection({
    parentId, number, title, description,
}) {
    const payload = await apiFetch('/recommendations/sections', {
        method: 'POST',
        auth: true,
        body: { parentId, number, title, description },
    });
    return normalizeRecommendationSections(payload?.items);
}

export async function apiCreateRecommendationBlock({ sectionId, title, summary, content, tags }) {
    const payload = await apiFetch('/recommendations/blocks', {
        method: 'POST',
        auth: true,
        body: { sectionId, title, summary, content, tags: normalizeTags(tags) },
    });
    return normalizeRecommendationSections(payload?.items);
}

export async function apiUpdateRecommendationSection(sectionId, { title, description }) {
    const payload = await apiFetch(`/recommendations/sections/${encodeURIComponent(sectionId)}`, {
        method: 'PATCH',
        auth: true,
        body: { title, description },
    });
    return normalizeRecommendationSections(payload?.items);
}

export async function apiUpdateRecommendationBlock(blockId, { title, summary, content, tags }) {
    const payload = await apiFetch(`/recommendations/blocks/${encodeURIComponent(blockId)}`, {
        method: 'PATCH',
        auth: true,
        body: { title, summary, content, tags: normalizeTags(tags) },
    });
    return normalizeRecommendationSections(payload?.items);
}

export async function apiDeleteRecommendationSection(sectionId) {
    const payload = await apiFetch(`/recommendations/sections/${encodeURIComponent(sectionId)}`, {
        method: 'DELETE',
        auth: true,
    });
    return normalizeRecommendationSections(payload?.items);
}

export async function apiDeleteRecommendationBlock(blockId) {
    const payload = await apiFetch(`/recommendations/blocks/${encodeURIComponent(blockId)}`, {
        method: 'DELETE',
        auth: true,
    });
    return normalizeRecommendationSections(payload?.items);
}
