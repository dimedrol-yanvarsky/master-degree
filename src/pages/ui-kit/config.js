export const ACCENTS = {
    iris:     { label: 'Iris',      hue: 290, c: 0.25,  L: 60, swatch: 'oklch(60% 0.25 290)' },
    navy:     { label: 'Navy Blue', hue: 260, c: 0.10,  L: 38, swatch: 'oklch(38% 0.10 260)' },
    midnight: { label: 'Midnight',  hue: 245, c: 0.06,  L: 28, swatch: 'oklch(28% 0.06 245)' },
    forest:   { label: 'Forest',    hue: 150, c: 0.08,  L: 42, swatch: 'oklch(42% 0.08 150)' },
    emerald:  { label: 'Emerald',   hue: 165, c: 0.10,  L: 46, swatch: 'oklch(46% 0.10 165)' },
    claret:   { label: 'Claret',    hue: 18,  c: 0.12,  L: 42, swatch: 'oklch(42% 0.12 18)'  },
    burgundy: { label: 'Burgundy',  hue: 10,  c: 0.09,  L: 32, swatch: 'oklch(32% 0.09 10)'  },
    sienna:   { label: 'Sienna',    hue: 40,  c: 0.11,  L: 48, swatch: 'oklch(48% 0.11 40)'  },
    bronze:   { label: 'Bronze',    hue: 55,  c: 0.10,  L: 52, swatch: 'oklch(52% 0.10 55)'  },
    ochre:    { label: 'Ochre',     hue: 80,  c: 0.12,  L: 58, swatch: 'oklch(58% 0.12 80)'  },
    slate:    { label: 'Slate',     hue: 240, c: 0.03,  L: 48, swatch: 'oklch(48% 0.03 240)' },
    graphite: { label: 'Graphite',  hue: 270, c: 0.015, L: 34, swatch: 'oklch(34% 0.015 270)' },
    plum:     { label: 'Plum',      hue: 340, c: 0.15,  L: 52, swatch: 'oklch(52% 0.15 340)' },
    teal:     { label: 'Teal',      hue: 195, c: 0.13,  L: 64, swatch: 'oklch(64% 0.13 195)' },
    lime:     { label: 'Lime',      hue: 130, c: 0.20,  L: 72, swatch: 'oklch(72% 0.20 130)' },
    amber:    { label: 'Amber',     hue: 70,  c: 0.18,  L: 75, swatch: 'oklch(75% 0.18 70)'  },
    coral:    { label: 'Coral',     hue: 25,  c: 0.20,  L: 68, swatch: 'oklch(68% 0.20 25)'  },
    ink:      { label: 'Ink',       hue: 270, c: 0.02,  L: 20, swatch: 'oklch(20% 0.02 270)' },
};

export const FONT_PAIRS = {
    'geist': {
        sans: "'Geist', ui-sans-serif, system-ui, sans-serif",
        mono: "'Geist Mono', ui-monospace, monospace",
        display: "'Geist', ui-sans-serif, sans-serif",
        label: 'Geist + Geist Mono',
    },
    'inter-tight': {
        sans: "'Inter Tight', ui-sans-serif, system-ui, sans-serif",
        mono: "'JetBrains Mono', ui-monospace, monospace",
        display: "'Inter Tight', ui-sans-serif, sans-serif",
        label: 'Inter Tight + JetBrains Mono',
    },
    'general-sans': {
        sans: "'General Sans', ui-sans-serif, system-ui, sans-serif",
        mono: "'JetBrains Mono', ui-monospace, monospace",
        display: "'Cabinet Grotesk', 'General Sans', sans-serif",
        label: 'General Sans + Cabinet Grotesk',
    },
};

export const NAV = [
    {
        group: 'Foundations',
        items: [
            { id: 'colors',    label: 'Colors' },
            { id: 'typography', label: 'Typography' },
            { id: 'spacing',   label: 'Spacing & radii' },
            { id: 'motion',    label: 'Motion & animations' },
        ],
    },
    {
        group: 'Forms',
        items: [
            { id: 'buttons',   label: 'Buttons' },
            { id: 'inputs',    label: 'Inputs' },
            { id: 'checkbox',  label: 'Checkbox' },
            { id: 'radio',     label: 'Radio' },
            { id: 'toggle',    label: 'Toggle' },
            { id: 'select',    label: 'Select' },
            { id: 'tabs',      label: 'Tabs' },
            { id: 'segmented', label: 'Segmented' },
            { id: 'advanced-inputs', label: 'Advanced inputs' },
        ],
    },
    {
        group: 'Content',
        items: [
            { id: 'icons',    label: 'Icons' },
            { id: 'cards',    label: 'Cards' },
            { id: 'avatars',  label: 'Avatars & tags' },
            { id: 'table',    label: 'Table' },
            { id: 'charts',   label: 'Charts' },
            { id: 'graph',    label: 'Graph (math)' },
            { id: 'sliders',  label: 'Sliders & progress' },
            { id: 'data',     label: 'Data' },
            { id: 'timeline', label: 'Timeline' },
            { id: 'kanban',   label: 'Kanban' },
        ],
    },
    {
        group: 'Navigation',
        items: [
            { id: 'navbars',     label: 'Navbars' },
            { id: 'breadcrumbs', label: 'Breadcrumbs' },
            { id: 'sidebar',     label: 'Sidebar' },
            { id: 'palette',     label: 'Palette' },
            { id: 'tree',        label: 'Tree' },
        ],
    },
    {
        group: 'Feedback',
        items: [
            { id: 'loaders',   label: 'Loaders' },
            { id: 'skeletons', label: 'Skeletons' },
            { id: 'modal',     label: 'Modal' },
            { id: 'tooltip',   label: 'Tooltip' },
            { id: 'toast',     label: 'Toast' },
            { id: 'dialogs',   label: 'Dialogs' },
            { id: 'drawer',    label: 'Drawer' },
            { id: 'coachmark', label: 'Coachmark' },
        ],
    },
    {
        group: 'Special',
        items: [
            { id: 'user-menu', label: 'UserMenu' },
            { id: 'chat',      label: 'Chat' },
            { id: 'kbd',       label: 'Kbd' },
            { id: 'map',       label: 'Map' },
            { id: 'diff',      label: 'Diff' },
            { id: 'code',      label: 'Code' },
        ],
    },
    {
        group: 'Page Patterns',
        items: [
            { id: 'auth',     label: 'Auth' },
            { id: 'settings', label: 'Settings' },
            { id: 'wizard',   label: 'Wizard' },
            { id: 'pricing',  label: 'Pricing' },
            { id: 'error',    label: 'Error' },
        ],
    },
];
