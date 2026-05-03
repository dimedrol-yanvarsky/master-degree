import { useMemo, useState } from 'react';
import { cn } from '../_utils';
import styles from './DataTable.module.css';

const DEFAULT_COLUMNS = [
    { key: 'project', label: 'Проект' },
    { key: 'status', label: 'Статус' },
    { key: 'owner', label: 'Владелец' },
    { key: 'score', label: 'Оценка', align: 'right' },
];

const DEFAULT_ROWS = [
    { id: 1, project: 'UI-кит', status: 'Готово', owner: 'Дизайн', score: 92 },
    { id: 2, project: 'Документация', status: 'Активно', owner: 'Разработка', score: 78 },
    { id: 3, project: 'Графики', status: 'Черновик', owner: 'Данные', score: 61 },
];

function getSortableValue(row, key) {
    const value = row[key];
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return value.toLowerCase();
    return '';
}

export function DataTable({
    columns = DEFAULT_COLUMNS,
    rows = DEFAULT_ROWS,
    variant = 'default',
    sortable = false,
    selectable = false,
    caption,
    density = 'md',
}) {
    const [sort, setSort] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);

    const visibleRows = useMemo(() => {
        if (!sort) return rows;
        return [...rows].sort((a, b) => {
            const aValue = getSortableValue(a, sort.key);
            const bValue = getSortableValue(b, sort.key);
            if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1;
            if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1;
            return 0;
        });
    }, [rows, sort]);

    const toggleSort = (column) => {
        if (!sortable || column.sortable === false) return;
        setSort((current) => {
            if (current?.key !== column.key) return { key: column.key, direction: 'asc' };
            if (current.direction === 'asc') return { key: column.key, direction: 'desc' };
            return null;
        });
    };

    const toggleRow = (id) => {
        setSelectedIds((current) => (
            current.includes(id)
                ? current.filter((selectedId) => selectedId !== id)
                : [...current, id]
        ));
    };

    const allSelected = selectedIds.length === rows.length && rows.length > 0;

    return (
        <div className={cn(styles.wrap, styles[variant], styles[density])}>
            {caption && (
                <div className={styles.caption}>
                    <strong>{caption}</strong>
                    {selectable && <span>Выбрано: {selectedIds.length}</span>}
                </div>
            )}

            <table className={styles.table}>
                <thead>
                    <tr>
                        {selectable && (
                            <th className={styles.checkCell}>
                                <input
                                    type="checkbox"
                                    aria-label="Выбрать все строки"
                                    checked={allSelected}
                                    onChange={() => setSelectedIds(allSelected ? [] : rows.map((row) => row.id))}
                                />
                            </th>
                        )}
                        {columns.map((column) => {
                            const activeSort = sort?.key === column.key ? sort.direction : null;

                            return (
                                <th key={column.key} className={column.align === 'right' ? styles.alignRight : ''}>
                                    {sortable && column.sortable !== false ? (
                                        <button type="button" onClick={() => toggleSort(column)}>
                                            {column.label}
                                            <span>{activeSort === 'asc' ? 'вверх' : activeSort === 'desc' ? 'вниз' : 'сортировать'}</span>
                                        </button>
                                    ) : column.label}
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                <tbody>
                    {visibleRows.map((row) => (
                        <tr key={row.id} className={selectedIds.includes(row.id) ? styles.selected : ''}>
                            {selectable && (
                                <td className={styles.checkCell}>
                                    <input
                                        type="checkbox"
                                        aria-label={`Выбрать ${row.project || row.id}`}
                                        checked={selectedIds.includes(row.id)}
                                        onChange={() => toggleRow(row.id)}
                                    />
                                </td>
                            )}
                            {columns.map((column) => (
                                <td key={column.key} className={column.align === 'right' ? styles.alignRight : ''}>
                                    {row[column.key]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
