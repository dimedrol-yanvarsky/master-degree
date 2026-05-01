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
    MotionPreview,
    Navbar,
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
    { name: 'bg', value: 'var(--bg)' },
    { name: 'bg-2', value: 'var(--bg-2)' },
    { name: 'bg-3', value: 'var(--bg-3)' },
    { name: 'fg', value: 'var(--fg)', dark: true },
    { name: 'accent', value: 'var(--accent)', dark: true },
    { name: 'success', value: 'var(--success-500)', dark: true },
    { name: 'warning', value: 'var(--warning-500)' },
    { name: 'danger', value: 'var(--danger-500)', dark: true },
];

const tableColumns = [
    { key: 'project', label: 'Project' },
    { key: 'status', label: 'Status' },
    { key: 'owner', label: 'Owner' },
    { key: 'date', label: 'Due' },
];

const tableRows = [
    { id: 1, project: 'UI Kit', status: <Badge tone="success">Ready</Badge>, owner: 'Design', date: 'May 12' },
    { id: 2, project: 'CLI loader', status: <Badge tone="warning">Draft</Badge>, owner: 'Platform', date: 'May 18' },
    { id: 3, project: 'Docs', status: <Badge tone="accent">Active</Badge>, owner: 'DX', date: 'May 22' },
];

const selectOptions = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'daily', label: 'Daily' },
    { value: 'manual', label: 'Manual' },
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
    return <Section title="Interaction timing" wide><MotionPreview /></Section>;
}

function Forms({ type }) {
    if (type === 'inputs') {
        return <div className={styles.twoColumn}>
            <DemoCard label="Default"><Input label="Project name" placeholder="Product dashboard" hint="Clear focus and validation states." /></DemoCard>
            <DemoCard label="Filled"><Input variant="filled" label="Workspace" placeholder="Design system" hint="Useful in dense settings surfaces." /></DemoCard>
            <DemoCard label="Command"><Input variant="command" iconLeft={<KitIcon name="search" />} placeholder="Search components" /></DemoCard>
            <DemoCard label="Textarea"><Textarea variant="note" label="Brief" placeholder="Describe the scenario..." /></DemoCard>
        </div>;
    }
    if (type === 'checkbox') return <Section title="Checkbox variants"><div className="demo-row"><Checkbox label="Default" defaultChecked /><Checkbox label="Card option" variant="card" defaultChecked /><Checkbox label="Accent tile" variant="tile" indeterminate /><Checkbox label="Disabled" disabled /></div></Section>;
    if (type === 'radio') return <Section title="Radio variants"><div className={styles.stack}><Radio name="plan" label="Start" defaultChecked /><Radio name="plan" label="Team card" variant="card" /><Radio name="plan" label="Enterprise segment" variant="segment" /></div></Section>;
    if (type === 'toggle') return <Section title="Toggle variants"><div className="demo-row"><Toggle label="Default" defaultChecked /><Toggle label="Power" variant="power" defaultChecked /><Toggle label="Split" variant="split" /><Toggle label="Disabled" disabled /></div></Section>;
    if (type === 'select') return <div className={styles.twoColumn}><DemoCard label="Default"><Select label="Report cadence" options={selectOptions} defaultValue="weekly" /></DemoCard><DemoCard label="Tonal"><Select variant="tonal" label="Priority" options={selectOptions} defaultValue="daily" /></DemoCard><DemoCard label="Glass"><Select variant="glass" label="Environment" options={selectOptions} defaultValue="manual" /></DemoCard></div>;
    if (type === 'tabs') return <Section title="Tabs"><div className={styles.stack}>{['underline', 'pill', 'cards'].map(variant => <Tabs key={variant} variant={variant} tabs={[{ value: 'summary', label: 'Summary' }, { value: 'activity', label: 'Activity' }, { value: 'files', label: 'Files' }]} defaultValue="summary" />)}</div></Section>;
    if (type === 'segmented') return <Section title="Segmented control"><div className={styles.stack}>{['default', 'floating', 'underline'].map(variant => <SegmentedControl key={variant} variant={variant} options={[{ value: 'compact', label: 'Compact' }, { value: 'cozy', label: 'Cozy' }, { value: 'roomy', label: 'Roomy' }]} defaultValue="cozy" />)}</div></Section>;
    return <div className={styles.twoColumn}><DemoCard label="Field composition"><Input label="API key" action={<Kbd>Cmd</Kbd>} defaultValue="sk_live_hidden" /></DemoCard><DemoCard label="Multi-step"><SteppedProgress variant="cards" steps={['Data', 'Review', 'Launch']} current={1} /></DemoCard></div>;
}

function Content({ type }) {
    if (type === 'icons') return <Section title="Icon set" wide><IconGrid /></Section>;
    if (type === 'cards') return <Section title="Card variants" wide><div className={styles.cardGrid}>{['default', 'elevated', 'spotlight', 'metric'].map((variant, index) => <Card key={variant} variant={variant} title={variant + ' card'} description="A compact surface for product information and actions." mediaLabel={index < 3 ? variant.toUpperCase() : null} footer={<><Badge tone={index === 2 ? 'accent' : 'success'}>{index === 2 ? 'Focus' : 'Live'}</Badge><Button size="sm" variant="secondary">Open</Button></>} />)}</div></Section>;
    if (type === 'avatars') return <div className={styles.twoColumn}><DemoCard label="Avatar variants"><div className="demo-row"><Avatar name="Anna Petrova" size="xs" /><Avatar name="Anna Petrova" size="sm" variant="solid" color="var(--accent)" /><Avatar name="Anna Petrova" variant="gradient" /><Avatar name="Anna Petrova" size="lg" variant="ring" /><Avatar name="Anna Petrova" size="xl" /></div></DemoCard><DemoCard label="Badges & stack"><div className="demo-row"><AvatarStack users={[{ name: 'Anna', variant: 'gradient' }, { name: 'Boris', variant: 'solid', color: 'var(--success-500)' }, { name: 'Daria', variant: 'ring' }]} /><Badge dot>Neutral</Badge><Badge tone="accent" appearance="glass" dot>Glass</Badge><Badge tone="danger" appearance="outline">Danger</Badge></div></DemoCard></div>;
    if (type === 'table') return <Section title="Data table" wide><div className={styles.stack}><DataTable columns={tableColumns} rows={tableRows} variant="zebra" /><DataTable columns={tableColumns} rows={tableRows} variant="analytics" /></div></Section>;
    if (type === 'charts') return <Section title="Charts" wide><div className={styles.twoColumn}><MiniChart values={[32, 48, 28, 72, 58, 86, 64, 92]} /><MiniChart variant="area" values={[22, 38, 34, 52, 70, 66, 82, 78]} /></div></Section>;
    if (type === 'graph') return <Section title="Math graph" wide><GraphSection /></Section>;
    if (type === 'sliders') return <Section title="Sliders & progress"><div className={styles.stack}><Slider label="Confidence" defaultValue={68} /><Slider label="Risk" variant="meter" defaultValue={42} /><Progress value={68} variant="ribbon" /><Progress value={84} variant="pulse" /></div></Section>;
    if (type === 'data') return <Section title="Data cards" wide><div className={styles.statsGrid}><StatCard label="Components" value="42" delta="+12%" variant="accent" /><StatCard label="Coverage" value="78%" delta="+8%" /><StatCard label="Issues" value="3" delta="-2%" /></div></Section>;
    if (type === 'timeline') return <Section title="Timeline"><Timeline variant="cards" items={[{ title: 'Extract API', description: 'Review props and interaction states.' }, { title: 'Build gallery', description: 'Show the component in a real workflow.' }, { title: 'Prepare npm', description: 'Split package entry and docs.' }]} /></Section>;
    if (type === 'kanban') return <Section title="Kanban" wide><KanbanBoard columns={[{ title: 'Backlog', cards: ['Select', 'Tree'] }, { title: 'In progress', cards: ['Modal', 'Drawer'] }, { title: 'Done', cards: ['Button'] }]} /></Section>;
    return null;
}

function GraphSection() {
    return <div className={styles.graphGrid}>{['sine', 'quadratic', 'logistic'].map(variant => <GraphPlot key={variant} variant={variant} />)}</div>;
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
