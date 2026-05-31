import { Badge, Button, KitIcon } from '../../../shared/ui/kit';
import { testRoute } from '../../../shared/routes';
import styles from './EmotionGraphAccessNotice.module.css';

export function EmotionGraphAccessNotice({ missingTests }) {
    const missingLabel = missingTests.join(' и ');

    return (
        <section className={styles.root}>
            <div className={styles.icon} aria-hidden="true">
                <KitIcon name="lock" size={28} />
            </div>
            <Badge tone="warning">Граф пока недоступен</Badge>
            <h2>Нужно пройти {missingLabel}</h2>
            <p>
                Граф эмоционального состояния строится только после прохождения BFI-2 и BDS.
                Сейчас не хватает результатов: {missingLabel}.
            </p>
            <div className={styles.actions}>
                {missingTests.includes('BFI-2') && (
                    <Button
                        variant="gradient"
                        gradient="radial"
                        iconRight={<KitIcon name="arrowRight" size={16} />}
                        onClick={() => window.location.assign(testRoute('bfi-2'))}>
                        Пройти BFI-2
                    </Button>
                )}
                {missingTests.includes('BDS') && (
                    <Button
                        variant="secondary"
                        iconRight={<KitIcon name="arrowRight" size={16} />}
                        onClick={() => window.location.assign(testRoute('bds'))}>
                        Пройти BDS
                    </Button>
                )}
            </div>
        </section>
    );
}
