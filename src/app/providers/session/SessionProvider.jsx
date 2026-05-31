import { useEffect, useState } from 'react';
import { clearAccessToken, getAccessToken } from '../../../shared/api';
import {
    apiChangePassword,
    apiDeleteOwnAccount,
    apiLogout,
    apiMe,
    apiStartYandexLink,
    apiUnlinkYandex,
    apiUpdateProfile,
} from '../../../entities/user';
import { apiMyTestResults, apiSubmitTestResult } from '../../../entities/test';
import { SessionContext } from './model/SessionContext';
import {
    clearAuthUser,
    markTestCompleted,
    readAuthUser,
    readUserStatus,
    saveAuthUser,
    saveUserStatus,
} from './model/sessionStorage';
import { testStatusFromServerResults } from './model/testCompletion';

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

    const handleUserUpdate = async (nextUserData) => {
        if (!authUser) return null;

        const nextUserDraft = {
            ...authUser,
            ...nextUserData,
        };
        const nextUser = await apiUpdateProfile(nextUserDraft);

        saveAuthUser(nextUser);
        saveUserStatus(nextUser, testStatus);
        setAuthUser(nextUser);
        return nextUser;
    };

    const handlePasswordChange = async (passwords) => {
        await apiChangePassword(passwords);
    };

    const handleYandexLinkStart = async () => {
        const payload = await apiStartYandexLink();
        return payload?.redirectUrl || '';
    };

    const handleYandexUnlink = async () => {
        const nextUser = await apiUnlinkYandex();
        saveAuthUser(nextUser);
        saveUserStatus(nextUser, testStatus);
        setAuthUser(nextUser);
        return nextUser;
    };

    const handleAccountDelete = async () => {
        await apiDeleteOwnAccount();
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

        if (getAccessToken()) {
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
        handlePasswordChange,
        handleTestComplete,
        handleUserUpdate,
        handleYandexLinkStart,
        handleYandexUnlink,
        isAuth,
        status,
        testStatus,
        userRole,
        user: authUser,
        onAuthSuccess: handleAuthSuccess,
        onLogout: handleLogout,
        onUserUpdate: handleUserUpdate,
        onAccountDelete: handleAccountDelete,
        onPasswordChange: handlePasswordChange,
        onYandexLinkStart: handleYandexLinkStart,
        onYandexUnlink: handleYandexUnlink,
        onTestComplete: handleTestComplete,
    };

    return (
        <SessionContext.Provider value={value}>
            {children}
        </SessionContext.Provider>
    );
}
