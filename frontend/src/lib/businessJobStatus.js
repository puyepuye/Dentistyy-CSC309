/**
 * Filled or completed: show "Filled by" and worker profile preview from job overview.
 * @param {string | undefined | null} status
 */
export function isJobFilledOrCompleted(status) {
    const s = (status || '').toLowerCase();
    return s === 'filled' || s === 'completed';
}

/**
 * Jobs where People (discover / manage / search) should be unavailable.
 */
export function isJobPeopleTabDisabled(status) {
    const s = (status || '').toLowerCase();
    return s === 'filled' || s === 'completed' || s === 'cancelled';
}

export function formatJobStatusLabel(status) {
    const s = (status || '').toLowerCase();
    switch (s) {
        case 'open':
            return 'Open';
        case 'filled':
            return 'Filled';
        case 'expired':
            return 'Expired';
        case 'cancelled':
            return 'Cancelled';
        case 'completed':
            return 'Completed';
        default:
            return s ? s.charAt(0).toUpperCase() + s.slice(1) : '-';
    }
}

export function getBusinessJobBadgeClass(status) {
    const s = (status || '').toLowerCase();
    if (s === 'open') return 'business-badge business-badge--open';
    if (s === 'filled') return 'business-badge business-badge--filled';
    if (s === 'expired') return 'business-badge business-badge--expired';
    if (s === 'cancelled') return 'business-badge business-badge--cancelled';
    if (s === 'completed') return 'business-badge business-badge--completed';
    return 'business-badge business-badge--muted';
}
