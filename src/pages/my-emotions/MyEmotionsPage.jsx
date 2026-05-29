import { Badge, Button, KitIcon } from '../../shared/ui/kit';
import { buildEmotionGraphPoints } from '../../entities/emotion';
import { EmotionGraphAccessNotice, getMissingEmotionGraphTests } from '../../features/emotion-graph-access';
import { EmotionStateGraph } from '../../widgets/emotion-state-graph';
import styles from './MyEmotionsPage.module.css';


function GuestPlaceholder() {
    const navigateTo = (path) => {
        window.location.assign(path);
    };

    return (
        <section className={styles.guestRoot}>
            <div className={styles.guestPanel}>
                <div className={styles.guestIcon} aria-hidden="true">
                    <KitIcon name="lock" size={28} />
                </div>
                <Badge tone="accent">Нужна авторизация</Badge>
                <h1>Мои эмоции</h1>
                <p>
                    Авторизуйтесь, чтобы вести личные записи, отслеживать динамику состояния
                    и получать рекомендации на основе истории самонаблюдения.
                </p>
                <div className={styles.guestActions}>
                    <Button
                        size="lg"
                        variant="gradient"
                        gradient="radial"
                        iconRight={<KitIcon name="arrowRight" size={18} />}
                        onClick={() => navigateTo('/login')}>
                        Войти в аккаунт
                    </Button>
                    <Button
                        size="lg"
                        variant="secondary"
                        iconRight={<KitIcon name="plus" size={18} />}
                        onClick={() => navigateTo('/register')}>
                        Создать аккаунт
                    </Button>
                </div>
            </div>
        </section>
    );
}

export default function MyEmotionsPage({ isAuth = false, status = null, testStatus = null }) {
    if (!isAuth) return <GuestPlaceholder />;

    const isAdmin = status === 'admin';
    const missingEmotionTests = isAdmin ? [] : getMissingEmotionGraphTests(testStatus);
    const graphPoints = buildEmotionGraphPoints(testStatus);
    const shouldShowGraphNotice = !isAdmin && missingEmotionTests.length > 0;
    const shouldShowGraph = !isAdmin && missingEmotionTests.length === 0;

    return (
        <section className={styles.root}>
            {!shouldShowGraph && (
                <div className={styles.heading}>
                    <div>
                        <h1>Мои эмоции</h1>
                        <p>
                            Граф эмоционального состояния пополняется по мере прохождения теста на текущее эмоциональное состояние.
                        </p>
                    </div>
                </div>
            )}

            {shouldShowGraphNotice ? (
                <EmotionGraphAccessNotice missingTests={missingEmotionTests} />
            ) : (
                shouldShowGraph && (
                    <EmotionStateGraph points={graphPoints} />
                )
            )}
        </section>
    );
}
