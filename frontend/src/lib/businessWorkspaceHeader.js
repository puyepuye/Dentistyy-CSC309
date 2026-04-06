/**
 * Greeting + status line for practice workspace header (mirrors talent header behaviour).
 * Negotiations route header is built in BusinessAppLayout via negotiationWorkspaceHeader.js.
 * @param {string} pathname
 * @param {{ business_name?: string, verified?: boolean } | null} profile
 * @param {string | null | undefined} jobName
 */
export function businessHeaderFromPath(pathname, profile, jobName) {
    const name = profile?.business_name?.trim() || 'your practice';
    const hello = `Hello, ${name}`;
    const jobPreview = jobName || null;

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
    if (pathname.includes('/scheduled')) {
        return { greeting: 'Scheduled', statusLine: null };
    }
    if (pathname.includes('/jobs/new')) {
        return { greeting: hello, statusLine: 'New job posting' };
    }
    if (pathname.includes('/candidates') && !pathname.match(/\/candidates\/\d+$/)) {
        return {
            greeting: hello,
            statusLine: jobPreview
                ? `${jobPreview} — People — discover & manage`
                : 'People — discover & manage',
        };
    }
    if (pathname.includes('/interests')) {
        return {
            greeting: hello,
            statusLine: jobPreview
                ? `${jobPreview} — People — discover & manage`
                : 'People — discover & manage',
        };
    }
    if (pathname.match(/\/businesses\/jobs\/\d+$/)) {
        return { greeting: hello, statusLine: jobPreview || 'Job posting' };
    }
    if (pathname.includes('/jobs')) {
        return { greeting: hello, statusLine: 'Job postings' };
    }
    return { greeting: hello, statusLine: null };
}
