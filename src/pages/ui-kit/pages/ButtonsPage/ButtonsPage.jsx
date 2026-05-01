import React, { useState } from 'react';
import { Button } from '../../../../shared/ui/Button';
import styles from './ButtonsPage.module.css';

/* ---------- icons used on the page ---------- */
function IconChevron() {
    return (
        <svg viewBox="0 0 24 24" fill="none">
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}
function IconPlus() {
    return (
        <svg viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
    );
}
function IconCheck() {
    return (
        <svg viewBox="0 0 24 24" fill="none">
            <path d="M5 12l5 5 9-10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

/* ---------- data tables for the sections ---------- */
const GRADIENT_VARIANTS = [
    { gradient: 'radial', label: 'Radial sweep', className: '.btn-gradient',        hint: 'радиальная заливка от левого края — дефолт' },
    { gradient: 'conic',  label: 'Dual-hue',     className: '.btn-gradient-conic',  hint: 'accent → соседний cyan, плоский' },
    { gradient: 'soft',   label: 'Soft wash',    className: '.btn-gradient-soft',   hint: 'пастельная тональная, чуть плотнее ghost' },
    { gradient: 'mesh',   label: 'Mesh',         className: '.btn-gradient-mesh',   hint: 'трёхточечный radial-mesh' },
    { gradient: 'shine',  label: 'Shine',        className: '.btn-gradient-shine',  hint: 'металлический блик пробегает по диагонали при hover' },
    { gradient: 'motion', label: 'Motion',       className: '.btn-gradient-motion', hint: 'сам градиент панорамируется при hover' },
    { gradient: 'aurora', label: 'Aurora',       className: '.btn-gradient-aurora', hint: 'solid body + светящаяся полоска на верхнем крае' },
    { gradient: 'glow',   label: 'Glow halo',    className: '.btn-gradient-glow',   hint: 'внешнее свечение accent-halo растёт на hover' },
    { gradient: 'glass',  label: 'Glass',        className: '.btn-gradient-glass',  hint: 'полупрозрачное стекло с backdrop-blur' },
];

const STATE_ROWS = [
    { label: 'Primary',     props: { variant: 'primary' } },
    { label: 'Secondary',   props: { variant: 'secondary' } },
    { label: 'Ghost',       props: { variant: 'ghost' } },
    { label: 'Success',     props: { variant: 'success' } },
    { label: 'Destructive', props: { variant: 'destructive' } },
    { label: 'Gradient',    props: { variant: 'gradient', gradient: 'radial' } },
];

/* =========================================================
   Gradient designer — live preview + CSS code
   ========================================================= */
function GradientDesigner() {
    const TYPES = [
        { id: 'radial',   label: 'Radial sweep',  css: (c1, c2, c3) => `radial-gradient(120% 180% at 0% 50%, ${c1} 0%, ${c2} 45%, ${c3} 100%)` },
        { id: 'linear',   label: 'Linear 135°',   css: (c1, c2, c3) => `linear-gradient(135deg, ${c1} 0%, ${c2} 50%, ${c3} 100%)` },
        { id: 'duo',      label: 'Dual-hue 115°', css: (c1, c2, c3) => `linear-gradient(115deg, ${c1} 0%, ${c2} 55%, ${c3} 100%)` },
        { id: 'mesh',     label: 'Mesh',          css: (c1, c2, c3) =>
            `radial-gradient(60% 130% at 20% 20%, ${c1}, transparent 60%), radial-gradient(70% 140% at 100% 80%, ${c2}, transparent 55%), radial-gradient(80% 120% at 50% 110%, ${c3}, transparent 60%), ${c2}` },
        { id: 'vertical', label: 'Vertical',      css: (c1, c2, c3) => `linear-gradient(180deg, ${c1} 0%, ${c2} 50%, ${c3} 100%)` },
    ];
    const PRESETS = [
        { l: 'Iris',   c: ['#B3A1F2', '#6366F1', '#3730A3'] },
        { l: 'Sunset', c: ['#FFD5B5', '#FF6F61', '#8B2F4A'] },
        { l: 'Forest', c: ['#B8E0C2', '#4D8F6E', '#224E3B'] },
        { l: 'Ocean',  c: ['#BEE7F2', '#3FB8D6', '#1B4E7E'] },
        { l: 'Plum',   c: ['#E8C6E2', '#A94E8E', '#4A1E55'] },
    ];

    const [type, setType] = useState('radial');
    const [c1, setC1] = useState('#B3A1F2');
    const [c2, setC2] = useState('#6366F1');
    const [c3, setC3] = useState('#3730A3');

    const cfg = TYPES.find(t => t.id === type);
    const bg = cfg.css(c1, c2, c3);
    const border = `color-mix(in srgb, ${c3} 72%, black 28%)`;

    /* Custom gradient passed as inline style — Button has no variant that
       can express arbitrary 3-color combos, so we override background,
       border, color, box-shadow, and --btn-ring through inline style. */
    const customGradientStyle = {
        background: bg,
        border: `1px solid ${border}`,
        color: '#fff',
        boxShadow: `inset 0 1px 0 rgba(255,255,255,.22), 0 2px 10px ${c2}50`,
        '--btn-ring': border,
    };

    return (
        <div className={`demo-card ${styles.designerCard}`}>
            <div className={styles.designerGrid}>
                <div className={styles.designerControls}>
                    <div>
                        <div className={styles.controlLabel}>Тип</div>
                        <div className={styles.radioGroup}>
                            {TYPES.map(t => (
                                <label key={t.id} className={`rd ${styles.radioRow}`}>
                                    <input
                                        type="radio"
                                        name="grad-type"
                                        checked={type === t.id}
                                        onChange={() => setType(t.id)} />
                                    <span className="rd-mark" />
                                    <span className={styles.radioText}>{t.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <div className={styles.controlLabel}>Цвета</div>
                        {[
                            ['Start',  c1, setC1],
                            ['Middle', c2, setC2],
                            ['End',    c3, setC3],
                        ].map(([label, val, setter]) => (
                            <div key={label} className={styles.colorRow}>
                                <label
                                    className={styles.colorSwatch}
                                    style={{ background: val }}>
                                    <input
                                        type="color"
                                        value={val}
                                        onChange={e => setter(e.target.value)}
                                        className={styles.colorInput} />
                                </label>
                                <div className={styles.colorField}>
                                    <div className={styles.colorLabel}>{label}</div>
                                    <input
                                        className={`input ${styles.colorHex}`}
                                        value={val}
                                        onChange={e => setter(e.target.value)} />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div>
                        <div className={styles.controlLabel}>Пресеты</div>
                        <div className={styles.presets}>
                            {PRESETS.map(p => (
                                <button
                                    key={p.l}
                                    onClick={() => { setC1(p.c[0]); setC2(p.c[1]); setC3(p.c[2]); }}
                                    className={styles.presetChip}>
                                    <span
                                        className={styles.presetDot}
                                        style={{ background: `linear-gradient(135deg, ${p.c[0]}, ${p.c[1]} 50%, ${p.c[2]})` }} />
                                    {p.l}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div>
                    <div className={styles.previewStage}>
                        <Button size="sm" style={customGradientStyle}>Small</Button>
                        <Button style={customGradientStyle}>Default</Button>
                        <Button size="lg" style={customGradientStyle}>Large</Button>
                    </div>
                    <pre className={styles.previewCode}>
{`background: ${bg};
border: 1px solid ${border};`}
                    </pre>
                </div>
            </div>
        </div>
    );
}

/* =========================================================
   Buttons page
   ========================================================= */
export function ButtonsPage() {
    return (
        <div>
            <div className="kit-head">
                <div className="kit-eyebrow">COMPONENTS · BUTTONS</div>
                <h1 className="kit-title">Кнопки</h1>
                <p className="kit-lede">
                    Шесть вариантов: primary, secondary, ghost, success, destructive, gradient.
                    Клик → круговая волна из курсора.
                </p>
            </div>

            <section className="section">
                <h2 className="section-title">Variants</h2>
                <div className="demo-row">
                    <Button variant="primary">Primary action</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="success" iconLeft={<IconCheck />}>Success</Button>
                    <Button variant="destructive">Delete</Button>
                    <Button variant="gradient">Upgrade to Pro</Button>
                    <Button variant="link">Link</Button>
                </div>
            </section>

            <section className="section">
                <h2 className="section-title">Gradient variants</h2>
                <div className={styles.gradientGrid}>
                    {GRADIENT_VARIANTS.map(g => (
                        <div key={g.gradient} className={`demo-card ${styles.gradientCard}`}>
                            <Button variant="gradient" gradient={g.gradient}>{g.label}</Button>
                            <div className={styles.gradientClassName}>{g.className}</div>
                            <div className={styles.gradientHint}>{g.hint}</div>
                        </div>
                    ))}
                </div>

                <div className={styles.sideBySide}>
                    <div className={styles.sideBySideLabel}>
                        side-by-side · наведите для эффектов
                    </div>
                    <div className={`demo-row ${styles.sideBySideRow}`}>
                        {GRADIENT_VARIANTS.map(g => (
                            <Button
                                key={g.gradient}
                                variant="gradient"
                                gradient={g.gradient}
                                size="sm">
                                {g.label.split(' ')[0]}
                            </Button>
                        ))}
                    </div>
                </div>
            </section>

            <section className="section">
                <h2 className="section-title">Custom gradient — designer</h2>
                <p className={styles.designerLede}>
                    Выбор типа + три цвета с живым превью и готовым CSS. Пресеты — стартовые точки.
                </p>
                <GradientDesigner />
            </section>

            <section className="section">
                <h2 className="section-title">Sizes</h2>
                <div className="demo-row">
                    <Button variant="primary" size="sm">Small</Button>
                    <Button variant="primary">Default</Button>
                    <Button variant="primary" size="lg">Large</Button>
                    <div className={styles.sizesGap} />
                    <Button variant="gradient" size="sm">Small</Button>
                    <Button variant="gradient">Default</Button>
                    <Button variant="gradient" size="lg">Large</Button>
                </div>
            </section>

            <section className="section">
                <h2 className="section-title">States</h2>
                <div className={styles.statesGrid}>
                    <div />
                    {['Default', 'Hover', 'Focus', 'Active', 'Disabled'].map(s => (
                        <div key={s} className={styles.stateHeader}>{s}</div>
                    ))}

                    {STATE_ROWS.map(({ label, props }) => (
                        <React.Fragment key={label}>
                            <div className={styles.stateLabel}>{label}</div>
                            <Button {...props}>Button</Button>
                            <Button {...props} style={{ filter: 'brightness(1.05)' }}>Button</Button>
                            <Button
                                {...props}
                                style={{
                                    boxShadow:
                                        'inset 0 0 0 1px var(--btn-ring, var(--accent)),' +
                                        ' 0 0 0 3px color-mix(in srgb, var(--btn-ring, var(--accent)) 18%, transparent)',
                                }}>
                                Button
                            </Button>
                            <Button {...props} style={{ filter: 'brightness(.94)' }}>Button</Button>
                            <Button {...props} disabled>Button</Button>
                        </React.Fragment>
                    ))}
                </div>
            </section>

            <section className="section">
                <h2 className="section-title">With icons</h2>
                <div className="demo-row">
                    <Button variant="primary" iconLeft={<IconPlus />}>New project</Button>
                    <Button variant="secondary" iconLeft={<IconCheck />}>Approved</Button>
                    <Button
                        variant="secondary"
                        iconOnly
                        iconLeft={<IconPlus />}
                        aria-label="Add" />
                    <Button variant="ghost" iconRight={<IconChevron />}>Continue</Button>
                </div>
            </section>

            <section className="section">
                <h2 className="section-title">Loading</h2>
                <div className="demo-row">
                    <Button variant="primary" loading>Saving…</Button>
                    <Button variant="secondary" loading>Loading</Button>
                </div>
            </section>
        </div>
    );
}
