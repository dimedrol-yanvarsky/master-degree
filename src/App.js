import { useEffect, useState } from 'react';
import './app/styles/kit.css';
import { AppRouter } from './app/providers/AppRouter';
import { clearAuthUser, DEFAULT_USER_STATUS, getTestStatusKey, readAuthUser, saveAuthUser, markTestCompleted, readUserStatus, saveUserStatus } from './entities/user';
import { apiLogout, apiMe, apiMyTestResults, apiSubmitTestResult, clearAccessToken, getAccessToken } from './shared/api';

// Тесты, формирующие вершину графа на сервере (психотип + текущее состояние).
const SERVER_TEST_CODES = ['bfi-2', 'bds'];

function testStatusFromServerResults(results) {
    const nextStatus = { ...DEFAULT_USER_STATUS };
    const seenTests = new Set();

    for (const result of results || []) {
        const testCode = result.testCode || result.testId;
        const statusKey = getTestStatusKey(testCode);
        if (!statusKey || seenTests.has(statusKey)) continue;

        seenTests.add(statusKey);
        nextStatus[statusKey] = 'completed';
        nextStatus[`${statusKey}Result`] = {
            completedAt: result.completedAt,
            score: result.score,
            scoreLabel: result.scoreLabel,
            level: result.level,
            summary: result.summary,
            domains: result.domains || [],
            answers: result.answers || [],
            answeredCount: result.answeredCount || result.answers?.length || 0,
        };
    }

    return nextStatus;
}

function App() {
    const [authUser, setAuthUser] = useState(readAuthUser);
    const [testStatus, setTestStatus] = useState(() => readUserStatus(readAuthUser()));
    const isAuth = Boolean(authUser);
    const userRole = authUser?.role || null;
    const status = authUser?.status || authUser?.accountType || null;

    const refreshServerTestStatus = async (user) => {
        if (!user || !getAccessToken()) return null;

        const results = await apiMyTestResults();
        const nextStatus = testStatusFromServerResults(results);
        saveUserStatus(user, nextStatus);
        setTestStatus(nextStatus);
        return nextStatus;
    };

    // При наличии серверного токена восстанавливаем сессию с бэкенда (источник
    // истины об аутентификации). Невалидный/просроченный токен — выходим.
    useEffect(() => {
        if (!getAccessToken()) return undefined;

        let active = true;
        (async () => {
            try {
                const user = await apiMe();
                if (!active) return;
                saveAuthUser(user);
                setAuthUser(user);
                const localStatus = readUserStatus(user);
                setTestStatus(localStatus);
                try {
                    const remoteStatus = await apiMyTestResults();
                    if (!active) return;
                    const nextStatus = testStatusFromServerResults(remoteStatus);
                    saveUserStatus(user, nextStatus);
                    setTestStatus(nextStatus);
                } catch {
                    if (active) setTestStatus(localStatus);
                }
            } catch {
                clearAccessToken();
                clearAuthUser();
                if (active) {
                    setAuthUser(null);
                    setTestStatus(readUserStatus(null));
                }
            }
        })();

        return () => {
            active = false;
        };
    }, []);

    const handleAuthSuccess = (user, options = { persist: true }) => {
        if (options.persist) {
            saveAuthUser(user);
        } else {
            clearAuthUser();
        }

        setAuthUser(user);
        const localStatus = readUserStatus(user);
        setTestStatus(localStatus);
        refreshServerTestStatus(user).catch(() => {
            setTestStatus(localStatus);
        });
    };

    const handleLogout = () => {
        apiLogout();
        clearAuthUser();
        setAuthUser(null);
        setTestStatus(readUserStatus(null));
    };

    const handleUserUpdate = (nextUserData) => {
        const nextUser = {
            ...authUser,
            ...nextUserData,
        };

        saveAuthUser(nextUser);
        saveUserStatus(nextUser, testStatus);
        setAuthUser(nextUser);
    };

    const handleAccountDelete = () => {
        apiLogout();
        clearAuthUser();
        setAuthUser(null);
        setTestStatus(readUserStatus(null));
    };

    const handleTestComplete = (testId, answers, result = {}) => {
        const answerValues = Object.values(answers || {});
        const fallbackScore = answerValues.length
            ? Math.round((answerValues.reduce((sum, value) => sum + Number(value), 0) / answerValues.length) * 10) / 10
            : null;
        const nextTestStatus = markTestCompleted(testStatus, testId, {
            ...result,
            answers,
            score: result.score ?? fallbackScore,
        });

        saveUserStatus(authUser, nextTestStatus);
        setTestStatus(nextTestStatus);

        // Отправляем результат на сервер: он решит, появилась ли новая вершина
        // графа, и оповестит сотрудничающих специалистов. Только для тестов,
        // формирующих граф, и только при наличии серверной сессии.
        if (getAccessToken() && SERVER_TEST_CODES.includes(testId)) {
            apiSubmitTestResult({
                testCode: testId,
                score: result.score ?? fallbackScore ?? 0,
                scoreLabel: result.scoreLabel || '',
                level: result.level || '',
                summary: result.summary || '',
                domains: result.domains || [],
                answers: Object.entries(answers || {}).map(([questionIndex, value]) => ({
                    questionIndex: Number(questionIndex),
                    value: Number(value),
                })),
            })
                .then(() => refreshServerTestStatus(authUser))
                .catch(() => {
                    /* отправка результата — best-effort, не мешаем UX */
                });
        }
    };

    return (
        <AppRouter
            isAuth={isAuth}
            user={authUser}
            userRole={userRole}
            status={status}
            testStatus={testStatus}
            onAuthSuccess={handleAuthSuccess}
            onLogout={handleLogout}
            onUserUpdate={handleUserUpdate}
            onAccountDelete={handleAccountDelete}
            onTestComplete={handleTestComplete}
        />
    );
}

export default App;
