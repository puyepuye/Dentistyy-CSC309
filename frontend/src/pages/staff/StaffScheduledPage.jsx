import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { getMyWorkerJobs } from '../../lib/api.js';
import { formatJobStatusLabel } from '../../lib/businessJobStatus.js';
import { formatSchedulePrimary } from '../../lib/scheduleDisplay.js';

const DATE_ACCENT_CLASSES = [
    'staff-scheduled-row--accent-a',
    'staff-scheduled-row--accent-b',
    'staff-scheduled-row--accent-c',
    'staff-scheduled-row--accent-d',
];

function ScheduledShiftRow({ job, variant }) {
    const startIso = job.start_time;
    const endIso = job.end_time;
    const start = new Date(startIso);

    const month = start
        .toLocaleDateString(undefined, { month: 'short' })
        .toUpperCase();
    const dayNum = start.getDate();

    const title = job.position_type?.name ?? 'Shift';
    const place = job.business?.business_name ?? 'Practice';
    const accentClass = DATE_ACCENT_CLASSES[job.id % DATE_ACCENT_CLASSES.length];

    return (
        <Link
            to={`/talent/jobs/${job.id}`}
            className={`staff-scheduled-row ${accentClass}${
                variant === 'upcoming' ? ' staff-scheduled-row--upcoming' : ''
            }`}
        >
            <div className="staff-scheduled-row__date" aria-hidden="true">
                <span className="staff-scheduled-row__month">{month}</span>
                <span className="staff-scheduled-row__day">{dayNum}</span>
            </div>
            <div className="staff-scheduled-row__body">
                <p className="staff-scheduled-row__primary">{formatSchedulePrimary(startIso, endIso)}</p>
                <p className="staff-scheduled-row__secondary">
                    {place} · {title}
                </p>
                {variant === 'past' ? (
                    <p className="staff-scheduled-row__status">{formatJobStatusLabel(job.status)}</p>
                ) : (
                    <p className="staff-scheduled-row__status staff-scheduled-row__status--placeholder" aria-hidden>
                        Status
                    </p>
                )}
            </div>
            <span className="staff-scheduled-row__chevron" aria-hidden="true">
                <i className="fas fa-chevron-right" />
            </span>
        </Link>
    );
}

export default function StaffScheduledPage() {
    const { token } = useAuth();
    const [tab, setTab] = useState('upcoming');
    const [upcoming, setUpcoming] = useState({ count: 0, results: [] });
    const [past, setPast] = useState({ count: 0, results: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const load = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const [up, pa] = await Promise.all([
                getMyWorkerJobs(token, { scope: 'upcoming', limit: 100 }),
                getMyWorkerJobs(token, { scope: 'past', limit: 100 }),
            ]);
            setUpcoming(up);
            setPast(pa);
        } catch (e) {
            setError(e?.message || 'Could not load scheduled jobs.');
            setUpcoming({ count: 0, results: [] });
            setPast({ count: 0, results: [] });
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        load();
    }, [load]);

    /** Upcoming = not ended, and not completed / cancelled / expired (aligns with GET /users/me/jobs?scope=upcoming). */
    const upcomingRows = useMemo(() => {
        const now = Date.now();
        return (upcoming.results || []).filter((job) => {
            const s = String(job.status ?? '').toLowerCase();
            if (['cancelled', 'completed', 'expired'].includes(s)) return false;
            const end = new Date(job.end_time).getTime();
            return Number.isFinite(end) && end > now;
        });
    }, [upcoming.results]);

    const activeList = tab === 'upcoming' ? upcomingRows : past.results;
    return (
        <div className="business-job-postings business-job-postings--browse staff-jobs-page staff-scheduled-page">
            <header className="business-jobs-browse__hero">
                <div className="business-jobs-browse__hero-inner">
                    <div className="business-jobs-browse__hero-text">
                        <h1 className="business-jobs-browse__title">Scheduled</h1>
                        <p className="business-jobs-browse__subtitle staff-scheduled-page__meta" aria-live="polite">
                            {loading
                                ? 'Loading…'
                                : `${upcomingRows.length} upcoming · ${past.count} past`}
                        </p>
                    </div>
                </div>
            </header>

            <div className="business-jobs-browse__content">
                <div className="business-jobs-browse__tabs" role="tablist" aria-label="Scheduled job views">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={tab === 'upcoming'}
                        className={`business-jobs-browse__tab${tab === 'upcoming' ? ' business-jobs-browse__tab--active' : ''}`}
                        onClick={() => setTab('upcoming')}
                    >
                        Upcoming
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={tab === 'past'}
                        className={`business-jobs-browse__tab${tab === 'past' ? ' business-jobs-browse__tab--active' : ''}`}
                        onClick={() => setTab('past')}
                    >
                        Completed / Cancelled
                    </button>
                </div>

                {error ? <p className="talent-jobs__error">{error}</p> : null}

                {loading ? <p className="talent-jobs__loading">Loading…</p> : null}

                {!loading && !error ? (
                    activeList.length === 0 ? (
                        <p className="talent-jobs__empty">
                            {tab === 'upcoming'
                                ? 'No upcoming shifts. Accepted jobs from negotiation appear here.'
                                : 'No completed or cancelled shifts yet.'}
                        </p>
                    ) : (
                        <div className="staff-scheduled-list" role="list">
                            {activeList.map((job) => (
                                <ScheduledShiftRow
                                    key={job.id}
                                    job={job}
                                    variant={tab === 'past' ? 'past' : 'upcoming'}
                                />
                            ))}
                        </div>
                    )
                ) : null}
            </div>
        </div>
    );
}
