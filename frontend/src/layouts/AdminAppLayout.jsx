import { useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AdminSidebar from '../components/sidebar/AdminSidebar.jsx';
import TalentWorkspaceHeader from '../components/talent/TalentWorkspaceHeader.jsx';
import { getAdminWorkspaceHeader } from '../lib/adminWorkspaceHeader.js';

export default function AdminAppLayout() {
    const { pathname } = useLocation();

    const { greeting, statusLine } = useMemo(() => {
        const { title, description } = getAdminWorkspaceHeader(pathname);
        return {
            greeting: title,
            statusLine: description,
        };
    }, [pathname]);

    return (
        <div className="app-shell">
            <AdminSidebar />
            <div className="app-shell__main">
                <TalentWorkspaceHeader greeting={greeting} statusLine={statusLine} />
                <div className="app-shell__body app-shell__body--admin">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
