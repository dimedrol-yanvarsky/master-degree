import { render, screen } from '@testing-library/react';
import { buildEmotionGraphPoints } from '../../entities/emotion';
import { EmotionStateGraph } from './EmotionStateGraph';

test('shows score only for active graph vertices', () => {
    const points = buildEmotionGraphPoints([
        {
            date: '2026-06-03T09:00:00Z',
            supportNeed: 75,
            supportNeedLevel: 2,
            secondarySupportNeedLevel: 3,
            score: 62,
            secondaryScore: 38,
            truth: 0.59,
        },
    ]);

    render(<EmotionStateGraph points={points} />);

    expect(screen.getByText(/Набранный балл:\s*62/i)).toBeInTheDocument();
    expect(screen.queryByText(/Набранный балл:\s*38/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/Степень истинности:/i)).toHaveLength(2);
    expect(screen.getByRole('img', { name: /альтернативный терм/i }).getAttribute('aria-label')).not.toContain('балл');
    expect(screen.getByText('Среда')).toBeInTheDocument();
});

test('uses active vertex colors for the area fill gradient', () => {
    const points = buildEmotionGraphPoints([
        {
            date: '2026-06-03T09:00:00Z',
            supportNeedLevel: 2,
            secondarySupportNeedLevel: 3,
            score: 62,
            secondaryScore: 38,
            truth: 0.59,
        },
        {
            date: '2026-06-04T09:00:00Z',
            supportNeedLevel: 5,
            secondarySupportNeedLevel: 4,
            score: 13,
            secondaryScore: 87,
            truth: 0.85,
        },
    ]);

    const { container } = render(<EmotionStateGraph points={points} />);
    const areaFill = container.querySelector('path[mask]');
    const areaGradient = Array.from(container.querySelectorAll('linearGradient'))
        .find((gradient) => gradient.getAttribute('id')?.endsWith('-area-color'));

    expect(areaGradient).toBeTruthy();
    expect(areaFill?.getAttribute('fill')).toContain('-area-color');
    expect(areaFill?.getAttribute('mask')).toContain('-area-mask');
    expect(Array.from(areaGradient.querySelectorAll('stop')).map((stop) => stop.getAttribute('stop-color'))).toEqual([
        '#f36a1d',
        '#2f7d39',
    ]);
});
