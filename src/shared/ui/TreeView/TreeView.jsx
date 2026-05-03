import { KitIcon } from '../Icon';
import styles from './TreeView.module.css';

const DEFAULT_NODES = [
    { label: 'src', children: ['App.jsx', 'index.js'] },
    { label: 'shared', children: ['ui', 'lib'] },
    { label: 'package.json' },
];

export function TreeView({ nodes = DEFAULT_NODES }) {
    return (
        <div className={styles.root} role="tree">
            {nodes.map((node) => (
                <div
                    key={node.label}
                    role="treeitem"
                    aria-expanded={Boolean(node.children)}
                    aria-selected="false">
                    <div className={styles.row}>
                        <KitIcon name={node.children ? 'folder' : 'file'} />
                        {node.label}
                    </div>
                    {node.children && (
                        <div className={styles.children} role="group">
                            {node.children.map((child) => (
                                <div key={child} className={styles.row}>
                                    <KitIcon name="file" />
                                    {child}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
