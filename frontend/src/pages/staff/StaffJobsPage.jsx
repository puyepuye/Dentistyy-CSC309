import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import JobInterestCarousel from '../../components/staff/JobInterestCarousel.jsx';
import {
    getBusinessesList,
    getMyJobInterests,
    getOpenJobs,
    getPositionTypes,
} from '../../lib/api.js';
import { formatShiftCardLine } from '../../lib/scheduleDisplay.js';

const EMPTY_INTEREST_BUNDLE = {
    matched: { count: 0, results: [] },
    interest_shown: { count: 0, results: [] },
    interested_in_you: { count: 0, results: [] },
};

const DEFAULT_LAT = 43.6532;
const DEFAULT_LON = -79.3832;
const PAGE_SIZE = 9;

function formatJobsFoundLabel(n) {
    return `${n} job${n === 1 ? '' : 's'} found`;
}

function jobsParen(n) {
    return `(${n} job${n === 1 ? '' : 's'})`;
}

export function JobCard({ job, showMutual, mutual, detailQuery = '' }) {
    const title = job.position_type?.name ?? 'Job';
    const clinic = job.business?.business_name ?? 'Practice';
    const salary = `$${job.salary_min}–${job.salary_max}/hr`;
    const shift = formatShiftCardLine(job.start_time, job.end_time);
    const dist =
        job.distance != null && typeof job.distance === 'number'
            ? `${job.distance.toFixed(1)} km`
            : null;
    const eta = job.eta != null && typeof job.eta === 'number' ? `${job.eta} min` : null;

    const q = detailQuery ? `?${detailQuery}` : '';
    return (
        <Link to={`/talent/jobs/${job.id}${q}`} className="talent-job-card talent-job-card--link">
            <div className="talent-job-card__accent" aria-hidden />
            <div className="talent-job-card__body">
                <h3 className="talent-job-card__title">{title}</h3>
                <p className="talent-job-card__clinic">{clinic}</p>
                <p className="talent-job-card__line">
                    <i className="fas fa-map-marker-alt" aria-hidden />
                    <span>{clinic}</span>
                </p>
                {dist || eta ? (
                    <p className="talent-job-card__muted">
                        {dist}
                        {dist && eta ? ' • ' : ''}
                        {eta}
                    </p>
                ) : null}
                <p className="talent-job-card__salary">
                    <i className="fas fa-wallet" aria-hidden /> {salary}
                </p>
                <p className="talent-job-card__shift">{shift}</p>
                {showMutual && mutual ? (
                    <span className="talent-job-card__badge">Matched</span>
                ) : null}
            </div>
        </Link>
    );
}

const SORT_OPTIONS = [
    { id: 'closest', label: 'Closest', sort: 'distance', order: 'asc' },
    { id: 'start_time', label: 'Start time', sort: 'start_time', order: 'asc' },
    { id: 'updated', label: 'Recently updated', sort: 'updatedAt', order: 'desc' },
    { id: 'salary', label: 'Salary (high)', sort: 'salary_max', order: 'desc' },
];

export default function StaffJobsPage() {
    const { token } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const tab = searchParams.get('tab') === 'interested' ? 'interested' : 'search';
    const [page, setPage] = useState(1);
    const [sortId, setSortId] = useState('closest');
    const [lat, setLat] = useState(DEFAULT_LAT);
    const [lon, setLon] = useState(DEFAULT_LON);
    const [geoNote, setGeoNote] = useState(null);

    const [searchText, setSearchText] = useState('');
    const deferredSearch = useDeferredValue(searchText.trim());
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const [positionTypeId, setPositionTypeId] = useState('');
    const [businessId, setBusinessId] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const [positionTypes, setPositionTypes] = useState([]);
    const [businesses, setBusinesses] = useState([]);

    const [jobsData, setJobsData] = useState({ count: 0, results: [] });
    const [interestsBundle, setInterestsBundle] = useState(EMPTY_INTEREST_BUNDLE);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const sortConfig = SORT_OPTIONS.find((o) => o.id === sortId) ?? SORT_OPTIONS[0];

    useEffect(() => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLat(pos.coords.latitude);
                setLon(pos.coords.longitude);
                setGeoNote(null);
            },
            () => {
                setGeoNote('Using default location (Toronto) for distance.');
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
        );
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!token) return;
            try {
                const [ptRes, bRes] = await Promise.all([
                    getPositionTypes(token),
                    getBusinessesList({ page: 1, limit: 50 }),
                ]);
                if (cancelled) return;
                setPositionTypes(ptRes.results ?? []);
                setBusinesses(bRes.results ?? []);
            } catch {
                if (!cancelled) {
                    setPositionTypes([]);
                    setBusinesses([]);
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [token]);

    const loadJobs = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const params = {
                page,
                limit: PAGE_SIZE,
                sort: sortConfig.sort,
                order: sortConfig.order,
                position_type_id: positionTypeId || undefined,
                business_id: businessId || undefined,
                q: deferredSearch || undefined,
                date_from: dateFrom.trim() || undefined,
                date_to: dateTo.trim() || undefined,
            };
            if (sortConfig.sort === 'distance' || sortConfig.sort === 'eta') {
                params.lat = lat;
                params.lon = lon;
            }
            const data = await getOpenJobs(token, params);
            setJobsData({ count: data.count ?? 0, results: data.results ?? [] });
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load jobs.');
            setJobsData({ count: 0, results: [] });
        } finally {
            setLoading(false);
        }
    }, [
        token,
        page,
        sortConfig.sort,
        sortConfig.order,
        lat,
        lon,
        positionTypeId,
        businessId,
        deferredSearch,
        dateFrom,
        dateTo,
    ]);

    const loadInterests = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const data = await getMyJobInterests(token);
            setInterestsBundle({
                matched: data.matched ?? EMPTY_INTEREST_BUNDLE.matched,
                interest_shown: data.interest_shown ?? EMPTY_INTEREST_BUNDLE.interest_shown,
                interested_in_you: data.interested_in_you ?? EMPTY_INTEREST_BUNDLE.interested_in_you,
            });
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load interests.');
            setInterestsBundle(EMPTY_INTEREST_BUNDLE);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (!token) return;
        if (tab === 'search') {
            loadJobs();
        } else {
            loadInterests();
        }
    }, [token, tab, loadJobs, loadInterests]);

    const filterCount = useMemo(() => {
        let n = 0;
        if (positionTypeId) n++;
        if (businessId) n++;
        if (dateFrom.trim()) n++;
        if (dateTo.trim()) n++;
        if (sortId !== 'closest') n++;
        return n;
    }, [positionTypeId, businessId, sortId, dateFrom, dateTo]);

    const totalPagesSearch = Math.max(1, Math.ceil((jobsData.count || 0) / PAGE_SIZE));
    const totalPages = totalPagesSearch;
    const jobsPageRangeStart = jobsData.count > 0 ? (page - 1) * PAGE_SIZE + 1 : 0;
    const jobsPageRangeEnd =
        jobsData.count > 0 ? Math.min((page - 1) * PAGE_SIZE + jobsData.results.length, jobsData.count) : 0;

    const matchedRows = useMemo(
        () => interestsBundle.matched.results.filter((r) => r.job?.status !== 'filled'),
        [interestsBundle.matched.results]
    );

    const pipelineTotal = useMemo(
        () =>
            matchedRows.length +
            interestsBundle.interest_shown.results.length +
            interestsBundle.interested_in_you.results.length,
        [
            matchedRows.length,
            interestsBundle.interest_shown.results.length,
            interestsBundle.interested_in_you.results.length,
        ]
    );

    const openJobsPosted = tab === 'search' ? jobsData.count : pipelineTotal;

    const heroSubtitle =
        tab === 'search'
            ? loading && jobsData.count === 0
                ? 'Loading…'
                : `${openJobsPosted} job${openJobsPosted === 1 ? '' : 's'} posted`
            : loading && pipelineTotal === 0
              ? 'Loading…'
              : `${pipelineTotal} job${pipelineTotal === 1 ? '' : 's'} in your pipeline`;

    const resultsLine = useMemo(() => {
        if (loading && tab === 'search' && jobsData.count === 0) {
            return 'Loading…';
        }
        const c = jobsData.count ?? 0;
        if (deferredSearch) {
            return `${c} match${c === 1 ? '' : 'es'}`;
        }
        return `${Number(c).toLocaleString()} results found`;
    }, [loading, tab, jobsData.count, deferredSearch]);

    useEffect(() => {
        setPage(1);
    }, [sortId, positionTypeId, businessId, deferredSearch, dateFrom, dateTo]);

    function setJobsTab(next) {
        if (next === 'interested') {
            setSearchParams({ tab: 'interested' }, { replace: true });
        } else {
            setSearchParams({}, { replace: true });
        }
        setPage(1);
    }

    return (
        <div className="business-job-postings business-job-postings--browse staff-jobs-page">
            <header className="business-jobs-browse__hero">
                <div className="business-jobs-browse__hero-inner">
                    <div className="business-jobs-browse__hero-text">
                        <h1 className="business-jobs-browse__title">Jobs</h1>
                        <p className="business-jobs-browse__subtitle" aria-live="polite">
                            {heroSubtitle}
                        </p>
                        {geoNote ? (
                            <p className="business-jobs-browse__subtitle" style={{ fontSize: '0.85rem' }}>
                                {geoNote}
                            </p>
                        ) : null}
                    </div>
                </div>
            </header>

            <div className="business-jobs-browse__content">
                <div className="business-jobs-browse__tabs" role="tablist" aria-label="Job list views">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={tab === 'search'}
                        className={`business-jobs-browse__tab${tab === 'search' ? ' business-jobs-browse__tab--active' : ''}`}
                        onClick={() => setJobsTab('search')}
                    >
                        Job Search
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={tab === 'interested'}
                        className={`business-jobs-browse__tab${tab === 'interested' ? ' business-jobs-browse__tab--active' : ''}`}
                        onClick={() => setJobsTab('interested')}
                    >
                        Manage Job Interests
                    </button>
                </div>

                {tab === 'search' ? (
                    <>
                        <div className="business-jobs-browse__toolbar">
                            <div className="business-jobs-browse__toolbar-row business-jobs-browse__toolbar-row--top">
                                <div className="business-job-postings__search-wrap">
                                    <i className="fas fa-search" aria-hidden />
                                    <input
                                        className="business-job-postings__search business-job-postings__search--browse"
                                        type="search"
                                        placeholder="Search for a Job"
                                        value={searchText}
                                        onChange={(e) => setSearchText(e.target.value)}
                                        aria-label="Search jobs"
                                    />
                                </div>
                                <div className="business-jobs-browse__sort">
                                    <label htmlFor="talent-jobs-sort">Sort by:</label>
                                    <select
                                        id="talent-jobs-sort"
                                        value={sortId}
                                        onChange={(e) => setSortId(e.target.value)}
                                        aria-label="Sort jobs"
                                    >
                                        {SORT_OPTIONS.map((o) => (
                                            <option key={o.id} value={o.id}>
                                                {o.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="business-jobs-browse__toolbar-row business-jobs-browse__toolbar-row--sub">
                                <button
                                    type="button"
                                    className="business-jobs-browse__advanced"
                                    aria-expanded={advancedOpen}
                                    onClick={() => setAdvancedOpen((o) => !o)}
                                >
                                    Advanced Search
                                    <i className="fas fa-chevron-down" aria-hidden />
                                </button>
                                <span className="business-jobs-browse__filter-hint">
                                    {filterCount > 0 ? `${filterCount} filters applied` : 'No filters applied'}
                                </span>
                                <span className="business-jobs-browse__results" aria-live="polite">
                                    {loading ? 'Loading…' : resultsLine}
                                </span>
                            </div>
                        </div>

                        {advancedOpen ? (
                            <div
                                className="business-filters business-job-postings__filters"
                                role="search"
                                aria-label="Filter open jobs"
                            >
                                <div className="business-filters__field">
                                    <span className="business-filters__label">Position type</span>
                                    <select
                                        className="business-filters__select"
                                        value={positionTypeId}
                                        onChange={(e) => setPositionTypeId(e.target.value)}
                                        aria-label="Filter by position type"
                                    >
                                        <option value="">All types</option>
                                        {positionTypes.map((pt) => (
                                            <option key={pt.id} value={String(pt.id)}>
                                                {pt.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="business-filters__field business-filters__field--grow">
                                    <span className="business-filters__label">Business</span>
                                    <select
                                        className="business-filters__select"
                                        value={businessId}
                                        onChange={(e) => setBusinessId(e.target.value)}
                                        aria-label="Filter by business"
                                    >
                                        <option value="">Any practice</option>
                                        {businesses.map((b) => (
                                            <option key={b.id} value={String(b.id)}>
                                                {b.business_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="business-filters__field">
                                    <span className="business-filters__label">Shift starts from</span>
                                    <input
                                        className="business-filters__input"
                                        type="date"
                                        value={dateFrom}
                                        max={dateTo || undefined}
                                        onChange={(e) => setDateFrom(e.target.value)}
                                        aria-label="Filter jobs with shift start on or after this date"
                                    />
                                </div>
                                <div className="business-filters__field">
                                    <span className="business-filters__label">Shift starts until</span>
                                    <input
                                        className="business-filters__input"
                                        type="date"
                                        value={dateTo}
                                        min={dateFrom || undefined}
                                        onChange={(e) => setDateTo(e.target.value)}
                                        aria-label="Filter jobs with shift start on or before this date"
                                    />
                                </div>
                            </div>
                        ) : null}
                    </>
                ) : null}

                {error ? <p className="talent-jobs__error">{error}</p> : null}

                {loading && tab === 'interested' ? (
                    <p className="talent-jobs__loading">Loading…</p>
                ) : null}

                {!loading && tab === 'search' ? (
                    jobsData.results.length === 0 ? (
                        <p className="talent-jobs__empty">No jobs match your filters.</p>
                    ) : (
                        <div className="business-jobs-browse__grid">
                            {jobsData.results.map((job) => (
                                <JobCard key={job.id} job={job} />
                            ))}
                        </div>
                    )
                ) : null}

                {!loading && tab === 'interested' ? (
                    pipelineTotal === 0 ? (
                        <p className="talent-jobs__empty">No jobs in your pipeline yet.</p>
                    ) : (
                        <div className="talent-interest-sections">
                            <JobInterestCarousel
                                title={`Matched (${formatJobsFoundLabel(matchedRows.length)})`}
                                subtitle="You and the practice both expressed interest."
                                items={matchedRows}
                                emptyMessage="No matches yet."
                                renderItem={(row) => (
                                    <JobCard job={row.job} showMutual mutual={row.mutual} />
                                )}
                            />
                            <JobInterestCarousel
                                title={`Interested in you (${formatJobsFoundLabel(interestsBundle.interested_in_you.results.length)})`}
                                subtitle="Practices that reached out, open the job from Job Search to respond."
                                items={interestsBundle.interested_in_you.results}
                                emptyMessage="No practice outreach yet."
                                renderItem={(row) => (
                                    <JobCard job={row.job} showMutual={false} mutual={false} />
                                )}
                            />
                            <JobInterestCarousel
                                title={`Interest shown (${formatJobsFoundLabel(interestsBundle.interest_shown.results.length)})`}
                                subtitle="You expressed interest, waiting on the practice."
                                items={interestsBundle.interest_shown.results}
                                emptyMessage="No pending interest from you."
                                renderItem={(row) => (
                                    <JobCard job={row.job} showMutual mutual={row.mutual} />
                                )}
                            />
                        </div>
                    )
                ) : null}

                {tab === 'search' && !loading && totalPages > 1 ? (
                    <div className="talent-jobs__pagination">
                        <button
                            type="button"
                            disabled={page <= 1}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            aria-label="Previous page"
                        >
                            ◀
                        </button>
                        <span>
                            Page {page} of {totalPages}
                        </span>
                        <button
                            type="button"
                            disabled={page >= totalPages}
                            onClick={() => setPage((p) => p + 1)}
                            aria-label="Next page"
                        >
                            ▶
                        </button>
                    </div>
                ) : null}

                {tab === 'search' && !loading && jobsData.count > 0 ? (
                    <p className="staff-jobs-page__page-tag">
                        Page {page} (results {jobsPageRangeStart}-{jobsPageRangeEnd})
                    </p>
                ) : null}
            </div>
        </div>
    );
}
