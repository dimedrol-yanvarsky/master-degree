import { cn } from '../_utils';
import styles from './NetworkGraph.module.css';

const PRESETS = {
    dependency: {
        label: 'Dependency graph',
        nodes: [
            { id: 'A', label: 'UI', x: 58, y: 36, tone: 'accent' },
            { id: 'B', label: 'Forms', x: 166, y: 42 },
            { id: 'C', label: 'Data', x: 268, y: 48 },
            { id: 'D', label: 'Tokens', x: 112, y: 140, tone: 'success' },
            { id: 'E', label: 'Docs', x: 236, y: 146, tone: 'warning' },
        ],
        edges: [['A', 'B'], ['B', 'C'], ['A', 'D'], ['D', 'E'], ['C', 'E'], ['B', 'D']],
    },
    decision: {
        label: 'Decision graph',
        nodes: [
            { id: 'Q', label: 'Question', x: 160, y: 28, tone: 'accent' },
            { id: 'Y', label: 'Yes', x: 74, y: 104, tone: 'success' },
            { id: 'N', label: 'No', x: 246, y: 104, tone: 'danger' },
            { id: 'R', label: 'Review', x: 72, y: 176 },
            { id: 'S', label: 'Skip', x: 246, y: 176 },
        ],
        edges: [['Q', 'Y'], ['Q', 'N'], ['Y', 'R'], ['N', 'S'], ['R', 'S']],
    },
    cluster: {
        label: 'Cluster graph',
        nodes: [
            { id: '1', label: 'Core', x: 82, y: 74, tone: 'accent' },
            { id: '2', label: 'API', x: 152, y: 44 },
            { id: '3', label: 'State', x: 218, y: 82 },
            { id: '4', label: 'Tests', x: 126, y: 148, tone: 'success' },
            { id: '5', label: 'Build', x: 238, y: 154, tone: 'warning' },
            { id: '6', label: 'Lint', x: 58, y: 160 },
        ],
        edges: [['1', '2'], ['2', '3'], ['1', '4'], ['4', '5'], ['3', '5'], ['4', '6'], ['6', '1']],
    },
};

function getNode(nodes, id) {
    return nodes.find((node) => node.id === id);
}

export function NetworkGraph({ variant = 'dependency' }) {
    const graph = PRESETS[variant] || PRESETS.dependency;

    return (
        <figure className={cn(styles.root, styles[variant])}>
            <figcaption>{graph.label}</figcaption>
            <svg viewBox="0 0 320 220" role="img" aria-label={graph.label}>
                <defs>
                    <marker id={`arrow-${variant}`} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                        <path d="M0 0 8 4 0 8Z" />
                    </marker>
                </defs>
                {graph.edges.map(([from, to]) => {
                    const source = getNode(graph.nodes, from);
                    const target = getNode(graph.nodes, to);
                    return (
                        <line
                            key={`${from}-${to}`}
                            className={styles.edge}
                            x1={source.x}
                            y1={source.y}
                            x2={target.x}
                            y2={target.y}
                            markerEnd={`url(#arrow-${variant})`}
                        />
                    );
                })}
                {graph.nodes.map((node) => (
                    <g key={node.id} className={cn(styles.node, node.tone && styles[node.tone])}>
                        <circle cx={node.x} cy={node.y} r="22" />
                        <text x={node.x} y={node.y + 4}>{node.label}</text>
                    </g>
                ))}
            </svg>
        </figure>
    );
}
