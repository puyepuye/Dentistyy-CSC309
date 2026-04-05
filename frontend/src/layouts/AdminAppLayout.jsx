import { Outlet } from 'react-router-dom';
import AdminSidebar from '../components/sidebar/AdminSidebar.jsx';
import AppShellHeader from '../components/AppShellHeader.jsx';

export default function AdminAppLayout() {
    return (
        <div className="app-shell">
            <AdminSidebar />
            <div className="app-shell__main">
                <AppShellHeader title="Administration" />
                <div className="app-shell__body">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
