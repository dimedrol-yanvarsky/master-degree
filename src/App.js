import './app/styles/kit.css';
import { AppRouter } from './app/providers/AppRouter';

function App() {
    const isAuth = false;
    const userRole = null;

    return <AppRouter isAuth={isAuth} userRole={userRole} />;
}

export default App;
