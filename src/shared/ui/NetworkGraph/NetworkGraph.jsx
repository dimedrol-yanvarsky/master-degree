import { cn } from '../_utils';
import styles from './NetworkGraph.module.css';

const PRESETS = {
    dependency: {
        label: 'Граф зависимостей',
        nodes: [
            { id: 'A', label: 'Инт.', x: 58, y: 36, tone: 'accent' },
            { id: 'B', label: 'Формы', x: 166, y: 42 },
            { id: 'C', label: 'Данные', x: 268, y: 48 },
            { id: 'D', label: 'Токены', x: 112, y: 140, tone: 'success' },
            { id: 'E', label: 'Док.', x: 236, y: 146, tone: 'warning' },
        ],
        edges: [['A', 'B'], ['B', 'C'], ['A', 'D'], ['D', 'E'], ['C', 'E'], ['B', 'D']],
    },
    decision: {
        label: 'Граф решения',
        nodes: [
            { id: 'Q', label: 'Вопрос', x: 160, y: 28, tone: 'accent' },
            { id: 'Y', label: 'Да', x: 74, y: 104, tone: 'success' },
            { id: 'N', label: 'Нет', x: 246, y: 104, tone: 'danger' },
            { id: 'R', label: 'Ревью', x: 72, y: 176 },
            { id: 'S', label: 'Пропуск', x: 246, y: 176 },
        ],
        edges: [['Q', 'Y'], ['Q', 'N'], ['Y', 'R'], ['N', 'S'], ['R', 'S']],
    },
    cluster: {
        label: 'Кластерный граф',
        nodes: [
            { id: '1', label: 'Ядро', x: 82, y: 74, tone: 'accent' },
            { id: '2', label: 'API', x: 152, y: 44 },
            { id: '3', label: 'Сост.', x: 218, y: 82 },
            { id: '4', label: 'Тесты', x: 126, y: 148, tone: 'success' },
            { id: '5', label: 'Сборка', x: 238, y: 154, tone: 'warning' },
            { id: '6', label: 'Линт', x: 58, y: 160 },
        ],
        edges: [['1', '2'], ['2', '3'], ['1', '4'], ['4', '5'], ['3', '5'], ['4', '6'], ['6', '1']],
    },
    treeVertical: {
        label: 'Вертикальное дерево',
        nodes: [
            { id: 'root', label: 'Старт', x: 160, y: 30, tone: 'accent' },
            { id: 'a', label: 'Аудит', x: 82, y: 96, tone: 'success' },
            { id: 'b', label: 'Сборка', x: 238, y: 96 },
            { id: 'a1', label: 'Токены', x: 48, y: 168 },
            { id: 'a2', label: 'A11y', x: 118, y: 168 },
            { id: 'b1', label: 'Демо', x: 202, y: 168 },
            { id: 'b2', label: 'Документы', x: 272, y: 168, tone: 'warning' },
        ],
        edges: [['root', 'a'], ['root', 'b'], ['a', 'a1'], ['a', 'a2'], ['b', 'b1'], ['b', 'b2']],
    },
    treeHorizontal: {
        label: 'Горизонтальное дерево',
        nodes: [
            { id: 'root', label: 'Кит', x: 42, y: 110, tone: 'accent' },
            { id: 'forms', label: 'Формы', x: 132, y: 56, tone: 'success' },
            { id: 'data', label: 'Данные', x: 132, y: 164 },
            { id: 'input', label: 'Поле', x: 244, y: 28 },
            { id: 'select', label: 'Список', x: 244, y: 86 },
            { id: 'table', label: 'Таблица', x: 244, y: 140 },
            { id: 'chart', label: 'График', x: 244, y: 196, tone: 'warning' },
        ],
        edges: [['root', 'forms'], ['root', 'data'], ['forms', 'input'], ['forms', 'select'], ['data', 'table'], ['data', 'chart']],
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
                            pathLength="1"
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
