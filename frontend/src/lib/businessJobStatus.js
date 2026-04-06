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
