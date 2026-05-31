export const ROUTES = Object.freeze({
    home: '/',
    myEmotions: '/my-emotions',
    account: '/account',
    login: '/login',
    register: '/register',
    recommendations: '/recommendations',
    specialists: '/specialists',
    reviews: '/reviews',
    testing: '/testing',
    benchmark: '/benchmark',
    components: '/components',
    uiKit: '/ui-kit',
    userAgreement: '/user-agreement',
    test: (testId) => `/testing/${testId}`,
});

export function routePath(route) {
    return route.replace(/^\/+/, '');
}

export function testRoute(testId) {
    return ROUTES.test(testId);
}
