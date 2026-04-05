import { useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import UserSidebar from '../components/sidebar/UserSidebar.jsx';
import TalentWorkspaceHeader from '../components/talent/TalentWorkspaceHeader.jsx';
import { TalentProfileProvider, useTalentProfile } from '../contexts/TalentProfileContext.jsx';
import { talentHeaderFromPath } from '../lib/talentWorkspaceHeader.js';

function UserAppLayoutInner() {
    const { pathname } = useLocation();
    const { profile, loading } = useTalentProfile();

    const { greeting, statusLine } = useMemo(() => {
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
                ? 'Account suspended — discovery is disabled.'
                : `Availability: ${profile.available ? 'Available' : 'Unavailable'}`;
            return { greeting: hello, statusLine: statusLineInner };
        }
        if (pathname.includes('/jobs')) {
            return { greeting: hello, statusLine: 'Jobs' };
        }
        if (pathname.includes('/negotiations')) {
            return { greeting: hello, statusLine: 'Negotiations' };
        }
        if (pathname.includes('/scheduled')) {
            return { greeting: hello, statusLine: 'Scheduled' };
        }
        return { greeting: hello, statusLine: null };
    }, [pathname, profile, loading]);

    return (
        <div className="app-shell">
            <UserSidebar />
            <div className="app-shell__main">
                <TalentWorkspaceHeader greeting={greeting} statusLine={statusLine} />
                <div className="app-shell__body">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}

export default function UserAppLayout() {
    return (
        <TalentProfileProvider>
            <UserAppLayoutInner />
        </TalentProfileProvider>
    );
}
