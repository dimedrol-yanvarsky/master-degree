import React, { useState } from 'react';
import { Button, GradientButton } from '../../../../shared/ui/Button';
import styles from './ButtonsPage.module.css';

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

const GRADIENT_VARIANTS = [
    { gradient: 'radial', label: 'Радиальный',       className: '.btn-gradient',        hint: 'Радиальная заливка от левого края, вариант по умолчанию.' },
    { gradient: 'conic',  label: 'Два оттенка',      className: '.btn-gradient-conic',  hint: 'Акцентный цвет переходит в соседний голубой оттенок.' },
    { gradient: 'soft',   label: 'Мягкая заливка',   className: '.btn-gradient-soft',   hint: 'Пастельный тональный вариант, чуть плотнее прозрачной кнопки.' },
    { gradient: 'mesh',   label: 'Сетка',            className: '.btn-gradient-mesh',   hint: 'Трехточечная радиальная сетка.' },
    { gradient: 'shine',  label: 'Блик',             className: '.btn-gradient-shine',  hint: 'Металлический блик проходит по диагонали при наведении.' },
    { gradient: 'motion', label: 'Движение',         className: '.btn-gradient-motion', hint: 'Градиент плавно сдвигается при наведении.' },
    { gradient: 'aurora', label: 'Аврора',           className: '.btn-gradient-aurora', hint: 'Плотная основа и светящаяся полоска сверху.' },
    { gradient: 'glow',   label: 'Свечение',         className: '.btn-gradient-glow',   hint: 'Внешнее акцентное свечение усиливается при наведении.' },
    { gradient: 'glass',  label: 'Стекло',           className: '.btn-gradient-glass',  hint: 'Полупрозрачная стеклянная поверхность с размытием.' },
];

const STATE_ROWS = [
    { label: 'Основная',   Component: Button, props: { variant: 'primary' } },
    { label: 'Вторичная',  Component: Button, props: { variant: 'secondary' } },
    { label: 'Прозрачная', Component: Button, props: { variant: 'ghost' } },
    { label: 'Успех',      Component: Button, props: { variant: 'success' } },
    { label: 'Опасная',    Component: Button, props: { variant: 'destructive' } },
    { label: 'Градиент',   Component: GradientButton, props: { gradient: 'radial' } },
];

function GradientDesigner() {
    const TYPES = [
        { id: 'radial',   label: 'Радиальный',       css: (c1, c2, c3) => `radial-gradient(120% 180% at 0% 50%, ${c1} 0%, ${c2} 45%, ${c3} 100%)` },
        { id: 'linear',   label: 'Линейный 135°',    css: (c1, c2, c3) => `linear-gradient(135deg, ${c1} 0%, ${c2} 50%, ${c3} 100%)` },
        { id: 'duo',      label: 'Два оттенка 115°', css: (c1, c2, c3) => `linear-gradient(115deg, ${c1} 0%, ${c2} 55%, ${c3} 100%)` },
        { id: 'mesh',     label: 'Сетка',            css: (c1, c2, c3) =>
            `radial-gradient(60% 130% at 20% 20%, ${c1}, transparent 60%), radial-gradient(70% 140% at 100% 80%, ${c2}, transparent 55%), radial-gradient(80% 120% at 50% 110%, ${c3}, transparent 60%), ${c2}` },
        { id: 'vertical', label: 'Вертикальный',     css: (c1, c2, c3) => `linear-gradient(180deg, ${c1} 0%, ${c2} 50%, ${c3} 100%)` },
    ];

    const PRESETS = [
        { l: 'Ирис',  c: ['#B3A1F2', '#6366F1', '#3730A3'] },
        { l: 'Закат', c: ['#FFD5B5', '#FF6F61', '#8B2F4A'] },
        { l: 'Лес',   c: ['#B8E0C2', '#4D8F6E', '#224E3B'] },
        { l: 'Океан', c: ['#BEE7F2', '#3FB8D6', '#1B4E7E'] },
        { l: 'Слива', c: ['#E8C6E2', '#A94E8E', '#4A1E55'] },
    ];

    const [type, setType] = useState('radial');
    const [c1, setC1] = useState('#B3A1F2');
    const [c2, setC2] = useState('#6366F1');
    const [c3, setC3] = useState('#3730A3');

    const cfg = TYPES.find(t => t.id === type);
    const bg = cfg.css(c1, c2, c3);
    const border = `color-mix(in srgb, ${c3} 72%, black 28%)`;

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
                            ['Начало',   c1, setC1],
                            ['Середина', c2, setC2],
                            ['Конец',    c3, setC3],
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
                        <Button size="sm" style={customGradientStyle}>Маленькая</Button>
                        <Button style={customGradientStyle}>Обычная</Button>
                        <Button size="lg" style={customGradientStyle}>Большая</Button>
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

export function ButtonsPage() {
    return (
        <div>
            <div className="kit-head">
                <div className="kit-eyebrow">КОМПОНЕНТЫ · КНОПКИ</div>
                <h1 className="kit-title">Кнопки</h1>
                <p className="kit-lede">
                    Шесть вариантов: основная, вторичная, прозрачная, успех, опасная и градиентная.
                    Клик запускает круговую волну из курсора.
                </p>
            </div>

            <section className="section">
                <h2 className="section-title">Варианты</h2>
                <div className="demo-row">
                    <Button variant="primary">Основное действие</Button>
                    <Button variant="secondary">Вторичная</Button>
                    <Button variant="ghost">Прозрачная</Button>
                    <Button variant="success" iconLeft={<IconCheck />}>Успех</Button>
                    <Button variant="destructive">Удалить</Button>
                    <GradientButton>Перейти на Pro</GradientButton>
                    <Button variant="link">Ссылка</Button>
                </div>
            </section>

            <section className="section">
                <h2 className="section-title">Градиентные варианты</h2>
                <div className={styles.gradientGrid}>
                    {GRADIENT_VARIANTS.map(g => (
                        <div key={g.gradient} className={`demo-card ${styles.gradientCard}`}>
                            <GradientButton gradient={g.gradient}>{g.label}</GradientButton>
                            <div className={styles.gradientClassName}>{g.className}</div>
                            <div className={styles.gradientHint}>{g.hint}</div>
                        </div>
                    ))}
                </div>

                <div className={styles.sideBySide}>
                    <div className={styles.sideBySideLabel}>
                        рядом · наведите для эффектов
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
                <h2 className="section-title">Пользовательский градиент — конструктор</h2>
                <p className={styles.designerLede}>
                    Выбор типа и трех цветов с живым превью и готовым CSS. Пресеты дают быстрые стартовые точки.
                </p>
                <GradientDesigner />
            </section>

            <section className="section">
                <h2 className="section-title">Размеры</h2>
                <div className="demo-row">
                    <Button variant="primary" size="sm">Маленькая</Button>
                    <Button variant="primary">Обычная</Button>
                    <Button variant="primary" size="lg">Большая</Button>
                    <div className={styles.sizesGap} />
                    <GradientButton size="sm">Маленькая</GradientButton>
                    <GradientButton>Обычная</GradientButton>
                    <GradientButton size="lg">Большая</GradientButton>
                </div>
            </section>

            <section className="section">
                <h2 className="section-title">Состояния</h2>
                <div className={styles.statesGrid}>
                    <div />
                    {['По умолчанию', 'Наведение', 'Фокус', 'Нажатие', 'Отключено'].map(s => (
                        <div key={s} className={styles.stateHeader}>{s}</div>
                    ))}

                    {STATE_ROWS.map(({ label, Component, props }) => (
                        <React.Fragment key={label}>
                            <div className={styles.stateLabel}>{label}</div>
                            <Component {...props}>Кнопка</Component>
                            <Component {...props} style={{ filter: 'brightness(1.05)' }}>Кнопка</Component>
                            <Component
                                {...props}
                                style={{
                                    boxShadow:
                                        'inset 0 0 0 1px var(--btn-ring, var(--accent)),' +
                                        ' 0 0 0 3px color-mix(in srgb, var(--btn-ring, var(--accent)) 18%, transparent)',
                                }}>
                                Кнопка
                            </Component>
                            <Component {...props} style={{ filter: 'brightness(.94)' }}>Кнопка</Component>
                            <Component {...props} disabled>Кнопка</Component>
                        </React.Fragment>
                    ))}
                </div>
            </section>

            <section className="section">
                <h2 className="section-title">С иконками</h2>
                <div className="demo-row">
                    <Button variant="primary" iconLeft={<IconPlus />}>Новый проект</Button>
                    <Button variant="secondary" iconLeft={<IconCheck />}>Одобрено</Button>
                    <Button
                        variant="secondary"
                        iconOnly
                        iconLeft={<IconPlus />}
                        aria-label="Добавить" />
                    <Button variant="ghost" iconRight={<IconChevron />}>Продолжить</Button>
                </div>
            </section>

            <section className="section">
                <h2 className="section-title">Загрузка</h2>
                <div className="demo-row">
                    <Button variant="primary" loading>Сохранение…</Button>
                    <Button variant="secondary" loading>Загрузка</Button>
                </div>
            </section>
        </div>
    );
}
