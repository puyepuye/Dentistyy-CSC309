import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import BusinessSidebar from '../components/sidebar/BusinessSidebar.jsx';
import TalentWorkspaceHeader from '../components/talent/TalentWorkspaceHeader.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { BusinessProfileProvider, useBusinessProfile } from '../contexts/BusinessProfileContext.jsx';
import { getJobById, getMyNegotiation } from '../lib/api.js';
import { businessHeaderFromPath } from '../lib/businessWorkspaceHeader.js';
import { businessNegotiationWorkspaceHeader } from '../lib/negotiationWorkspaceHeader.js';

function BusinessAppLayoutInner() {
    const { pathname } = useLocation();
    const { token } = useAuth();
    const { profile, loading } = useBusinessProfile();
    const isBusinessScheduledPage =
        pathname === '/businesses/scheduled' || pathname === '/businesses/scheduled/';
    const useBusinessFullWidthShell =
        pathname === '/businesses/jobs' || isBusinessScheduledPage;
    const [headerJobName, setHeaderJobName] = useState(null);
    const [negotiationForHeader, setNegotiationForHeader] = useState(null);
    const [negotiationHeaderLoading, setNegotiationHeaderLoading] = useState(false);

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
        if (!pathname.includes('/negotiations') || !token) {
            setNegotiationForHeader(null);
            setNegotiationHeaderLoading(false);
            return undefined;
        }
        let cancelled = false;
        setNegotiationHeaderLoading(true);
        const loadOnce = async () => {
            try {
                const n = await getMyNegotiation(token);
                if (!cancelled) {
                    setNegotiationForHeader(n ?? null);
                    setNegotiationHeaderLoading(false);
                }
            } catch {
                if (!cancelled) {
                    setNegotiationForHeader(null);
                    setNegotiationHeaderLoading(false);
                }
            }
        };
        void loadOnce();
        const id = setInterval(async () => {
            try {
                const n = await getMyNegotiation(token);
                if (!cancelled) setNegotiationForHeader(n ?? null);
            } catch {
                if (!cancelled) setNegotiationForHeader(null);
            }
        }, 8000);
        return () => {
            cancelled = true;
            clearInterval(id);
        };
    }, [pathname, token]);

    const { greeting, statusLine } = useMemo(() => {
        if (pathname.includes('/negotiations')) {
            return businessNegotiationWorkspaceHeader(negotiationForHeader, negotiationHeaderLoading);
        }
        if (loading && !profile) {
            const base = businessHeaderFromPath(pathname, null, headerJobName);
            return { greeting: base.greeting, statusLine: 'Loading…' };
        }
        return businessHeaderFromPath(pathname, profile, headerJobName);
    }, [pathname, profile, loading, headerJobName, negotiationForHeader, negotiationHeaderLoading]);

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
