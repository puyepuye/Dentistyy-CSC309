/** Shared formatting for talent + business Scheduled pages */

export function titleCaseStatus(status) {
    if (!status || typeof status !== 'string') return '';
    return status
        .split(/[\s_]+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
}

/** Hours between start and end, e.g. "6.5h" or "7h". */
export function formatShiftDuration(startIso, endIso) {
    const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
    if (!Number.isFinite(ms) || ms <= 0) return '';
    const h = ms / 3600000;
    if (Math.abs(h - Math.round(h)) < 0.02) {
        return `${Math.round(h)}h`;
    }
    return `${h.toFixed(1)}h`;
}

/** e.g. "Mon, 1:30 PM – 8:00 PM (6.5h)" */
export function formatSchedulePrimary(startIso, endIso) {
    const s = new Date(startIso);
    const e = new Date(endIso);
    const weekday = s.toLocaleDateString(undefined, { weekday: 'short' });
    const timeOpts = { hour: 'numeric', minute: '2-digit' };
    const range = `${s.toLocaleTimeString(undefined, timeOpts)} – ${e.toLocaleTimeString(undefined, timeOpts)}`;
    const dur = formatShiftDuration(startIso, endIso);
    return dur ? `${weekday}, ${range} (${dur})` : `${weekday}, ${range}`;
}

/**
 * Mirrors talent GET /users/me/jobs scope split for business-owned jobs:
 * upcoming = active future work only; terminal / ended jobs go to past.
 */
export function isBusinessScheduleUpcoming(job, now = new Date()) {
    const status = (job.status || '').toLowerCase();
    if (status !== 'open' && status !== 'filled') return false;
    return new Date(job.end_time) > now;
}

/** Business Scheduled tab: only shifts with an assigned worker (omit open / unassigned postings). */
export function isBusinessScheduleJobAssigned(job) {
    return job?.worker != null;
}

export function splitBusinessJobsForSchedule(results, now = new Date()) {
    const upcoming = [];
    const past = [];
    for (const j of results) {
        if (isBusinessScheduleUpcoming(j, now)) upcoming.push(j);
        else past.push(j);
    }
    upcoming.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
    past.sort((a, b) => new Date(b.end_time) - new Date(a.end_time));
    return { upcoming, past };
}
