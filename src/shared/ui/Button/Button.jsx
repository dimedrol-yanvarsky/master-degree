import styles from './Button.module.css';

const GRADIENT_CLASS = {
    radial: styles.gradient,
    conic:  styles.gradientConic,
    soft:   styles.gradientSoft,
    mesh:   styles.gradientMesh,
    shine:  styles.gradientShine,
    motion: styles.gradientMotion,
    aurora: styles.gradientAurora,
    glow:   styles.gradientGlow,
    glass:  styles.gradientGlass,
};

const VARIANT_CLASS = {
    primary:     styles.primary,
    secondary:   styles.secondary,
    ghost:       styles.ghost,
    success:     styles.success,
    destructive: styles.destructive,
    danger:      styles.danger,
    link:        styles.link,
};

const SIZE_CLASS = {
    sm: styles.sm,
    md: '',
    lg: styles.lg,
};

function spawnRipple(event) {
    const btn = event.currentTarget;
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const wave = document.createElement('span');
    wave.className = styles.ripple;
    wave.style.width = `${size}px`;
    wave.style.height = `${size}px`;
    wave.style.left = `${event.clientX - rect.left - size / 2}px`;
    wave.style.top = `${event.clientY - rect.top - size / 2}px`;
    btn.appendChild(wave);
    setTimeout(() => wave.remove(), 600);
}

export function Button({
    variant = 'primary',
    gradient = 'radial',
    size = 'md',
    iconLeft,
    iconRight,
    iconOnly = false,
    loading = false,
    disabled = false,
    fullWidth = false,
    className = '',
    children = 'Действие',
    onClick,
    type = 'button',
    ...rest
}) {
    const variantClass = variant === 'gradient'
        ? GRADIENT_CLASS[gradient] || GRADIENT_CLASS.radial
        : VARIANT_CLASS[variant] || VARIANT_CLASS.primary;

    const classes = [
        styles.root,
        variantClass,
        SIZE_CLASS[size] || '',
        iconOnly ? styles.iconOnly : '',
        fullWidth ? styles.fullWidth : '',
        className,
    ].filter(Boolean).join(' ');

    const handleClick = (event) => {
        spawnRipple(event);
        if (onClick) onClick(event);
    };

    return (
        <button
            type={type}
            className={classes}
            disabled={disabled || loading}
            onClick={handleClick}
            {...rest}>
            {loading && <span className={styles.spinner} aria-hidden="true" />}
            {!loading && !iconOnly && iconLeft}
            {!iconOnly && children}
            {iconOnly && !loading && iconLeft}
            {!loading && !iconOnly && iconRight}
        </button>
    );
}
