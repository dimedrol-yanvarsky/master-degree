import styles from './Icon.module.css';

const paths = {
    check: <path d="M5 12l4 4 10-10" />,
    chevron: <path d="M7 10l5 5 5-5" />,
    search: <path d="M10.8 18.2a7.4 7.4 0 1 1 5.2-2.2l3.6 3.6" />,
    plus: <path d="M12 5v14M5 12h14" />,
    close: <path d="M6 6l12 12M18 6 6 18" />,
    menu: <path d="M5 7h14M5 12h14M5 17h14" />,
    user: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 8a7 7 0 0 0-14 0" />,
    bell: <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Zm-4 12a2 2 0 0 1-4 0" />,
    command: <path d="M8 8h8v8H8zM4 9a2 2 0 1 0 4 0V7a2 2 0 1 0-4 0v2Zm12 0a2 2 0 1 0 4 0V7a2 2 0 1 0-4 0v2ZM4 17a2 2 0 1 0 4 0v-2a2 2 0 1 0-4 0v2Zm12 0a2 2 0 1 0 4 0v-2a2 2 0 1 0-4 0v2Z" />,
    file: <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Zm0 0v5h5M8 13h8M8 17h5" />,
    folder: <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />,
    spark: <path d="M12 3l1.6 5.2L19 10l-5.4 1.8L12 17l-1.6-5.2L5 10l5.4-1.8L12 3Z" />,
    warning: <path d="M12 9v4m0 4h.01M10.3 4.7 2.9 17.5A2 2 0 0 0 4.6 20h14.8a2 2 0 0 0 1.7-2.5L13.7 4.7a2 2 0 0 0-3.4 0Z" />,
    trend: <path d="M4 16l5-5 4 4 7-8M15 7h5v5" />,
    settings: <path d="M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Zm8 3.8 1.2 1.1-1.8 3.1-1.6-.5a7.1 7.1 0 0 1-1.3.8l-.3 1.6h-3.6l-.3-1.6a7.1 7.1 0 0 1-1.3-.8l-1.6.5-1.8-3.1L4 12l1.2-1.1c.1-.5.2-1 .4-1.5L5 7.8l1.8-3.1 1.6.5c.4-.3.8-.6 1.3-.8l.3-1.6h3.6l.3 1.6c.5.2.9.5 1.3.8l1.6-.5 1.8 3.1-.6 1.6c.2.5.3 1 .4 1.5Z" />,
    heart: <path d="M20.8 5.6a5.1 5.1 0 0 0-7.2 0L12 7.2l-1.6-1.6a5.1 5.1 0 0 0-7.2 7.2L12 21l8.8-8.2a5.1 5.1 0 0 0 0-7.2Z" />,
    star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z" />,
    calendar: <path d="M7 3v4M17 3v4M4 8h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Zm3 7h3m3 0h3M8 16h3m3 0h3" />,
    clock: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v5l3 2" />,
    mail: <path d="M4 6h16v12H4V6Zm0 1 8 6 8-6" />,
    lock: <path d="M7 10V8a5 5 0 0 1 10 0v2M6 10h12v10H6V10Zm6 4v2" />,
    eye: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="3" /></>,
    download: <path d="M12 4v10m0 0 4-4m-4 4-4-4M5 20h14" />,
    upload: <path d="M12 20V10m0 0 4 4m-4-4-4 4M5 4h14" />,
    edit: <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Zm10-13 3 3" />,
    trash: <path d="M5 7h14M10 11v6m4-6v6M8 7l1-3h6l1 3m-9 0 1 13h8l1-13" />,
    copy: <path d="M8 8h11v11H8V8Zm-3 8V5h11" />,
    link: <path d="M10 13a5 5 0 0 0 7.1 0l1.4-1.4a5 5 0 0 0-7.1-7.1L10 5.9m4 5.1a5 5 0 0 0-7.1 0l-1.4 1.4a5 5 0 0 0 7.1 7.1L14 18.1" />,
    home: <path d="M3 11 12 3l9 8v10h-6v-6H9v6H3V11Z" />,
    chart: <path d="M4 19V5m0 14h16M8 16V9m4 7V6m4 10v-4" />,
    table: <path d="M4 5h16v14H4V5Zm0 5h16M9 5v14M15 5v14" />,
    filter: <path d="M4 5h16l-6 7v5l-4 2v-7L4 5Z" />,
    arrowLeft: <path d="M19 12H5m0 0 6-6m-6 6 6 6" />,
    arrowRight: <path d="M5 12h14m0 0-6-6m6 6-6 6" />,
    play: <path d="M8 5v14l11-7L8 5Z" />,
    pause: <path d="M8 5v14M16 5v14" />,
    refresh: <path d="M20 6v5h-5M4 18v-5h5M18.5 9A7 7 0 0 0 6.2 6.2L4 8.5M5.5 15a7 7 0 0 0 12.3 2.8L20 15.5" />,
    info: <path d="M12 17v-6m0-4h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />,
    help: <path d="M9.5 9a2.7 2.7 0 1 1 4.5 2c-1.1.8-2 1.4-2 3m0 3h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />,
    shield: <path d="M12 3 5 6v5c0 4.5 2.8 7.7 7 10 4.2-2.3 7-5.5 7-10V6l-7-3Z" />,
    database: <path d="M5 6c0 1.7 3.1 3 7 3s7-1.3 7-3-3.1-3-7-3-7 1.3-7 3Zm0 0v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />,
    terminal: <path d="m4 7 5 5-5 5m7 0h9" />,
    code: <path d="m8 8-4 4 4 4m8-8 4 4-4 4m-2-10-4 16" />,
    layers: <path d="m12 3 9 5-9 5-9-5 9-5Zm-7 9 7 4 7-4M5 16l7 4 7-4" />,
    grid: <path d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z" />,
    image: <path d="M4 5h16v14H4V5Zm3 10 3-3 2 2 3-4 3 5M8 9h.01" />,
    graph: <><circle cx="6" cy="7" r="2" /><circle cx="17" cy="5" r="2" /><circle cx="18" cy="17" r="2" /><circle cx="8" cy="18" r="2" /><path d="M8 7h7m2 0 1 8m-2 2H10m-2-1-1-7" /></>,
};

export function KitIcon({ name = 'spark', size = 16, className = '', ...rest }) {
    return (
        <svg
            className={[styles.root, className].filter(Boolean).join(' ')}
            viewBox="0 0 24 24"
            width={size}
            height={size}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            {...rest}>
            {paths[name] || paths.spark}
        </svg>
    );
}
