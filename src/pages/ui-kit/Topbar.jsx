import { FONT_PAIRS } from './config';

export function Topbar({ fontKey, setFontKey, theme, setTheme, tweaksOn, setTweaksOn }) {
    return (
        <header className="topbar">
            <div className="kit-brand">
                <div className="kit-mark">K</div>
                <span>UI-кит</span>
                <small>— нейтральный современный · v0.1</small>
            </div>

            <div className="top-controls">
                <div className="font-switch">
                    <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10.5,
                        textTransform: 'uppercase',
                        letterSpacing: 0,
                    }}>шрифт</span>
                    <select value={fontKey} onChange={e => setFontKey(e.target.value)}>
                        {Object.entries(FONT_PAIRS).map(([k, p]) => (
                            <option key={k} value={k}>{p.label}</option>
                        ))}
                    </select>
                </div>

                <div className="theme-switch" role="tablist">
                    <button className={theme === 'minimal' ? 'active' : ''} onClick={() => setTheme('minimal')}>
                        <span style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            border: '1px solid var(--fg-3)',
                            background: '#fff',
                            display: 'inline-block',
                        }} />
                        Минимальная
                    </button>
                    <button className={theme === 'light' ? 'active' : ''} onClick={() => setTheme('light')}>
                        <span style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: 'var(--accent)',
                            display: 'inline-block',
                        }} />
                        Светлая
                    </button>
                    <button className={theme === 'dark' ? 'active' : ''} onClick={() => setTheme('dark')}>
                        <span style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: '#09090B',
                            border: '1px solid var(--border-2)',
                            display: 'inline-block',
                        }} />
                        Темная
                    </button>
                </div>

                <button
                    onClick={() => setTweaksOn(v => !v)}
                    style={{
                        background: tweaksOn ? 'var(--accent)' : 'transparent',
                        color: tweaksOn ? 'var(--accent-fg)' : 'var(--fg-2)',
                        border: '1px solid var(--border)',
                        padding: '6px 12px',
                        borderRadius: 'var(--r-2)',
                        fontSize: 12.5,
                        cursor: 'pointer',
                        fontFamily: 'var(--font-mono)',
                        textTransform: 'uppercase',
                        letterSpacing: 0,
                    }}>
                    настройки
                </button>
            </div>
        </header>
    );
}
