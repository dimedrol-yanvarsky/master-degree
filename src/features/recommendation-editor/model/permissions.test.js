import { getRecommendationPermissions } from './permissions';

test('allows specialist to create, edit and delete recommendations', () => {
    expect(getRecommendationPermissions('specialist')).toMatchObject({
        canCreate: true,
        canEdit: true,
        canDelete: true,
    });
});

test('allows administrator only to delete recommendations', () => {
    expect(getRecommendationPermissions('admin')).toMatchObject({
        canCreate: false,
        canEdit: false,
        canDelete: true,
    });
});

test('keeps clients and guests in readonly mode', () => {
    expect(getRecommendationPermissions('client')).toMatchObject({
        canCreate: false,
        canEdit: false,
        canDelete: false,
    });
    expect(getRecommendationPermissions(null)).toMatchObject({
        canCreate: false,
        canEdit: false,
        canDelete: false,
    });
});
