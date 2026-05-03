import { Button } from '../Button';
import { Input } from '../Input';
import { cn } from '../_utils';
import { KitIcon } from '../Icon';
import styles from './Drawer.module.css';

export function Drawer({ title = 'Фильтры', children, side = 'right' }) {
    return (
        <div className={cn(styles.stage, styles[side])}>
            <aside className={styles.drawer} aria-label={title}>
                <div className={styles.head}>
                    <strong>{title}</strong>
                    <button type="button" aria-label="Закрыть"><KitIcon name="close" /></button>
                </div>
                {children || (
                    <>
                        <Input label="Поиск" placeholder="Название" />
                        <Button fullWidth>Применить</Button>
                    </>
                )}
            </aside>
        </div>
    );
}
