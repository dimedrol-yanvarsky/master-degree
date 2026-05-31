// API сущности «специалист»: публичный каталог специалистов.
import { apiFetch } from '../../../shared/api';

function mapServerSpecialist(specialist) {
    return {
        id: specialist.id || specialist.name,
        name: specialist.name || '',
        experience: specialist.experience || '',
        description: specialist.description || '',
        color: specialist.color || 'var(--accent)',
    };
}

export async function apiSpecialists() {
    const payload = await apiFetch('/specialists');
    return Array.isArray(payload?.items) ? payload.items.map(mapServerSpecialist) : [];
}
