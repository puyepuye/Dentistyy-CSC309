import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { getBusinessMyJobs } from '../../lib/api.js';
import {
    formatSchedulePrimary,
    isBusinessScheduleJobAssigned,
    splitBusinessJobsForSchedule,
    titleCaseStatus,
} from '../../lib/scheduleDisplay.js';

const DATE_ACCENT_CLASSES = [
    'staff-scheduled-row--accent-a',
    'staff-scheduled-row--accent-b',
    'staff-scheduled-row--accent-c',
    'staff-scheduled-row--accent-d',
];

function BusinessScheduleRow({ job, variant }) {
    const startIso = job.start_time;
    const endIso = job.end_time;
    const start = new Date(startIso);

    const month = start
        .toLocaleDateString(undefined, { month: 'short' })
        .toUpperCase();
    const dayNum = start.getDate();

    const title = job.position_type?.name ?? 'Posting';
    const workerLabel = job.worker
        ? `${job.worker.first_name ?? ''} ${job.worker.last_name ?? ''}`.trim() || 'Worker'
        : 'Unassigned';
    const statusLabel = titleCaseStatus(job.status);
    const accentClass = DATE_ACCENT_CLASSES[job.id % DATE_ACCENT_CLASSES.length];

    return (
        <Link
            to={`/businesses/jobs/${job.id}`}
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
                    {workerLabel} · {title}
                </p>
                <p className="staff-scheduled-row__status">{statusLabel}</p>
            </div>
            <span className="staff-scheduled-row__chevron" aria-hidden="true">
                <i className="fas fa-chevron-right" />
            </span>
        </Link>
    );
}

export default function BusinessScheduledPage() {
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
            const res = await getBusinessMyJobs(token, {
                page: '1',
                limit: '500',
                status: ['OPEN', 'FILLED', 'COMPLETED', 'CANCELLED', 'EXPIRED'],
                order_by: 'start_time',
                order: 'asc',
            });
            const results = (res.results || []).filter(isBusinessScheduleJobAssigned);
            const { upcoming: up, past: pa } = splitBusinessJobsForSchedule(results);
            setUpcoming({ count: up.length, results: up });
            setPast({ count: pa.length, results: pa });
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not load scheduled jobs.');
            setUpcoming({ count: 0, results: [] });
            setPast({ count: 0, results: [] });
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        load();
    }, [load]);

    const activeList = tab === 'upcoming' ? upcoming.results : past.results;

    return (
        <div className="business-job-postings business-job-postings--browse staff-jobs-page staff-scheduled-page">
            <header className="business-jobs-browse__hero">
                <div className="business-jobs-browse__hero-inner">
                    <div className="business-jobs-browse__hero-text">
                        <h1 className="business-jobs-browse__title">Scheduled</h1>
                        <p className="business-jobs-browse__subtitle staff-scheduled-page__meta" aria-live="polite">
                            {loading
                                ? 'Loading…'
                                : `${upcoming.count} upcoming · ${past.count} past`}
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
                                ? 'No upcoming assigned shifts. Jobs with a confirmed worker appear here once scheduled.'
                                : 'No completed or cancelled assigned shifts yet.'}
                        </p>
                    ) : (
                        <div className="staff-scheduled-list" role="list">
                            {activeList.map((job) => (
                                <BusinessScheduleRow
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
