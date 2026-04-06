/**
 * Mint-band copy for /admin/*: page title (greeting line) + short purpose line (status line).
 * @param {string} pathname
 * @returns {{ title: string, description: string | null }}
 */
export function getAdminWorkspaceHeader(pathname) {
    const p = pathname.replace(/\/$/, '') || '/admin';

    if (p === '/admin') {
        return {
            title: 'Dashboard',
            description: 'Overview, shortcuts, and queues at a glance.',
        };
    }
    if (p.endsWith('/users')) {
        return {
            title: 'Users',
            description: 'Browse accounts and suspend or restore access.',
        };
    }
    if (p.endsWith('/businesses')) {
        return {
            title: 'Businesses',
            description: 'Verify practices and search the directory.',
        };
    }
    if (p.endsWith('/positions')) {
        return {
            title: 'Position types',
            description: 'Define roles, visibility, and deletion rules.',
        };
    }
    if (p.endsWith('/qualifications')) {
        return {
            title: 'Qualifications',
            description: 'Approve or reject credential submissions.',
        };
    }
    if (p.endsWith('/system')) {
        return {
            title: 'System',
            description: 'Adjust cooldowns, windows, and timeouts.',
        };
    }

    return {
        title: 'Admin',
        description: null,
    };
}
