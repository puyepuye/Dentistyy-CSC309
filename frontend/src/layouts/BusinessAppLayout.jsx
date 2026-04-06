import { useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import BusinessSidebar from '../components/sidebar/BusinessSidebar.jsx';
import TalentWorkspaceHeader from '../components/talent/TalentWorkspaceHeader.jsx';
import { BusinessProfileProvider, useBusinessProfile } from '../contexts/BusinessProfileContext.jsx';
import { businessHeaderFromPath } from '../lib/businessWorkspaceHeader.js';

function BusinessAppLayoutInner() {
    const { pathname } = useLocation();
    const { profile, loading } = useBusinessProfile();
    const isBusinessJobsBrowse = pathname === '/businesses/jobs';

    const { greeting, statusLine } = useMemo(() => {
        if (loading && !profile) {
            const base = businessHeaderFromPath(pathname, null);
            return { greeting: base.greeting, statusLine: 'Loading…' };
        }
        return businessHeaderFromPath(pathname, profile);
    }, [pathname, profile, loading]);

    return (
        <div className="app-shell">
            <BusinessSidebar />
            <div className="app-shell__main">
                {!isBusinessJobsBrowse ? (
                    <TalentWorkspaceHeader greeting={greeting} statusLine={statusLine} />
                ) : null}
                <div
                    className={`app-shell__body${isBusinessJobsBrowse ? ' app-shell__body--business-jobs-browse' : ''}`}
                >
                    <Outlet />
                </div>
            </div>
        </div>
    );
}

export default function BusinessAppLayout() {
    return (
        <BusinessProfileProvider>
            <BusinessAppLayoutInner />
        </BusinessProfileProvider>
    );
}
