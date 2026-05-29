export function getRecommendationPermissions(status) {
    if (status === 'specialist') {
        return {
            canCreate: true,
            canEdit: true,
            canDelete: true,
            roleLabel: 'Специалист',
            modeLabel: 'Полное управление базой',
        };
    }

    if (status === 'admin') {
        return {
            canCreate: false,
            canEdit: false,
            canDelete: true,
            roleLabel: 'Администратор',
            modeLabel: 'Только управляющее удаление',
        };
    }

    return {
        canCreate: false,
        canEdit: false,
        canDelete: false,
        roleLabel: 'Просмотр',
        modeLabel: 'База доступна только для чтения',
    };
}
