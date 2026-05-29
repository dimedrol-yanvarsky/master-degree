import { getSpecialistWorkRequestState } from './permissions';

test('opens auth prompt for guest specialist work request', () => {
    expect(getSpecialistWorkRequestState({ isAuth: false, status: null })).toMatchObject({
        disabled: false,
        requiresAuth: true,
        label: 'Работать',
    });
});

test('disables specialist work request for admins and specialists', () => {
    expect(getSpecialistWorkRequestState({ isAuth: true, status: 'admin' })).toMatchObject({
        disabled: true,
        requiresAuth: false,
    });
    expect(getSpecialistWorkRequestState({ isAuth: true, status: 'specialist' })).toMatchObject({
        disabled: true,
        requiresAuth: false,
    });
});

test('allows clients to request specialist work', () => {
    expect(getSpecialistWorkRequestState({ isAuth: true, status: 'client' })).toMatchObject({
        disabled: false,
        requiresAuth: false,
    });
});
