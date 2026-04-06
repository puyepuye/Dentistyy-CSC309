/** Heading copy for staff routes (profile title is overridden in UserAppLayout from API). */
export function talentHeaderFromPath(pathname) {
    if (pathname.endsWith('/profile')) {
        return {
            greeting: 'Profile',
            statusLine: null,
        };
    }
    if (pathname.includes('/businesses')) {
        return { greeting: 'Business', statusLine: null };
    }
    if (pathname.includes('/jobs')) {
        return { greeting: 'Jobs', statusLine: null };
    }
    if (pathname.includes('/negotiations')) {
        return { greeting: 'Negotiation', statusLine: null };
    }
    if (pathname.includes('/scheduled')) {
        return { greeting: 'Scheduled', statusLine: null };
    }
    return { greeting: 'Staff workspace', statusLine: null };
}
