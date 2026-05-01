import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Topbar } from './Topbar';
import { Sidebar } from './Sidebar';
import { TweaksPanel } from './TweaksPanel';
import { ACCENTS, FONT_PAIRS } from './config';

const DEFAULT_TWEAKS = { radiusScale: 3, accent: 'iris', density: 'compact' };

export default function UIKitPage() {
    const [theme, setTheme] = useState(() => localStorage.getItem('kit_theme') || 'light');
    const [fontKey, setFontKey] = useState(() => localStorage.getItem('kit_font') || 'geist');
    const [tweaksOn, setTweaksOn] = useState(false);
    const [tweaks, setTweaks] = useState(DEFAULT_TWEAKS);

    useEffect(() => { localStorage.setItem('kit_theme', theme); }, [theme]);
    useEffect(() => { localStorage.setItem('kit_font', fontKey); }, [fontKey]);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    useEffect(() => {
        const pair = FONT_PAIRS[fontKey];
        const root = document.documentElement;
        root.style.setProperty('--font-sans', pair.sans);
        root.style.setProperty('--font-mono', pair.mono);
        root.style.setProperty('--font-display', pair.display);
    }, [fontKey]);

    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty('--r-scale', tweaks.radiusScale);
        if (theme === 'minimal') return;

        const a = ACCENTS[tweaks.accent] || ACCENTS.iris;
        const isDark = theme === 'dark';
        const baseL = a.L ?? 60;
        const L = isDark ? Math.max(baseL, 72) : baseL;
        const Lsoft = isDark ? null : Math.max(92, baseL + 30);

        root.style.setProperty('--accent', `oklch(${L}% ${a.c} ${a.hue})`);
        root.style.setProperty('--accent-fg', isDark
            ? `oklch(12% 0.02 ${a.hue})`
            : `oklch(98% 0.01 ${a.hue})`);
        root.style.setProperty('--accent-soft', isDark
            ? `oklch(${L}% ${a.c} ${a.hue} / 0.14)`
            : `oklch(${Lsoft}% ${Math.min(a.c, 0.05)} ${a.hue})`);
        root.style.setProperty('--ring', `oklch(${L}% ${a.c} ${a.hue} / ${isDark ? 0.4 : 0.28})`);
    }, [tweaks, theme]);

    const setTweak = (k, v) => setTweaks(prev => ({ ...prev, [k]: v }));

    return (
        <div className="shell">
            <Topbar
                fontKey={fontKey}
                setFontKey={setFontKey}
                theme={theme}
                setTheme={setTheme}
                tweaksOn={tweaksOn}
                setTweaksOn={setTweaksOn}
            />

            <div className="kit-layout">
                <Sidebar />

                <main className="kit-content">
                    <Outlet />
                </main>
            </div>

            {tweaksOn && (
                <TweaksPanel
                    tweaks={tweaks}
                    setTweak={setTweak}
                    fontKey={fontKey}
                    setFontKey={setFontKey}
                    onClose={() => setTweaksOn(false)}
                />
            )}
        </div>
    );
}
