import { render, screen } from '@testing-library/react';
import { RecommendationBlock } from './RecommendationBlock';

const block = {
    id: 'block-1',
    title: 'Документ можно читать подряд',
    content: 'Содержание рекомендации.',
};

const permissions = {
    canEdit: false,
    canDelete: false,
};

test('shows selection checkbox for an unassigned recommendation in assignment mode', () => {
    render(
        <RecommendationBlock
            block={block}
            permissions={permissions}
            editingId={null}
            selectionMode
        />,
    );

    expect(screen.getByLabelText(/Выбрать/i)).toBeInTheDocument();
});

test('hides selection checkbox when recommendation is already assigned to every selected client', () => {
    render(
        <RecommendationBlock
            block={block}
            permissions={permissions}
            editingId={null}
            selectionMode
            assignedAssignment={{ id: 'assignment-1' }}
            isFullyAssigned
        />,
    );

    expect(screen.queryByLabelText(/Выбрать/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Уже назначена/i)).toBeInTheDocument();
});

test('keeps selection checkbox when recommendation is assigned only to part of selected clients', () => {
    render(
        <RecommendationBlock
            block={block}
            permissions={permissions}
            editingId={null}
            selectionMode
            assignedAssignment={{ id: 'assignment-1' }}
            isPartiallyAssigned
        />,
    );

    expect(screen.getByLabelText(/Выбрать/i)).toBeInTheDocument();
    expect(screen.getByText(/Назначена части клиентов/i)).toBeInTheDocument();
});
