import { render, screen } from '@testing-library/react';
import { MyEmotionsPage } from './pages/my-emotions';

test('renders my emotions start page', () => {
    render(<MyEmotionsPage />);
    expect(screen.getByRole('heading', { name: /Мои эмоции/i })).toBeInTheDocument();
});
