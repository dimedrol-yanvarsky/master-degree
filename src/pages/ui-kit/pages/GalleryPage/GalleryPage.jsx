import {
    AuthCard,
    Avatar,
    AvatarStack,
    Badge,
    Breadcrumbs,
    Button,
    Card,
    ChatPanel,
    Checkbox,
    Coachmark,
    CodePanel,
    ColorScale,
    CommandPalette,
    DataTable,
    DialogPreview,
    DiffView,
    Drawer,
    ErrorState,
    GraphPlot,
    IconGrid,
    Input,
    KanbanBoard,
    Kbd,
    KitIcon,
    Loader,
    MiniChart,
    MiniMap,
    Modal,
    Navbar,
    NetworkGraph,
    PricingCards,
    Progress,
    Radio,
    SegmentedControl,
    Select,
    SettingsPanel,
    SidebarNav,
    Skeleton,
    Slider,
    SpacingScale,
    StatCard,
    SteppedProgress,
    Tabs,
    Textarea,
    Timeline,
    Toast,
    Toggle,
    Tooltip,
    TreeView,
    TypographyScale,
    UserMenu,
    WizardSteps,
} from '../../../../shared/ui/kit';
import styles from './GalleryPage.module.css';

const COLORS = [
    { name: 'Iris', description: 'Primary accent', shades: [
        { step: 100, value: 'oklch(96% 0.03 290)', hex: '#f5efff' },
        { step: 200, value: 'oklch(91% 0.06 290)', hex: '#e8d9ff' },
        { step: 300, value: 'oklch(84% 0.11 290)', hex: '#d4b8ff' },
        { step: 400, value: 'oklch(74% 0.18 290)', hex: '#b889ff' },
        { step: 500, value: 'oklch(64% 0.24 290)', hex: '#9658f5' },
        { step: 600, value: 'oklch(56% 0.25 290)', hex: '#7b35dc' },
        { step: 700, value: 'oklch(47% 0.22 290)', hex: '#6125b3' },
        { step: 800, value: 'oklch(38% 0.18 290)', hex: '#481c85' },
        { step: 900, value: 'oklch(29% 0.13 290)', hex: '#32165d' },
    ] },
    { name: 'Teal', description: 'Info / data', shades: [
        { step: 100, value: 'oklch(96% 0.04 195)', hex: '#e9fbff' },
        { step: 200, value: 'oklch(91% 0.07 195)', hex: '#c9f3fb' },
        { step: 300, value: 'oklch(84% 0.10 195)', hex: '#96e3ef' },
        { step: 400, value: 'oklch(74% 0.13 195)', hex: '#55c9db' },
        { step: 500, value: 'oklch(64% 0.13 195)', hex: '#1faabe' },
        { step: 600, value: 'oklch(54% 0.12 195)', hex: '#16889a' },
        { step: 700, value: 'oklch(45% 0.10 195)', hex: '#146c7a' },
        { step: 800, value: 'oklch(36% 0.08 195)', hex: '#13515b' },
        { step: 900, value: 'oklch(27% 0.06 195)', hex: '#0f3940' },
    ] },
    { name: 'Emerald', description: 'Success', shades: [
        { step: 100, value: 'oklch(95% 0.04 155)', hex: '#e9f9ef' },
        { step: 200, value: 'oklch(89% 0.08 155)', hex: '#c8f0d8' },
        { step: 300, value: 'oklch(80% 0.12 155)', hex: '#91dfb5' },
        { step: 400, value: 'oklch(70% 0.15 155)', hex: '#55c889' },
        { step: 500, value: 'oklch(60% 0.16 155)', hex: '#25aa63' },
        { step: 600, value: 'oklch(51% 0.15 155)', hex: '#19864d' },
        { step: 700, value: 'oklch(43% 0.13 155)', hex: '#14693d' },
        { step: 800, value: 'oklch(34% 0.10 155)', hex: '#104d30' },
        { step: 900, value: 'oklch(25% 0.07 155)', hex: '#0b3421' },
    ] },
    { name: 'Amber', description: 'Warning', shades: [
        { step: 100, value: 'oklch(97% 0.05 80)', hex: '#fff6d7' },
        { step: 200, value: 'oklch(93% 0.09 80)', hex: '#ffe8a4' },
        { step: 300, value: 'oklch(88% 0.13 78)', hex: '#ffd66d' },
        { step: 400, value: 'oklch(82% 0.15 76)', hex: '#f9bd3c' },
        { step: 500, value: 'oklch(74% 0.15 74)', hex: '#df9c16' },
        { step: 600, value: 'oklch(63% 0.14 70)', hex: '#b97510' },
        { step: 700, value: 'oklch(52% 0.12 64)', hex: '#8e560f' },
        { step: 800, value: 'oklch(41% 0.10 58)', hex: '#673d10' },
        { step: 900, value: 'oklch(30% 0.08 54)', hex: '#44280d' },
    ] },
    { name: 'Coral', description: 'Danger / warm action', shades: [
        { step: 100, value: 'oklch(95% 0.04 25)', hex: '#fff0ec' },
        { step: 200, value: 'oklch(89% 0.08 25)', hex: '#ffd3c7' },
        { step: 300, value: 'oklch(80% 0.13 25)', hex: '#ffa899' },
        { step: 400, value: 'oklch(70% 0.18 25)', hex: '#ff7464' },
        { step: 500, value: 'oklch(59% 0.20 25)', hex: '#e84539' },
        { step: 600, value: 'oklch(50% 0.19 25)', hex: '#bd2f2b' },
        { step: 700, value: 'oklch(41% 0.16 25)', hex: '#912622' },
        { step: 800, value: 'oklch(33% 0.12 25)', hex: '#681f1c' },
        { step: 900, value: 'oklch(25% 0.09 25)', hex: '#451715' },
    ] },
    { name: 'Slate', description: 'Neutral UI', shades: [
        { step: 100, value: 'oklch(96% 0.004 245)', hex: '#f1f3f6' },
        { step: 200, value: 'oklch(90% 0.006 245)', hex: '#dfe4ea' },
        { step: 300, value: 'oklch(82% 0.008 245)', hex: '#c5ccd7' },
        { step: 400, value: 'oklch(70% 0.010 245)', hex: '#9ea8b7' },
        { step: 500, value: 'oklch(58% 0.012 245)', hex: '#778292' },
        { step: 600, value: 'oklch(48% 0.014 245)', hex: '#5e6878' },
        { step: 700, value: 'oklch(38% 0.012 245)', hex: '#454d5b' },
        { step: 800, value: 'oklch(28% 0.010 245)', hex: '#2f3540' },
        { step: 900, value: 'oklch(19% 0.008 245)', hex: '#1d222b' },
    ] },
];

const tableColumns = [
    { key: 'project', label: 'Project' },
    { key: 'status', label: 'Status' },
    { key: 'owner', label: 'Owner' },
    { key: 'date', label: 'Due' },
    { key: 'score', label: 'Score', align: 'right' },
];

const tableRows = [
    { id: 1, project: 'UI Kit', status: <Badge tone="success">Ready</Badge>, owner: 'Design', date: 'May 12', score: 92 },
    { id: 2, project: 'CLI loader', status: <Badge tone="warning">Draft</Badge>, owner: 'Platform', date: 'May 18', score: 61 },
    { id: 3, project: 'Docs', status: <Badge tone="accent">Active</Badge>, owner: 'DX', date: 'May 22', score: 78 },
    { id: 4, project: 'Charts', status: <Badge tone="danger">Risk</Badge>, owner: 'Data', date: 'May 28', score: 44 },
];

const selectOptions = [
    { value: 'weekly', label: 'Weekly', description: 'Digest every Monday' },
    { value: 'daily', label: 'Daily', description: 'High-signal project feed' },
    { value: 'manual', label: 'Manual', description: 'Only when requested' },
    { value: 'paused', label: 'Paused', description: 'Disabled example', disabled: true },
];

const tabsPreview = [
    {
        value: 'summary',
        label: 'Summary',
        badge: '4',
        content: 'A focused overview with the main decision, risk level, and the next action.',
    },
    {
        value: 'activity',
        label: 'Activity',
        badge: '12',
        content: 'Recent updates, owner changes, and review notes live in this panel.',
    },
    {
        value: 'files',
        label: 'Files',
        description: 'Exports',
        content: 'Contracts, screenshots, and generated specs can be attached here.',
    },
    {
        value: 'archive',
        label: 'Archive',
        disabled: true,
    },
];

const densityOptions = [
    { value: 'compact', label: 'Compact', icon: <KitIcon name="menu" />, description: 'Dense tables' },
    { value: 'cozy', label: 'Cozy', icon: <KitIcon name="spark" />, description: 'Default workspace', badge: 'AI' },
    { value: 'roomy', label: 'Roomy', icon: <KitIcon name="file" />, description: 'Presentation mode' },
];

function Section({ title, children, wide = false }) {
    return <section className={wide ? styles.sectionWide : styles.section}><h2 className="section-title">{title}</h2>{children}</section>;
}

function DemoCard({ label, children }) {
    return <div className="demo-card"><div className="demo-card-label">{label}</div>{children}</div>;
}

function Foundations({ type }) {
    if (type === 'colors') return <Section title="Token scale" wide><ColorScale colors={COLORS} /></Section>;
    if (type === 'typography') return <Section title="Type system" wide><TypographyScale /></Section>;
    if (type === 'spacing') {
        return <div className={styles.twoColumn}><DemoCard label="Spacing"><SpacingScale /></DemoCard><DemoCard label="Radii"><div className={styles.radiiGrid}>{['--r-xs', '--r-sm', '--r-md', '--r-lg', '--r-xl', '--r-full'].map(token => <div key={token}><span style={{ borderRadius: 'var(' + token + ')' }} /><code>{token}</code></div>)}</div></DemoCard></div>;
    }
    return null;
}

function Forms({ type }) {
    if (type === 'inputs') {
        return <div className={styles.twoColumn}>
            <DemoCard label="Clearable"><Input label="Project name" placeholder="Product dashboard" hint="Clear focus and validation states." defaultValue="Research board" clearable required /></DemoCard>
            <DemoCard label="Prefix & suffix"><Input variant="filled" label="Workspace slug" prefix="/" suffix=".app" placeholder="design-system" meta="URL" /></DemoCard>
            <DemoCard label="Command search"><Input variant="command" iconLeft={<KitIcon name="search" />} placeholder="Search components" clearable loading /></DemoCard>
            <DemoCard label="Validation tone"><Input tone="success" label="Release channel" defaultValue="stable" hint="Semantic tones keep status visible before submit." /></DemoCard>
            <DemoCard label="Inline edit"><Input variant="inline" label="Inline title" defaultValue="Untitled component spec" clearable /></DemoCard>
            <DemoCard label="Textarea"><Textarea variant="paper" label="Brief" placeholder="Describe the scenario..." defaultValue="Improve component states, variants, and keyboard feedback." maxLength={140} showCount autoGrow /></DemoCard>
        </div>;
    }
    if (type === 'checkbox') return <Section title="Mock question" wide><div className={styles.questionGrid}><div className={styles.questionCard}><h3>Choose one answer</h3><p>Which validation strategy should the form use by default?</p><div className={styles.optionStack}><Radio name="validation" label="Validate on blur" variant="card" defaultChecked /><Radio name="validation" label="Validate on submit" variant="card" /><Radio name="validation" label="Validate while typing" variant="card" /></div></div><div className={styles.questionCard}><h3>Choose multiple answers</h3><p>Which input states should be visible in the component gallery?</p><div className={styles.optionStack}><Checkbox label="Default and hover" variant="card" defaultChecked /><Checkbox label="Focus and keyboard" variant="card" defaultChecked /><Checkbox label="Error, success, disabled" variant="tile" indeterminate /><Checkbox label="Loading" variant="card" /></div></div></div></Section>;
    if (type === 'radio') return <Section title="Radio variants"><div className={styles.stack}><Radio name="plan" label="Start" defaultChecked /><Radio name="plan" label="Team card" variant="card" /><Radio name="plan" label="Enterprise segment" variant="segment" /></div></Section>;
    if (type === 'toggle') return <Section title="Toggle variants"><div className="demo-row"><Toggle label="Default" defaultChecked /><Toggle label="Power" variant="power" defaultChecked /><Toggle label="Split" variant="split" /><Toggle label="Disabled" disabled /></div></Section>;
    if (type === 'select') return <div className={styles.twoColumn}><DemoCard label="Searchable"><Select searchable clearable label="Report cadence" options={selectOptions} defaultValue="weekly" hint="Type to filter, use arrows and Enter to choose." /></DemoCard><DemoCard label="Tonal"><Select variant="tonal" label="Priority" options={selectOptions} defaultValue="daily" /></DemoCard><DemoCard label="Glass"><Select variant="glass" label="Environment" options={selectOptions} defaultValue="manual" /></DemoCard><DemoCard label="Quiet large"><Select variant="quiet" size="lg" label="Release train" options={selectOptions} placeholder="Choose cadence" /></DemoCard></div>;
    if (type === 'tabs') return <Section title="Tabs"><div className={styles.stack}><Tabs variant="underline" tabs={tabsPreview} defaultValue="summary" /><Tabs variant="pill" tabs={tabsPreview} defaultValue="activity" renderPanel={false} /><Tabs variant="cards" tabs={tabsPreview} defaultValue="files" stretch /><Tabs variant="rail" tabs={tabsPreview} defaultValue="summary" /></div></Section>;
    if (type === 'segmented') return <Section title="Segmented control"><div className={styles.stack}><SegmentedControl variant="default" options={densityOptions} defaultValue="cozy" /><SegmentedControl variant="floating" options={densityOptions} defaultValue="compact" /><SegmentedControl variant="toolbar" options={densityOptions} defaultValue="roomy" /><SegmentedControl variant="cards" options={densityOptions} defaultValue="cozy" equal /></div></Section>;
    return <div className={styles.twoColumn}><DemoCard label="Field composition"><Input label="API key" action={<Kbd>Cmd</Kbd>} defaultValue="sk_live_hidden" /></DemoCard><DemoCard label="Multi-step"><SteppedProgress variant="cards" steps={['Data', 'Review', 'Launch']} current={1} /></DemoCard></div>;
}

function Content({ type }) {
    if (type === 'icons') return <Section title="Icon set" wide><IconGrid /></Section>;
    if (type === 'cards') return <Section title="Card variants" wide><div className={styles.cardGrid}><Card title="Default card" description="A calm content surface for short product summaries." mediaLabel="DEFAULT" footer={<><Badge tone="success">Live</Badge><Button size="sm" variant="secondary">Open</Button></>} /><Card variant="elevated" title="Action card" description="Use elevation for a task that needs a clear next step." footer={<><Badge tone="warning">2 steps</Badge><Button size="sm">Review</Button></>}><div className={styles.checkList}><span>API ready</span><span>Copy pending</span><span>Owner assigned</span></div></Card><Card variant="spotlight" title="Spotlight card" description="A darker feature panel for promotion, alerts, or high-priority states." mediaLabel="FEATURE" footer={<><Badge tone="accent" appearance="glass">Focus</Badge><Button size="sm" variant="secondary">Details</Button></>} /><Card variant="metric" title="Metric card" description="92%" footer={<><span className={styles.deltaGood}>+12% this week</span><Button size="sm" variant="ghost">Inspect</Button></>}><div className={styles.sparkline}>{[42, 48, 51, 64, 70, 84, 92].map(value => <span key={value} style={{ height: value + '%' }} />)}</div></Card></div></Section>;
    if (type === 'avatars') return <div className={styles.twoColumn}><DemoCard label="Avatar variants"><div className="demo-row"><Avatar name="Anna Petrova" size="xs" /><Avatar name="Anna Petrova" size="sm" variant="solid" color="var(--accent)" /><Avatar name="Anna Petrova" variant="gradient" /><Avatar name="Anna Petrova" size="lg" variant="ring" /><Avatar name="Anna Petrova" size="xl" /></div></DemoCard><DemoCard label="Badges & stack"><div className="demo-row"><AvatarStack users={[{ name: 'Anna', variant: 'gradient' }, { name: 'Boris', variant: 'solid', color: 'var(--success-500)' }, { name: 'Daria', variant: 'ring' }]} /><Badge dot>Neutral</Badge><Badge tone="accent" appearance="glass" dot>Glass</Badge><Badge tone="danger" appearance="outline">Danger</Badge></div></DemoCard></div>;
    if (type === 'table') return <Section title="Data table" wide><div className={styles.stack}><DataTable caption="Selectable project queue" columns={tableColumns} rows={tableRows} variant="zebra" sortable selectable /><DataTable caption="Analytics ranking" columns={tableColumns} rows={tableRows} variant="analytics" sortable /><DataTable caption="Compact status table" columns={tableColumns.slice(0, 4)} rows={tableRows} variant="compact" density="sm" /></div></Section>;
    if (type === 'charts') return <Section title="Charts" wide><div className={styles.chartGrid}><MiniChart title="Weekly usage" subtitle="Hover bars for values" values={[32, 48, 28, 72, 58, 86, 64, 92]} unit="%" /><MiniChart title="Conversion" subtitle="Target line at 72%" variant="area" target={72} values={[22, 38, 34, 52, 70, 66, 82, 78]} unit="%" /><MiniChart title="Latency" subtitle="Point markers" variant="line" target={64} values={[81, 72, 69, 64, 58, 52, 49]} unit="ms" /><MiniChart title="Coverage" subtitle="Current / maximum" variant="donut" values={[18, 26, 52, 78]} /><MiniChart title="Traffic split" subtitle="Segmented distribution" variant="stacked" values={[38, 26, 22, 14]} segments={[{ label: 'Web', value: 38 }, { label: 'API', value: 26 }, { label: 'CLI', value: 22 }, { label: 'Docs', value: 14 }]} /></div></Section>;
    if (type === 'graph') return <Section title="Math graph" wide><GraphSection /></Section>;
    if (type === 'sliders') return <Section title="Sliders & progress" wide><div className={styles.controlShowcase}><div className={styles.controlPanel}><h3>Decision controls</h3><Slider label="Confidence" defaultValue={68} marks={[{ value: 0, label: 'Low' }, { value: 50, label: 'Med' }, { value: 100, label: 'High' }]} /><Slider label="Risk" variant="meter" defaultValue={42} marks={[{ value: 0, label: 'Safe' }, { value: 50, label: 'Watch' }, { value: 100, label: 'Stop' }]} /><Slider label="Steps" variant="stepped" min={1} max={5} step={1} defaultValue={3} suffix="/5" marks={[{ value: 1, label: '1' }, { value: 3, label: '3' }, { value: 5, label: '5' }]} /></div><div className={styles.controlPanel}><h3>Progress states</h3><Progress label="Profile completion" value={68} variant="ribbon" showValue /><Progress label="Sync progress" value={84} variant="pulse" showValue /><Progress label="Risk meter" value={42} variant="meter" showValue /><Progress label="Checklist" value={60} variant="segmented" tone="success" showValue /></div></div></Section>;
    if (type === 'data') return <Section title="Data cards" wide><div className={styles.statsGrid}><StatCard label="Components" value="42" delta="+12%" variant="accent" /><StatCard label="Coverage" value="78%" delta="+8%" /><StatCard label="Issues" value="3" delta="-2%" /></div></Section>;
    if (type === 'timeline') return <Section title="Timeline"><Timeline variant="cards" items={[{ title: 'Extract API', description: 'Review props and interaction states.' }, { title: 'Build gallery', description: 'Show the component in a real workflow.' }, { title: 'Prepare npm', description: 'Split package entry and docs.' }]} /></Section>;
    if (type === 'kanban') return <Section title="Kanban" wide><KanbanBoard columns={[{ title: 'Backlog', cards: ['Select', 'Tree'] }, { title: 'In progress', cards: ['Modal', 'Drawer'] }, { title: 'Done', cards: ['Button'] }]} /></Section>;
    return null;
}

function GraphSection() {
    return <div className={styles.stack}><div><h3 className={styles.subhead}>Graphs: nodes and edges</h3><div className={styles.graphGrid}>{['dependency', 'decision', 'cluster'].map(variant => <NetworkGraph key={variant} variant={variant} />)}</div></div><div><h3 className={styles.subhead}>Function plots</h3><div className={styles.graphGrid}>{['sine', 'quadratic', 'logistic'].map(variant => <GraphPlot key={variant} variant={variant} />)}</div></div></div>;
}

function Navigation({ type }) {
    if (type === 'navbars') return <Section title="Navbar variants" wide><div className={styles.stack}>{['default', 'pill', 'glass', 'bordered', 'dark', 'command', 'wings'].map(variant => <Navbar key={variant} variant={variant} />)}</div></Section>;
    if (type === 'breadcrumbs') return <Section title="Breadcrumbs"><div className={styles.stack}>{['slash', 'pill', 'compact'].map(variant => <Breadcrumbs key={variant} variant={variant} items={[{ label: 'Projects' }, { label: 'UI Kit' }, { label: 'Components', current: true }]} />)}</div></Section>;
    if (type === 'sidebar') return <Section title="Sidebar"><div className="demo-row"><SidebarNav items={['Overview', 'Components', 'Tokens', 'Changelog']} /><SidebarNav variant="rail" items={['O', 'C', 'T', 'L']} /></div></Section>;
    if (type === 'palette') return <Section title="Command palette" wide><CommandPalette variant="spotlight" commands={['Create component', 'Open tokens', 'Copy import']} /></Section>;
    if (type === 'tree') return <Section title="Tree"><TreeView nodes={[{ label: 'src', children: ['App.js', 'index.js'] }, { label: 'shared', children: ['ui', 'lib'] }, { label: 'package.json' }]} /></Section>;
    return null;
}

function Feedback({ type }) {
    if (type === 'loaders') return <Section title="Loaders"><div className="demo-row"><Loader /><Loader variant="orbit" /><Loader variant="ring" /><Loader variant="bars" /><Loader variant="bar" /></div></Section>;
    if (type === 'skeletons') return <DemoCard label="Skeleton layout"><div className={styles.skeletonStack}><Skeleton type="card" /><Skeleton style={{ width: '80%' }} /><Skeleton style={{ width: '55%' }} /></div></DemoCard>;
    if (type === 'modal') return <Section title="Modal" wide><div className={styles.stack}><Modal title="Publish changes" footer={<><Button variant="secondary">Cancel</Button><Button>Publish</Button></>}>Review visibility and participants before launch.</Modal><Modal variant="glass" title="Glass modal" footer={<Button>Continue</Button>}>A softer surface for contextual overlays.</Modal></div></Section>;
    if (type === 'tooltip') return <Section title="Tooltip"><div className="demo-row"><Tooltip content="Copy import"><Button variant="secondary">Top</Button></Tooltip><Tooltip side="right" content="Open docs"><Button variant="secondary">Right</Button></Tooltip></div></Section>;
    if (type === 'toast') return <Section title="Toast"><div className={styles.stack}><Toast title="Saved" description="Theme changes were applied." /><Toast tone="accent" variant="glass" title="Synced" description="Package metadata is up to date." /><Toast tone="danger" variant="ribbon" title="Failed" description="Registry token is missing." /></div></Section>;
    if (type === 'dialogs') return <Section title="Dialogs" wide><div className={styles.stack}><DialogPreview /><DialogPreview tone="success" /><DialogPreview tone="danger" /></div></Section>;
    if (type === 'drawer') return <Section title="Drawer" wide><div className={styles.stack}><Drawer title="Filters"><Input label="Search" placeholder="Name" /><Select label="Status" options={selectOptions} defaultValue="daily" /><Button fullWidth>Apply</Button></Drawer><Drawer side="bottom" title="Bottom sheet"><p>Compact actions can live closer to mobile thumbs.</p></Drawer></div></Section>;
    if (type === 'coachmark') return <Section title="Coachmark" wide><div className={styles.stack}><Coachmark title="Quick setup">Highlight a new action and keep the next step short.</Coachmark><Coachmark variant="beacon" title="Beacon">A subtle pulse can draw attention without taking over.</Coachmark></div></Section>;
    return null;
}

function Special({ type }) {
    if (type === 'user-menu') return <Section title="User menu"><UserMenu /></Section>;
    if (type === 'chat') return <Section title="Chat" wide><ChatPanel variant="ai" /></Section>;
    if (type === 'kbd') return <Section title="Keyboard keys"><div className="demo-row"><Kbd>Cmd</Kbd><Kbd variant="accent">K</Kbd><Kbd>Shift</Kbd><Kbd variant="dark">Enter</Kbd></div></Section>;
    if (type === 'map') return <Section title="Map" wide><MiniMap /></Section>;
    if (type === 'diff') return <Section title="Diff" wide><DiffView /></Section>;
    if (type === 'code') return <Section title="Code" wide><CodePanel code={`import { Button, Input } from '@your-scope/ui-kit';\n\n<Button variant="primary">Save</Button>`} /></Section>;
    return null;
}

function Patterns({ type }) {
    if (type === 'auth') return <Section title="Auth"><AuthCard /></Section>;
    if (type === 'settings') return <Section title="Settings" wide><SettingsPanel /></Section>;
    if (type === 'wizard') return <Section title="Wizard" wide><WizardSteps steps={['Profile', 'Access', 'Review']} current={1} /></Section>;
    if (type === 'pricing') return <Section title="Pricing" wide><PricingCards /></Section>;
    if (type === 'error') return <Section title="Error state"><ErrorState /></Section>;
    return null;
}

function renderContent(id, group) {
    if (group === 'Foundations') return <Foundations type={id} />;
    if (group === 'Forms') return <Forms type={id} />;
    if (group === 'Content') return <Content type={id} />;
    if (group === 'Navigation') return <Navigation type={id} />;
    if (group === 'Feedback') return <Feedback type={id} />;
    if (group === 'Special') return <Special type={id} />;
    if (group === 'Page Patterns') return <Patterns type={id} />;
    return null;
}

export function GalleryPage({ id, group, label }) {
    const content = renderContent(id, group);
    return <div><div className="kit-head"><div className="kit-eyebrow">{group.toUpperCase()}</div><h1 className="kit-title">{label}</h1><p className="kit-lede">Live examples on shared theme tokens. Components are split into FSD-friendly folders and ready for a future package entry.</p></div>{content || <DemoCard label="In progress">This route is registered and ready for a dedicated component implementation.</DemoCard>}</div>;
}
