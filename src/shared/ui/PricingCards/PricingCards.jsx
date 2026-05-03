import { Badge } from '../Badge';
import { Button } from '../Button';
import { KitIcon } from '../Icon';
import { cn } from '../_utils';
import styles from './PricingCards.module.css';

const plans = [
    { name: 'Старт', price: '0', description: 'Для прототипов', features: ['3 проекта', 'Базовые токены', 'Поддержка сообщества'] },
    { name: 'Команда', price: '990', description: 'Для боевых команд', features: ['Безлимитные компоненты', 'История версий', 'Процесс ревью'], featured: true },
    { name: 'Масштаб', price: '2490', description: 'Для нескольких команд', features: ['SSO', 'Дизайн-операции', 'Приоритетная поддержка'] },
];

export function PricingCards({ variant = 'cards' }) {
    if (variant === 'comparison') {
        return (
            <div className={styles.comparison}>
                {plans.map((plan) => (
                    <article key={plan.name} className={cn(styles.card, plan.featured && styles.featured)}>
                        <Badge tone={plan.featured ? 'accent' : 'neutral'}>{plan.featured ? 'Популярный' : 'Тариф'}</Badge>
                        <h3>{plan.name}</h3>
                        <strong>{plan.price} ₽</strong>
                        <ul>{plan.features.map((feature) => <li key={feature}><KitIcon name="check" size={14} />{feature}</li>)}</ul>
                        <Button variant={plan.featured ? 'primary' : 'secondary'} fullWidth>Выбрать</Button>
                    </article>
                ))}
            </div>
        );
    }

    return (
        <div className={styles.grid}>
            {plans.map((plan) => (
                <article key={plan.name} className={cn(styles.card, plan.featured && styles.featured)}>
                    <div className={styles.top}>
                        <Badge tone={plan.featured ? 'accent' : 'neutral'}>{plan.featured ? 'Популярный' : 'Тариф'}</Badge>
                        <span>в месяц</span>
                    </div>
                    <h3>{plan.name}</h3>
                    <strong>{plan.price}<small> ₽/мес</small></strong>
                    <p>{plan.description}</p>
                    <ul>{plan.features.map((feature) => <li key={feature}><KitIcon name="check" size={14} />{feature}</li>)}</ul>
                    <Button variant={plan.featured ? 'primary' : 'secondary'} fullWidth>Выбрать</Button>
                </article>
            ))}
        </div>
    );
}
