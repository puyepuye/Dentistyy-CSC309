import { useEffect, useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import UserSidebar from '../components/sidebar/UserSidebar.jsx';
import TalentWorkspaceHeader from '../components/talent/TalentWorkspaceHeader.jsx';
import TalentNegotiationMiniBar from '../components/talent/TalentNegotiationMiniBar.jsx';
import { TalentProfileProvider, useTalentProfile } from '../contexts/TalentProfileContext.jsx';
import { TalentNegotiationProvider, useTalentNegotiation } from '../contexts/TalentNegotiationContext.jsx';
import { talentHeaderFromPath } from '../lib/talentWorkspaceHeader.js';
import { talentNegotiationWorkspaceHeader } from '../lib/negotiationWorkspaceHeader.js';

function UserAppLayoutInner() {
    const { pathname } = useLocation();
    const { profile, loading } = useTalentProfile();
    const { refresh: refreshNegotiation, negotiation, loading: negotiationLoading } = useTalentNegotiation();

    useEffect(() => {
        if (pathname === '/talent/negotiations') {
            void refreshNegotiation();
        }
    }, [pathname, refreshNegotiation]);
    const isTalentJobsShell =
        pathname.startsWith('/talent/jobs') ||
        pathname.startsWith('/talent/businesses') ||
        pathname.startsWith('/talent/scheduled');

    const { greeting, statusLine } = useMemo(() => {
        if (pathname.includes('/negotiations')) {
            return talentNegotiationWorkspaceHeader(negotiation, negotiationLoading);
        }
        if (loading && !profile) {
            const base = talentHeaderFromPath(pathname);
            return { greeting: base.greeting, statusLine: 'Loading…' };
        }
        if (!profile) {
            return talentHeaderFromPath(pathname);
        }

        const name = `${profile.first_name} ${profile.last_name}`.trim() || 'there';
        const hello = `Hello, ${name}`;

        if (pathname.endsWith('/profile')) {
            const statusLineInner = profile.suspended
                ? 'Account suspended: discovery is disabled.'
                : `Discoverability: ${profile.available ? 'Active (within admin window)' : 'Idle: use the app'}`;
            return { greeting: hello, statusLine: statusLineInner };
        }
        if (pathname.includes('/businesses')) {
            return { greeting: hello, statusLine: 'Business' };
        }
        if (pathname.includes('/jobs')) {
            return { greeting: hello, statusLine: 'Jobs' };
        }
        if (pathname.includes('/scheduled')) {
            return { greeting: hello, statusLine: 'Scheduled' };
        }
        return { greeting: hello, statusLine: null };
    }, [pathname, profile, loading, negotiation, negotiationLoading]);

    return (
        <div className="app-shell">
            <UserSidebar />
            <div className="app-shell__main">
                {!isTalentJobsShell ? (
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
                    className={`app-shell__body${isTalentJobsShell ? ' app-shell__body--talent-jobs-browse' : ''}`}
                >
                    <Outlet />
                </div>
                <TalentNegotiationMiniBar />
            </div>
        </div>
    );
}

export default function UserAppLayout() {
    return (
        <TalentProfileProvider>
            <TalentNegotiationProvider>
                <UserAppLayoutInner />
            </TalentNegotiationProvider>
        </TalentProfileProvider>
    );
}
