import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, KitIcon } from '../../../shared/ui/kit';
import { AuthModal, ManualTestPanel, ResultsModal } from '../../../features/testing';
import { testRoute } from '../../../shared/routes';
import { canViewCompletedTests, getTestAvailability } from '../model/testAvailability';
import { TestCard } from './TestCard';

export function TestingLanding({ isAuth, status, testStatus, canManageTests, initialPrompt, availableTests, testsLoading, testsError, onAddTest, onUpdateTest, onDeleteTest, currentUserId, userRole, styles }) {
    const navigate = useNavigate();
    const [authPrompt, setAuthPrompt] = useState(initialPrompt || null);
    const [resultsOpen, setResultsOpen] = useState(false);
    const canViewResults = canViewCompletedTests(isAuth, status);

    useEffect(() => {
        setAuthPrompt(initialPrompt || null);
    }, [initialPrompt]);

    const handleStart = (test) => {
        if (!isAuth) {
            setAuthPrompt(test);
            return;
        }

        navigate(testRoute(test.id));
    };

    return (
        <section className={styles.root}>
            <div className={styles.hero}>
                <h1>Тестирования</h1>
                <p>
                    Выберите опросник, чтобы получить структурированную картину состояния. Результаты будут полезны для личной динамики и работы со специалистом.
                </p>
            </div>

            {canViewResults && (
                <div className={styles.landingToolbar}>
                    <Button variant="secondary" iconLeft={<KitIcon name="file" />} onClick={() => setResultsOpen(true)}>
                        Пройденные тесты
                    </Button>
                </div>
            )}

            {testsLoading && <p className={styles.attemptEmpty}>Загружаем тесты...</p>}
            {testsError && !testsLoading && <p className={styles.attemptEmpty}>{testsError}</p>}
            {!testsLoading && !testsError && availableTests.length === 0 && (
                <p className={styles.attemptEmpty}>В системе пока нет активных тестов.</p>
            )}
            {availableTests.length > 0 && (
                <div className={styles.testingGrid}>
                    {availableTests.map((test) => {
                        const { isCompleted, isLocked, lockLabel, remainingDays } = getTestAvailability(test, testStatus);

                        return (
                            <TestCard
                                key={test.id}
                                test={test}
                                isCompleted={isCompleted}
                                isLocked={isLocked}
                                lockLabel={lockLabel}
                                remainingDays={remainingDays}
                                onStart={handleStart}
                                styles={styles}
                            />
                        );
                    })}
                </div>
            )}

            {canManageTests && (
                <ManualTestPanel
                    tests={availableTests}
                    currentUserId={currentUserId}
                    userRole={userRole}
                    onAddTest={onAddTest}
                    onUpdateTest={onUpdateTest}
                    onDeleteTest={onDeleteTest}
                    styles={styles}
                />
            )}
            <AuthModal test={authPrompt} onClose={() => setAuthPrompt(null)} styles={styles} />
            {resultsOpen && (
                <ResultsModal
                    availableTests={availableTests}
                    testStatus={testStatus}
                    onClose={() => setResultsOpen(false)}
                    styles={styles}
                />
            )}
        </section>
    );
}
