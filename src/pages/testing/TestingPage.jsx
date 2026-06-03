import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ErrorState } from '../../shared/ui/kit';
import { hasCompletedTest } from '../../entities/user';
import { getRemainingCooldownDays, getStoredResult, TEST_MANAGER_ROLES, QuestionnairePage } from '../../features/testing';
import { apiCreateTest, apiDeleteTest, apiTests, apiUpdateTest } from '../../entities/test';
import { ROUTES } from '../../shared/routes';
import { CompletedTestPage, TestingLanding } from '../../widgets/testing-dashboard';
import styles from './TestingPage.module.css';

function TestNotFound() {
    const navigate = useNavigate();

    return (
        <section className={styles.questionnaire}>
            <ErrorState
                title="Страница не найдена"
                description="Такого раздела пока нет. Проверьте адрес или вернитесь к дневнику эмоций."
                actionLabel="Вернуться к эмоциям"
                onAction={() => navigate(ROUTES.home)}
            />
        </section>
    );
}

export default function TestingPage({ isAuth = false, user = null, userRole = null, status = null, testStatus = null, onTestComplete }) {
    const { testId } = useParams();
    const navigate = useNavigate();
    const [systemTests, setSystemTests] = useState([]);
    const [testsLoading, setTestsLoading] = useState(true);
    const [testsError, setTestsError] = useState('');
    const availableTests = useMemo(() => systemTests, [systemTests]);
    const canManageTests = isAuth && TEST_MANAGER_ROLES.includes(userRole);
    const test = availableTests.find((item) => item.id === testId) || null;

    useEffect(() => {
        let active = true;
        setTestsLoading(true);
        apiTests()
            .then((items) => {
                if (!active) return;
                setSystemTests(items);
                setTestsError('');
            })
            .catch((error) => {
                if (!active) return;
                setSystemTests([]);
                setTestsError(error.message || 'Не удалось загрузить тесты из системы.');
            })
            .finally(() => {
                if (active) setTestsLoading(false);
            });

        return () => {
            active = false;
        };
    }, []);

    const handleAddTest = async (draft) => {
        const createdTest = await apiCreateTest(draft);
        if (!createdTest?.id) return null;
        setSystemTests((currentTests) => [
            createdTest,
            ...currentTests.filter((item) => item.id !== createdTest.id),
        ]);
        return createdTest;
    };

    const handleUpdateTest = async (testId, draft) => {
        const updatedTest = await apiUpdateTest(testId, draft);
        if (!updatedTest?.id) return null;
        setSystemTests((currentTests) => currentTests.map((item) => (item.id === testId ? updatedTest : item)));
        return updatedTest;
    };

    const handleDeleteTest = async (testId) => {
        await apiDeleteTest(testId);
        setSystemTests((currentTests) => currentTests.filter((item) => item.id !== testId));
    };

    if (testId && testsLoading) {
        return (
            <section className={styles.questionnaire}>
                <p className={styles.attemptEmpty}>Загружаем тесты...</p>
            </section>
        );
    }
    if (testId && testsError && !test) {
        return (
            <section className={styles.questionnaire}>
                <ErrorState
                    title="Тесты не загрузились"
                    description={testsError}
                    actionLabel="Вернуться к тестам"
                    onAction={() => navigate(ROUTES.testing)}
                />
            </section>
        );
    }
    if (testId && !test) return <TestNotFound />;
    if (testId && isAuth && test && hasCompletedTest(testStatus, test.id)) {
        const result = getStoredResult(testStatus, test.id);
        const remainingDays = getRemainingCooldownDays(test.id, result?.completedAt);

        if (remainingDays > 0) {
            return <CompletedTestPage test={test} result={result} remainingDays={remainingDays} styles={styles} />;
        }
    }
    if (testId && isAuth && test) {
        return <QuestionnairePage test={test} onComplete={onTestComplete} styles={styles} />;
    }

    return (
        <TestingLanding
            isAuth={isAuth}
            status={status}
            testStatus={testStatus}
            canManageTests={canManageTests}
            initialPrompt={testId && !isAuth ? test : null}
            availableTests={availableTests}
            testsLoading={testsLoading}
            testsError={testsError}
            onAddTest={handleAddTest}
            onUpdateTest={handleUpdateTest}
            onDeleteTest={handleDeleteTest}
            currentUserId={user?.id || ''}
            userRole={userRole}
            styles={styles}
        />
    );
}
