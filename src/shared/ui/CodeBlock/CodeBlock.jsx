import { useState } from 'react';
import styles from './CodeBlock.module.css';

/* Very small JSX highlighter: splits into tag names, attribute names,
   attribute values, and plain text. Good enough for usage examples. */
function highlightJsx(source) {
    const tokens = [];
    const re = /(<\/?[A-Za-z][A-Za-z0-9]*)|(\s[A-Za-z-]+)(?==)|(=)|("[^"]*"|'[^']*'|\{[^}]*\})|(\/?>)/g;
    let last = 0;
    let m;
    while ((m = re.exec(source))) {
        if (m.index > last) tokens.push({ t: 'text', v: source.slice(last, m.index) });
        if (m[1]) tokens.push({ t: 'tag', v: m[1] });
        else if (m[2]) tokens.push({ t: 'attr', v: m[2] });
        else if (m[3]) tokens.push({ t: 'eq', v: m[3] });
        else if (m[4]) tokens.push({ t: 'value', v: m[4] });
        else if (m[5]) tokens.push({ t: 'tag', v: m[5] });
        last = re.lastIndex;
    }
    if (last < source.length) tokens.push({ t: 'text', v: source.slice(last) });
    return tokens;
}

export function CodeBlock({ code, language = 'jsx', filename }) {
    const [copied, setCopied] = useState(false);
    const tokens = highlightJsx(code);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
        } catch {
            /* ignore */
        }
    };

    return (
        <div className={styles.block}>
            <div className={styles.header}>
                <span className={styles.lang}>{filename || language}</span>
                <button type="button" onClick={copy} className={styles.copy}>
                    {copied ? 'copied' : 'copy'}
                </button>
            </div>
            <pre className={styles.pre}>
                <code className={styles.code}>
                    {tokens.map((tk, i) => (
                        <span key={i} className={styles[tk.t]}>{tk.v}</span>
                    ))}
                </code>
            </pre>
        </div>
    );
}
