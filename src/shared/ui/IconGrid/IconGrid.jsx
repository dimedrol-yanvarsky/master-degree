import { KitIcon } from '../Icon';
import { cn } from '../_utils';
import styles from './IconGrid.module.css';

const DEFAULT_ICONS = [
    'search', 'plus', 'check', 'close', 'menu', 'chevron', 'settings', 'filter',
    'user', 'bell', 'mail', 'lock', 'eye', 'shield', 'home', 'calendar',
    'clock', 'folder', 'file', 'download', 'upload', 'edit', 'trash', 'copy',
    'link', 'command', 'spark', 'warning', 'info', 'help', 'trend', 'chart',
    'table', 'database', 'terminal', 'code', 'layers', 'grid', 'image', 'graph',
    'arrowLeft', 'arrowRight', 'play', 'pause', 'refresh', 'heart', 'star',
];

export function IconGrid({ icons = DEFAULT_ICONS }) {
    return (
        <div className={styles.grid}>
            {icons.map((name) => (
                <button
                    key={name}
                    type="button"
                    className={cn(styles.tile, name === 'spark' && styles.highlight)}>
                    <span className={styles.glyph}>
                        <KitIcon name={name} size={22} />
                    </span>
                    <span className={styles.name}>{name}</span>
                </button>
            ))}
        </div>
    );
}
