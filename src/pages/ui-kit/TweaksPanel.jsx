import { ACCENTS, FONT_PAIRS } from './config';

const FONT_OPTIONS = Object.entries(FONT_PAIRS);
const DENSITY_LABELS = {
    compact: 'Плотно',
    cozy: 'Удобно',
    roomy: 'Свободно',
};

export function TweaksPanel({ tweaks, setTweak, onClose, fontKey, setFontKey }) {
    return (
        <div id="tweaks-panel" className="visible">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontWeight: 500 }}>Настройки вида</div>
                <button onClick={onClose} aria-label="Закрыть настройки вида" style={{ background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--fg-3)', fontSize: 16 }}>x</button>
            </div>

            <div style={{ padding: '10px 0', borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0, color: 'var(--fg-3)', marginBottom: 8 }}>Шрифт</div>
                <select
                    value={fontKey}
                    onChange={event => setFontKey(event.target.value)}
                    style={{ width: '100%', height: 34, border: '1px solid var(--border-2)', borderRadius: 'var(--r-md)', background: 'var(--bg)', color: 'var(--fg)', font: 'inherit', padding: '0 10px' }}>
                    {FONT_OPTIONS.map(([key, pair]) => <option key={key} value={key}>{pair.label}</option>)}
                </select>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--fg-4)', marginTop: 8 }}>
                    Обновляет --font-sans, --font-display и --font-mono.
                </div>
            </div>

            <div style={{ padding: '10px 0', borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0, color: 'var(--fg-3)', marginBottom: 8 }}>Акцент</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {Object.entries(ACCENTS).map(([key, accent]) => (
                        <button
                            key={key}
                            onClick={() => setTweak('accent', key)}
                            title={accent.label}
                            aria-label={accent.label}
                            style={{ width: 26, height: 26, borderRadius: '50%', background: accent.swatch, border: tweaks.accent === key ? '2px solid var(--fg)' : '2px solid var(--border)', cursor: 'pointer', padding: 0, outline: tweaks.accent === key ? '2px solid var(--bg)' : 'none', outlineOffset: -4 }} />
                    ))}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--fg-4)', marginTop: 8 }}>
                    {ACCENTS[tweaks.accent]?.label || 'Ирис'} / OKLCH
                </div>
            </div>

            <div style={{ padding: '10px 0', borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0, color: 'var(--fg-3)' }}>Радиус углов</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)' }}>{tweaks.radiusScale}x</div>
                </div>
                <input type="range" min="0" max="3" step="0.25" value={tweaks.radiusScale} onChange={event => setTweak('radiusScale', +event.target.value)} style={{ width: '100%', accentColor: 'var(--accent)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-4)', marginTop: 2 }}>
                    <span>остро</span><span>мягко</span><span>капсула</span>
                </div>
            </div>

            <div style={{ padding: '10px 0', borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0, color: 'var(--fg-3)', marginBottom: 8 }}>Плотность</div>
                <div className="segmented" style={{ width: '100%' }}>
                    {['compact', 'cozy', 'roomy'].map(density => (
                        <button
                            key={density}
                            className={tweaks.density === density ? 'active' : ''}
                            onClick={() => {
                                setTweak('density', density);
                                const scale = density === 'compact' ? 0.88 : density === 'roomy' ? 1.12 : 1;
                                document.documentElement.style.fontSize = String(16 * scale) + 'px';
                            }}
                            style={{ flex: 1 }}>
                            {DENSITY_LABELS[density]}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
