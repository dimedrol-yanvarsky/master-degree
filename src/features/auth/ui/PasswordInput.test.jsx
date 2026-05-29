import { fireEvent, render, screen } from '@testing-library/react';
import { PasswordInput } from './PasswordInput';

test('toggles password visibility with the eye button', () => {
    render(<PasswordInput label="Пароль" value="Strong123" onChange={() => {}} />);

    const input = screen.getByLabelText('Пароль');
    const toggle = screen.getByRole('button', { name: 'Показать пароль' });

    expect(input).toHaveAttribute('type', 'password');

    fireEvent.click(toggle);

    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Скрыть пароль' })).toHaveAttribute('aria-pressed', 'true');
});
