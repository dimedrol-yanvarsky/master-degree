export function shouldUseDefaultNavigation(event) {
    return (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.altKey ||
        event.ctrlKey ||
        event.shiftKey
    );
}

export function navigateWithTransition(navigate, targetPath, options) {
    if (typeof document !== 'undefined' && document.startViewTransition) {
        document.startViewTransition(() => {
            navigate(targetPath, options);
        });
        return;
    }

    navigate(targetPath, options);
}
