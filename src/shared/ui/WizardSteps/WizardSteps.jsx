import { useState } from 'react';
import { Badge } from '../Badge';
import { Button } from '../Button';
import { Checkbox } from '../Checkbox';
import { SteppedProgress } from '../SteppedProgress';
import styles from './WizardSteps.module.css';

const DEFAULT_STEPS = ['Профиль', 'Доступ', 'Проверка'];

export function WizardSteps({ steps = DEFAULT_STEPS, current = 1, variant = 'default' }) {
    const [step, setStep] = useState(current);
    const safeStep = Math.max(0, Math.min(steps.length - 1, step));

    return (
        <section className={[styles.root, styles[variant]].filter(Boolean).join(' ')}>
            <SteppedProgress steps={steps} current={safeStep} variant="cards" />
            <div className={styles.panel}>
                <div className={styles.panelHead}>
                    <Badge tone="accent">Шаг {safeStep + 1} из {steps.length}</Badge>
                    <span>{Math.round((safeStep + 1) / steps.length * 100)}%</span>
                </div>
                <h3>{steps[safeStep]}</h3>
                <p>Проверьте обязательные поля, права доступа и итоговое действие перед публикацией.</p>
                <div className={styles.checks}>
                    <Checkbox label="Данные заполнены" defaultChecked />
                    <Checkbox label="Роли проверены" defaultChecked={safeStep > 0} />
                    <Checkbox label="Готово к запуску" defaultChecked={safeStep > 1} />
                </div>
                <div className={styles.actions}>
                    <Button variant="secondary" disabled={safeStep === 0} onClick={() => setStep((value) => value - 1)}>Назад</Button>
                    <Button onClick={() => setStep((value) => Math.min(steps.length - 1, value + 1))}>Далее</Button>
                </div>
            </div>
        </section>
    );
}
