import './styles/kit.css';
import { AppRouter } from './providers/AppRouter';
import { SessionProvider, useSession } from './providers/session';

function AppView() {
    const session = useSession();

    return (
        <AppRouter
            isAuth={session.isAuth}
            user={session.authUser}
            userRole={session.userRole}
            status={session.status}
            testStatus={session.testStatus}
            onAuthSuccess={session.handleAuthSuccess}
            onLogout={session.handleLogout}
            onUserUpdate={session.handleUserUpdate}
            onAccountDelete={session.handleAccountDelete}
            onPasswordChange={session.handlePasswordChange}
            onYandexLinkStart={session.handleYandexLinkStart}
            onYandexUnlink={session.handleYandexUnlink}
            onTestComplete={session.handleTestComplete}
        />
    );
}

export default function App() {
    return (
        <SessionProvider>
            <AppView />
        </SessionProvider>
    );
}
