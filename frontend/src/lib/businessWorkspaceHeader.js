/**
 * Greeting + status line for practice workspace header (mirrors talent header behaviour).
 * @param {string} pathname
 * @param {{ business_name?: string, verified?: boolean } | null} profile
 */
export function businessHeaderFromPath(pathname, profile) {
    const name = profile?.business_name?.trim() || 'your practice';
    const hello = `Hello, ${name}`;

    if (pathname === '/businesses' || pathname === '/businesses/') {
        return {
            greeting: hello,
            statusLine: profile?.verified
                ? 'Verified practice'
                : 'Verification pending: job creation is disabled until verified.',
        };
    }
    if (pathname.endsWith('/profile')) {
        return { greeting: hello, statusLine: 'Practice profile' };
    }
    if (pathname.includes('/negotiations')) {
        return { greeting: hello, statusLine: 'Negotiations' };
    }
    if (pathname.includes('/jobs/new')) {
        return { greeting: hello, statusLine: 'New job posting' };
    }
    if (pathname.match(/\/jobs\/\d+\/candidates\/\d+$/)) {
        return { greeting: hello, statusLine: 'Candidate detail' };
    }
    if (pathname.includes('/candidates')) {
        return { greeting: hello, statusLine: 'Discoverable candidates' };
    }
    if (pathname.includes('/interests')) {
        return { greeting: hello, statusLine: 'Interested candidates' };
    }
    if (pathname.match(/\/businesses\/jobs\/\d+$/)) {
        return { greeting: hello, statusLine: 'Job posting' };
    }
    if (pathname.includes('/jobs')) {
        return { greeting: hello, statusLine: 'Job postings' };
    }
    return { greeting: hello, statusLine: null };
}
