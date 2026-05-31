import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, KitIcon } from '../../shared/ui/kit';
import { apiEmotionGraph, buildEmotionGraphPoints } from '../../entities/emotion';
import { apiMyTestResults } from '../../entities/test';
import { ROUTES } from '../../shared/routes';
import { EmotionStateGraph } from '../../widgets/emotion-state-graph';
import styles from './MyEmotionsPage.module.css';

function navigateTo(path) {
    window.location.assign(path);
}

function GuestPlaceholder() {
    return (
        <section className={styles.guestRoot}>
            <div className={styles.guestPanel}>
                <div className={styles.guestIcon} aria-hidden="true">
                    <KitIcon name="lock" size={28} />
                </div>
                <Badge tone="accent">Нужна авторизация</Badge>
                <h1>Мои эмоции</h1>
                <p>
                    Авторизуйтесь, чтобы видеть личный граф эмоционального состояния и отслеживать динамику после прохождения тестов.
                </p>
                <div className={styles.guestActions}>
                    <Button
                        size="lg"
                        variant="gradient"
                        gradient="radial"
                        iconRight={<KitIcon name="arrowRight" size={18} />}
                        onClick={() => navigateTo(ROUTES.login)}>
                        Войти в аккаунт
                    </Button>
                    <Button
                        size="lg"
                        variant="secondary"
                        iconRight={<KitIcon name="plus" size={18} />}
                        onClick={() => navigateTo(ROUTES.register)}>
                        Создать аккаунт
                    </Button>
                </div>
            </div>
        </section>
    );
}

function TestsPlaceholder() {
    return (
        <div className={`${styles.panel} ${styles.emptyPanel}`}>
            <div className={styles.emptyIcon} aria-hidden="true">
                <KitIcon name="chart" size={28} />
            </div>
            <Badge tone="warning">Граф пока пуст</Badge>
            <h2>Пройдите тесты, чтобы увидеть динамику</h2>
            <p>
                После первого сохранённого результата система начнёт формировать данные для графа эмоционального состояния.
            </p>
            <div className={styles.panelActions}>
                <Button
                    variant="gradient"
                    gradient="radial"
                    iconRight={<KitIcon name="arrowRight" size={16} />}
                    onClick={() => navigateTo(ROUTES.testing)}>
                    Перейти к тестам
                </Button>
            </div>
        </div>
    );
}

function GraphPendingPlaceholder() {
    return (
        <div className={`${styles.panel} ${styles.emptyPanel}`}>
            <div className={styles.emptyIcon} aria-hidden="true">
                <KitIcon name="chart" size={28} />
            </div>
            <Badge tone="accent">Данные ещё формируются</Badge>
            <h2>Граф пока не заполнен</h2>
            <p>
                Результаты тестов уже есть в системе, но в базе пока нет точек графа. Пройдите недостающий тест или повторите тестирование, чтобы появилась новая точка.
            </p>
            <div className={styles.panelActions}>
                <Button
                    variant="secondary"
                    iconRight={<KitIcon name="arrowRight" size={16} />}
                    onClick={() => navigateTo(ROUTES.testing)}>
                    Открыть тесты
                </Button>
            </div>
        </div>
    );
}

export default function MyEmotionsPage({ isAuth = false, status = null }) {
    const [remotePoints, setRemotePoints] = useState([]);
    const [testResults, setTestResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [loadError, setLoadError] = useState('');
    const isAdmin = status === 'admin';
    const canLoadPersonalGraph = isAuth && !isAdmin;
    const graphPoints = useMemo(() => buildEmotionGraphPoints(remotePoints), [remotePoints]);
    const hasCompletedTests = testResults.length > 0;

    useEffect(() => {
        if (!canLoadPersonalGraph) {
            setRemotePoints([]);
            setTestResults([]);
            setLoadError('');
            setIsLoading(false);
            return undefined;
        }

        let active = true;
        setIsLoading(true);
        setLoadError('');

        Promise.all([apiMyTestResults(), apiEmotionGraph()])
            .then(([results, graph]) => {
                if (!active) return;
                setTestResults(Array.isArray(results) ? results : []);
                setRemotePoints(Array.isArray(graph?.points) ? graph.points : []);
            })
            .catch((error) => {
                if (!active) return;
                setTestResults([]);
                setRemotePoints([]);
                setLoadError(error.message || 'Не удалось загрузить данные эмоционального состояния.');
            })
            .finally(() => {
                if (active) setIsLoading(false);
            });

        return () => {
            active = false;
        };
    }, [canLoadPersonalGraph]);

    if (!isAuth) return <GuestPlaceholder />;

    return (
        <section className={styles.root}>
            <div className={styles.heading}>
                <div>
                    <h1>Мои эмоции</h1>
                    <p>
                        Граф эмоционального состояния пополняется по мере прохождения теста на текущее эмоциональное состояние.
                    </p>
                </div>
            </div>

            {isAdmin ? (
                <div className={styles.panel}>
                    <h2>Граф доступен клиентскому аккаунту</h2>
                    <p>Войдите как клиент, чтобы увидеть личную динамику эмоционального состояния.</p>
                </div>
            ) : isLoading ? (
                <div className={styles.panel}>
                    <h2>Граф загружается</h2>
                    <p>Получаем результаты тестов и точки графа текущего пользователя из базы данных.</p>
                </div>
            ) : loadError ? (
                <div className={styles.panel}>
                    <h2>Граф недоступен</h2>
                    <p>{loadError}</p>
                </div>
            ) : !hasCompletedTests ? (
                <TestsPlaceholder />
            ) : graphPoints.length === 0 ? (
                <GraphPendingPlaceholder />
            ) : (
                <EmotionStateGraph points={graphPoints} />
            )}
        </section>
    );
}
