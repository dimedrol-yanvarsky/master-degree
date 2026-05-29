import { cn } from '../_utils';
import styles from './ColorScale.module.css';

function isDarkShade(shade) {
    return Number(shade.step) >= 500 || shade.dark;
}

const DEFAULT_COLORS = [
    { step: 100, value: 'oklch(94% 0.035 145)', hex: '#ddf2dd' },
    { step: 300, value: 'oklch(78% 0.080 145)', hex: '#98c598' },
    { step: 500, value: 'oklch(52% 0.110 145)', hex: '#3b793f' },
    { step: 700, value: 'oklch(38% 0.090 145)', hex: '#1e4e22' },
    { step: 900, value: 'oklch(23% 0.055 145)', hex: '#09230b' },
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
