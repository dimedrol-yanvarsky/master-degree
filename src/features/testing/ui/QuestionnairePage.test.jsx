import { fireEvent, render, screen } from '@testing-library/react';
import { QuestionnairePage } from './QuestionnairePage';

jest.mock('react-router-dom', () => ({
    Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
}), { virtual: true });

const styles = new Proxy({}, {
    get: (_, key) => key,
});

const questionnaire = {
    id: 'bds',
    title: 'Breakup Distress Scale',
    questions: ['Первый вопрос', 'Второй вопрос'],
    scaleOptions: [
        { value: 1, label: 'Совсем нет' },
        { value: 2, label: 'Немного' },
    ],
};

test('shows server save error instead of silently completing questionnaire', async () => {
    const onComplete = jest.fn(() => Promise.reject(new Error('authentication required')));

    render(<QuestionnairePage test={questionnaire} onComplete={onComplete} styles={styles} />);

    fireEvent.click(screen.getAllByTitle('Немного')[0]);
    fireEvent.click(screen.getAllByTitle('Немного')[1]);
    fireEvent.click(screen.getByRole('button', { name: /Завершить тест/i }));

    expect(await screen.findByText('authentication required')).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledTimes(1);
});
