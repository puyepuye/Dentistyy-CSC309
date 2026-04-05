import { Outlet } from 'react-router-dom';
import BusinessSidebar from '../components/sidebar/BusinessSidebar.jsx';
import AppShellHeader from '../components/AppShellHeader.jsx';

export default function BusinessAppLayout() {
    return (
        <div className="app-shell">
            <BusinessSidebar />
            <div className="app-shell__main">
                <AppShellHeader title="Practice workspace" />
                <div className="app-shell__body">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
