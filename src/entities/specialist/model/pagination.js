export const SPECIALISTS_PAGE_SIZE = 10;

export function getSpecialistsPage(specialists, page = 1, pageSize = SPECIALISTS_PAGE_SIZE) {
    const pageCount = Math.max(1, Math.ceil(specialists.length / pageSize));
    const numericPage = Number(page);
    const requestedPage = Number.isFinite(numericPage) ? Math.trunc(numericPage) : 1;
    const currentPage = Math.min(pageCount, Math.max(1, requestedPage));
    const startIndex = (currentPage - 1) * pageSize;

    return {
        page: currentPage,
        pageCount,
        items: specialists.slice(startIndex, startIndex + pageSize),
    };
}
