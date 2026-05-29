import { useState } from 'react';
import './app/styles/kit.css';
import { AppRouter } from './app/providers/AppRouter';
import { clearAuthUser, readAuthUser, saveAuthUser, markTestCompleted, readUserStatus, saveUserStatus } from './entities/user';

function App() {
    const [authUser, setAuthUser] = useState(readAuthUser);
    const [testStatus, setTestStatus] = useState(() => readUserStatus(readAuthUser()));
    const isAuth = Boolean(authUser);
    const userRole = authUser?.role || null;
    const status = authUser?.status || authUser?.accountType || null;

    const handleAuthSuccess = (user, options = { persist: true }) => {
        if (options.persist) {
            saveAuthUser(user);
        } else {
            clearAuthUser();
        }

        setAuthUser(user);
        setTestStatus(readUserStatus(user));
    };

    const handleLogout = () => {
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
