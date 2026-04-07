import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import BusinessSidebar from '../components/sidebar/BusinessSidebar.jsx';
import BusinessNegotiationMiniBar from '../components/business/BusinessNegotiationMiniBar.jsx';
import TalentWorkspaceHeader from '../components/talent/TalentWorkspaceHeader.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { BusinessNegotiationProvider, useBusinessNegotiation } from '../contexts/BusinessNegotiationContext.jsx';
import { BusinessProfileProvider, useBusinessProfile } from '../contexts/BusinessProfileContext.jsx';
import { getJobById } from '../lib/api.js';
import { businessHeaderFromPath } from '../lib/businessWorkspaceHeader.js';
import { businessNegotiationWorkspaceHeader } from '../lib/negotiationWorkspaceHeader.js';

function BusinessAppLayoutInner() {
    const { pathname } = useLocation();
    const { token } = useAuth();
    const { profile, loading } = useBusinessProfile();
    const { refresh: refreshNegotiation, negotiation, loading: negotiationLoading } = useBusinessNegotiation();
    const isBusinessScheduledPage =
        pathname === '/businesses/scheduled' || pathname === '/businesses/scheduled/';
    const isBusinessJobSectionPage = /^\/businesses\/jobs\/\d+(\/.*)?$/.test(pathname);
    const useBusinessFullWidthShell =
        pathname === '/businesses/jobs' || isBusinessScheduledPage || isBusinessJobSectionPage;
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

    useEffect(() => {
        if (pathname === '/businesses/negotiations') {
            void refreshNegotiation();
        }
    }, [pathname, refreshNegotiation]);

    const { greeting, statusLine } = useMemo(() => {
        if (pathname.includes('/negotiations')) {
            return businessNegotiationWorkspaceHeader(negotiation, negotiationLoading);
        }
        if (loading && !profile) {
            const base = businessHeaderFromPath(pathname, null, headerJobName);
            return { greeting: base.greeting, statusLine: 'Loading…' };
        }
        return businessHeaderFromPath(pathname, profile, headerJobName);
    }, [pathname, profile, loading, headerJobName, negotiation, negotiationLoading]);

    return (
        <div className="app-shell">
            <BusinessSidebar />
            <div className="app-shell__main">
                {!useBusinessFullWidthShell ? (
                    <TalentWorkspaceHeader
                        greeting={greeting}
                        statusLine={statusLine}
                        statusLineClassName={
                            statusLine?.startsWith('After a match')
                                ? 'talent-workspace-header__status--negotiation-intro'
                                : undefined
                        }
                    />
                ) : null}
                <div
                    className={`app-shell__body${useBusinessFullWidthShell ? ' app-shell__body--business-jobs-browse' : ''}`}
                >
                    <Outlet />
                </div>
                <BusinessNegotiationMiniBar />
            </div>
        </div>
    );
}

export default function BusinessAppLayout() {
    return (
        <BusinessProfileProvider>
            <BusinessNegotiationProvider>
                <BusinessAppLayoutInner />
            </BusinessNegotiationProvider>
        </BusinessProfileProvider>
    );
}
