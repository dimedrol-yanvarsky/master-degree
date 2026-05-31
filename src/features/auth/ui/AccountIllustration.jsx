export function AccountIllustration({ mode, styles, authImages = {} }) {
    const imageSrc = authImages[mode] || authImages.login;

    if (!imageSrc) return null;

    return (
        <div className={styles.visual} aria-hidden="true">
            <img
                className={styles.visualImage}
                src={imageSrc}
                alt=""
                decoding="async"
                loading="eager"
                draggable="false"
            />
        </div>
    );
}
