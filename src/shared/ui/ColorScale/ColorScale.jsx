import { cn } from '../_utils';
import styles from './ColorScale.module.css';

function isDarkShade(shade) {
    return Number(shade.step) >= 500 || shade.dark;
}

export function ColorScale({ colors }) {
    const palettes = colors?.[0]?.shades
        ? colors
        : [{ name: 'Tokens', shades: colors?.map((color) => ({ ...color, step: color.name })) || [] }];

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
