import { useEffect, useState } from 'react';
import { apiLogout, apiMe, apiMyTestResults, apiSubmitTestResult, clearAccessToken, getAccessToken } from '../../../shared/api';
import { SessionContext } from './model/SessionContext';
import {
    clearAuthUser,
    markTestCompleted,
    readAuthUser,
    readUserStatus,
    saveAuthUser,
    saveUserStatus,
} from './model/sessionStorage';
import { SERVER_TEST_CODES, testStatusFromServerResults } from './model/testCompletion';

export function SessionProvider({ children }) {
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
                    /* Отправка результата best-effort, UX не блокируем. */
                });
        }
    };

    const value = {
        authUser,
        handleAccountDelete,
        handleAuthSuccess,
        handleLogout,
        handleTestComplete,
        handleUserUpdate,
        isAuth,
        status,
        testStatus,
        userRole,
        user: authUser,
        onAuthSuccess: handleAuthSuccess,
        onLogout: handleLogout,
        onUserUpdate: handleUserUpdate,
        onAccountDelete: handleAccountDelete,
        onTestComplete: handleTestComplete,
    };

    return (
        <SessionContext.Provider value={value}>
            {children}
        </SessionContext.Provider>
    );
}
