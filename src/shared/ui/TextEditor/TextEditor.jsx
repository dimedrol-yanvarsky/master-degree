import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { cn } from '../_utils';
import styles from './TextEditor.module.css';

const DEFAULT_HTML = 'Выделите часть этого текста и примените жирное начертание, курсив или подчеркивание.';

const COMMANDS = [
    { id: 'bold', command: 'bold', label: 'Жирный', symbol: 'B' },
    { id: 'italic', command: 'italic', label: 'Курсив', symbol: 'I' },
    { id: 'underline', command: 'underline', label: 'Подчеркнутый', symbol: 'U' },
];

function isEmptyHtml(html) {
    return !String(html || '')
        .replace(/<br\s*\/?>/gi, '')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .trim();
}

export function TextEditor({
    label = 'Редактор текста',
    hint = 'Выделите фрагмент и выберите форматирование на панели.',
    placeholder = 'Начните писать...',
    defaultValue = DEFAULT_HTML,
    value,
    onChange,
    className = '',
    minHeight = 180,
}) {
    const editorId = useId();
    const editorRef = useRef(null);
    const isControlled = value !== undefined;
    const [innerValue, setInnerValue] = useState(defaultValue);
    const [active, setActive] = useState({});
    const [empty, setEmpty] = useState(isEmptyHtml(value ?? defaultValue));
    const currentValue = isControlled ? value : innerValue;

    const selectionInsideEditor = useCallback(() => {
        const selection = window.getSelection?.();
        const node = selection?.anchorNode;
        const host = editorRef.current;

        if (!node || !host) return false;

        const element = node.nodeType === 1 ? node : node.parentElement;
        return Boolean(element && host.contains(element));
    }, []);

    const refreshActiveState = useCallback(() => {
        if (!selectionInsideEditor()) return;

        setActive({
            bold: document.queryCommandState('bold'),
            italic: document.queryCommandState('italic'),
            underline: document.queryCommandState('underline'),
        });
    }, [selectionInsideEditor]);

    const commitValue = useCallback((event) => {
        const nextValue = editorRef.current?.innerHTML || '';

        if (!isControlled) setInnerValue(nextValue);
        setEmpty(isEmptyHtml(nextValue));
        onChange?.(nextValue, event);
    }, [isControlled, onChange]);

    const applyCommand = useCallback((command) => {
        editorRef.current?.focus();
        document.execCommand(command);
        commitValue();
        refreshActiveState();
    }, [commitValue, refreshActiveState]);

    const handlePaste = useCallback((event) => {
        event.preventDefault();
        const text = event.clipboardData.getData('text/plain');
        document.execCommand('insertText', false, text);
        commitValue(event);
    }, [commitValue]);

    useEffect(() => {
        const editor = editorRef.current;
        const nextValue = currentValue || '';

        if (editor && editor.innerHTML !== nextValue) {
            editor.innerHTML = nextValue;
            setEmpty(isEmptyHtml(nextValue));
        }
    }, [currentValue]);

    useEffect(() => {
        document.addEventListener('selectionchange', refreshActiveState);
        return () => document.removeEventListener('selectionchange', refreshActiveState);
    }, [refreshActiveState]);

    return (
        <section className={cn(styles.root, className)}>
            <div className={styles.header}>
                <label className={styles.label} htmlFor={editorId}>{label}</label>
                {hint && <p>{hint}</p>}
            </div>

            <div className={styles.panel}>
                <div className={styles.toolbar} aria-label="Форматирование текста">
                    {COMMANDS.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            className={cn(styles.toolButton, active[item.id] && styles.active)}
                            aria-label={item.label}
                            aria-pressed={Boolean(active[item.id])}
                            title={item.label}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => applyCommand(item.command)}>
                            <span className={styles[item.id]}>{item.symbol}</span>
                        </button>
                    ))}
                </div>

                <div
                    id={editorId}
                    ref={editorRef}
                    className={styles.editor}
                    contentEditable
                    role="textbox"
                    aria-multiline="true"
                    aria-label={label}
                    data-empty={empty ? 'true' : 'false'}
                    data-placeholder={placeholder}
                    style={{ minHeight }}
                    suppressContentEditableWarning
                    onInput={commitValue}
                    onKeyUp={refreshActiveState}
                    onMouseUp={refreshActiveState}
                    onFocus={refreshActiveState}
                    onPaste={handlePaste}
                    dangerouslySetInnerHTML={{ __html: currentValue }}
                />
            </div>
        </section>
    );
}
