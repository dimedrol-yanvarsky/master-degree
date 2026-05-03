import { cn } from '../_utils';
import styles from './ColorScale.module.css';

function isDarkShade(shade) {
    return Number(shade.step) >= 500 || shade.dark;
}

const DEFAULT_COLORS = [
    { step: 100, value: 'oklch(96% 0.03 290)', hex: '#f5efff' },
    { step: 300, value: 'oklch(84% 0.11 290)', hex: '#d4b8ff' },
    { step: 500, value: 'oklch(64% 0.24 290)', hex: '#9658f5' },
    { step: 700, value: 'oklch(47% 0.22 290)', hex: '#6125b3' },
    { step: 900, value: 'oklch(29% 0.13 290)', hex: '#32165d' },
];

export function ColorScale({ colors = DEFAULT_COLORS }) {
    const palettes = colors?.[0]?.shades
        ? colors
        : [{ name: 'Токены', shades: colors?.map((color) => ({ ...color, step: color.name })) || [] }];

    return (
        <div className={styles.root}>
            {palettes.map((palette) => (
                <section className={styles.palette} key={palette.name}>
                    <div className={styles.header}>
                        <span>{palette.name}</span>
                        {palette.description && <small>{palette.description}</small>}
                    </div>
                    <div className={styles.scale}>
                        {palette.shades.map((shade) => (
                            <div
                                key={`${palette.name}-${shade.step}`}
                                className={cn(styles.tile, isDarkShade(shade) && styles.darkText)}
                                style={{ background: shade.value }}>
                                <span className={styles.hex}>{shade.hex}</span>
                                <strong>{shade.step}</strong>
                            </div>
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}
