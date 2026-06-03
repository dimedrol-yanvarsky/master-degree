import { render, screen } from '@testing-library/react';
import { CompletedTestPage } from './CompletedTestPage';

jest.mock('react-router-dom', () => ({
    Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
}), { virtual: true });

const styles = new Proxy({}, {
    get: (_, key) => key,
});

test('shows BDS score on completed result page', () => {
    render(
        <CompletedTestPage
            test={{ id: 'bds', title: 'Breakup Distress Scale', questions: [] }}
            result={{
                score: 22,
                scoreLabel: '22 из 64',
                summary: 'Ответы сохранены.',
                domains: null,
                answers: [],
            }}
            styles={styles}
        />
    );

    expect(screen.getByText('Набранный балл')).toBeInTheDocument();
    expect(screen.getByText('22 из 64')).toBeInTheDocument();
});
