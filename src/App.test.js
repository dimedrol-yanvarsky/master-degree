import { render, screen } from '@testing-library/react';
import { HomePage } from './pages/home';

jest.mock('react-router-dom', () => ({
    Link: ({ to, children, ...props }) => {
        const React = require('react');
        return React.createElement('a', { href: to, ...props }, children);
    },
}), { virtual: true });

test('renders ui kit entry link', () => {
    render(<HomePage />);
    const linkElement = screen.getByText(/Открыть UI Kit/i);
    expect(linkElement).toBeInTheDocument();
});
