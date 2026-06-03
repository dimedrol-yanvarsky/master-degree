import { fireEvent, render, screen } from '@testing-library/react';
import { RecommendationInsertPoint } from './RecommendationInsertPoint';

test('shows both insert actions when one line can add a section and a recommendation', () => {
    render(
        <RecommendationInsertPoint
            sectionId="section-1"
            nextSectionNumber="1.1"
            onAddSection={() => {}}
            onAddBlock={() => {}}
        />,
    );

    expect(screen.getByRole('button', { name: /Добавить раздел/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Добавить рекомендацию/i })).toBeInTheDocument();
});

test('submits edited section number', () => {
    const onAddSection = jest.fn();

    render(
        <RecommendationInsertPoint
            nextSectionNumber="3"
            canAddSection
            onAddSection={onAddSection}
        />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Добавить раздел/i }));
    fireEvent.change(screen.getByLabelText(/Номер/i), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText(/Заголовок/i), { target: { value: 'Новый раздел' } });
    fireEvent.click(screen.getByRole('button', { name: /Сохранить/i }));

    expect(onAddSection).toHaveBeenCalledWith('root', {
        number: '2',
        title: 'Новый раздел',
        description: '',
    });
});
