import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import BusinessSidebar from '../components/sidebar/BusinessSidebar.jsx';
import TalentWorkspaceHeader from '../components/talent/TalentWorkspaceHeader.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { BusinessProfileProvider, useBusinessProfile } from '../contexts/BusinessProfileContext.jsx';
import { getJobById } from '../lib/api.js';
import { businessHeaderFromPath } from '../lib/businessWorkspaceHeader.js';

function BusinessAppLayoutInner() {
    const { pathname } = useLocation();
    const { token } = useAuth();
    const { profile, loading } = useBusinessProfile();
    const isBusinessJobsBrowse = pathname === '/businesses/jobs';
    const [headerJobName, setHeaderJobName] = useState(null);

    useEffect(() => {
        const m = pathname.match(/\/businesses\/jobs\/(\d+)/);
        if (!m || !token) {
            setHeaderJobName(null);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const res = await getJobById(token, Number(m[1]));
                if (!cancelled) {
                    setHeaderJobName(res?.position_type?.name || null);
                }
            } catch {
                if (!cancelled) setHeaderJobName(null);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [pathname, token]);

    const { greeting, statusLine } = useMemo(() => {
        if (loading && !profile) {
            const base = businessHeaderFromPath(pathname, null, headerJobName);
            return { greeting: base.greeting, statusLine: 'Loading…' };
        }
        return businessHeaderFromPath(pathname, profile, headerJobName);
    }, [pathname, profile, loading, headerJobName]);

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
