import { Badge } from '../Badge';
import { Button } from '../Button';
import { Checkbox } from '../Checkbox';
import { Input } from '../Input';
import { KitIcon } from '../Icon';
import styles from './AuthCard.module.css';

export function AuthCard({ variant = 'default' }) {
    return (
        <section className={[styles.root, styles[variant]].filter(Boolean).join(' ')}>
            <div className={styles.brand}>
                <div className={styles.mark}>K</div>
                <div>
                    <h3>{variant === 'passwordless' ? 'Вход без пароля' : 'Вход в рабочее пространство'}</h3>
                    <p>{variant === 'split' ? 'Безопасный доступ для команды и внешних гостей.' : 'Продолжите работу с UI-библиотекой.'}</p>
                </div>
            </div>
            {variant === 'split' && (
                <div className={styles.benefits}>
                    <Badge tone="success">SSO</Badge>
                    <Badge tone="accent">Ключ доступа</Badge>
                    <Badge tone="warning">2FA</Badge>
                </div>
            )}
            <div className={styles.socials}>
                <button type="button"><KitIcon name="shield" /> SSO</button>
                <button type="button"><KitIcon name="mail" /> Почта</button>
            </div>
            <Input label="Почта" placeholder="name@example.com" iconLeft={<KitIcon name="mail" />} />
            {variant !== 'passwordless' && <Input label="Пароль" type="password" placeholder="********" iconLeft={<KitIcon name="lock" />} action={<KitIcon name="eye" size={15} />} />}
            {variant === 'passwordless' && <Input label="Одноразовый код" placeholder="123 456" iconLeft={<KitIcon name="shield" />} />}
            <div className={styles.options}>
                <Checkbox label="Запомнить меня" defaultChecked />
                <a href="#auth">Забыли пароль?</a>
            </div>
            <Button fullWidth iconRight={<KitIcon name="arrowRight" />}>Продолжить</Button>
            <p className={styles.footer}>Нет аккаунта? <a href="#signup">Создать рабочее пространство</a></p>
        </section>
    );
}
