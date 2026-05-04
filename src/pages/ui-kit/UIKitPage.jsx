import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export default function UIKitPage() {
    return (
        <div className="kit-layout kit-layout-embedded">
            <Sidebar />
            <main className="kit-content">
                <Outlet />
            </main>
        </div>
    );
}
