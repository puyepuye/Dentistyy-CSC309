import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import JobInterestCarousel from '../../components/staff/JobInterestCarousel.jsx';
import {
    getBusinessesList,
    getMyJobInterests,
    getOpenJobs,
    getPositionTypes,
} from '../../lib/api.js';

const EMPTY_INTEREST_BUNDLE = {
    matched: { count: 0, results: [] },
    interest_shown: { count: 0, results: [] },
    interested_in_you: { count: 0, results: [] },
};

const DEFAULT_LAT = 43.6532;
const DEFAULT_LON = -79.3832;
const PAGE_SIZE = 9;

function formatShiftRange(startIso, endIso) {
    const s = new Date(startIso);
    const e = new Date(endIso);
    const o = { hour: 'numeric', minute: '2-digit' };
    return `${s.toLocaleTimeString(undefined, o)} – ${e.toLocaleTimeString(undefined, o)}`;
}

export function JobCard({ job, showMutual, mutual }) {
    const title = job.position_type?.name ?? 'Job';
    const clinic = job.business?.business_name ?? 'Practice';
    const salary = `$${job.salary_min}–${job.salary_max}/hr`;
    const shift = formatShiftRange(job.start_time, job.end_time);
    const dist =
        job.distance != null && typeof job.distance === 'number'
            ? `${job.distance.toFixed(1)} km`
            : null;
    const eta = job.eta != null && typeof job.eta === 'number' ? `${job.eta} min` : null;

    return (
        <Link to={`/talent/jobs/${job.id}`} className="talent-job-card talent-job-card--link">
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
    const [tab, setTab] = useState('search');
    const [page, setPage] = useState(1);
    const [sortId, setSortId] = useState('closest');
    const [lat, setLat] = useState(DEFAULT_LAT);
    const [lon, setLon] = useState(DEFAULT_LON);
    const [geoNote, setGeoNote] = useState(null);

    const [searchText, setSearchText] = useState('');
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const [positionTypeId, setPositionTypeId] = useState('');
    const [businessId, setBusinessId] = useState('');

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

    const filteredJobs = useMemo(() => {
        const list = jobsData.results;
        const q = searchText.trim().toLowerCase();
        if (!q) return list;
        return list.filter(
            (j) =>
                j.position_type?.name?.toLowerCase().includes(q) ||
                j.business?.business_name?.toLowerCase().includes(q)
        );
    }, [jobsData.results, searchText]);

    const filterCount = useMemo(() => {
        let n = 0;
        if (positionTypeId) n++;
        if (businessId) n++;
        if (sortId !== 'closest') n++;
        return n;
    }, [positionTypeId, businessId, sortId]);

    const totalPagesSearch = Math.max(1, Math.ceil((jobsData.count || 0) / PAGE_SIZE));
    const totalPages = totalPagesSearch;

    const pipelineTotal = useMemo(
        () =>
            interestsBundle.matched.count +
            interestsBundle.interest_shown.count +
            interestsBundle.interested_in_you.count,
        [interestsBundle]
    );

    const displayCount =
        tab === 'search'
            ? searchText.trim()
                ? filteredJobs.length
                : jobsData.count
            : pipelineTotal;

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
        if (searchText.trim()) {
            const m = filteredJobs.length;
            return `${m} match${m === 1 ? '' : 'es'} on this page`;
        }
        return `${Number(displayCount).toLocaleString()} results found`;
    }, [searchText, filteredJobs.length, displayCount]);

    useEffect(() => {
        setPage(1);
    }, [sortId, positionTypeId, businessId]);

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
                        onClick={() => {
                            setTab('search');
                            setPage(1);
                        }}
                    >
                        Job Search
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={tab === 'interested'}
                        className={`business-jobs-browse__tab${tab === 'interested' ? ' business-jobs-browse__tab--active' : ''}`}
                        onClick={() => {
                            setTab('interested');
                            setPage(1);
                        }}
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
                            </div>
                        ) : null}
                    </>
                ) : null}

                {error ? <p className="talent-jobs__error">{error}</p> : null}

                {loading && tab === 'interested' ? (
                    <p className="talent-jobs__loading">Loading…</p>
                ) : null}

                {!loading && tab === 'search' ? (
                    filteredJobs.length === 0 ? (
                        <p className="talent-jobs__empty">No jobs match your filters.</p>
                    ) : (
                        <div className="business-jobs-browse__grid">
                            {filteredJobs.map((job) => (
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
                                title="Matched"
                                subtitle="You and the practice both expressed interest."
                                items={interestsBundle.matched.results}
                                emptyMessage="No matches yet."
                                renderItem={(row) => (
                                    <JobCard job={row.job} showMutual mutual={row.mutual} />
                                )}
                            />
                            <JobInterestCarousel
                                title="Interested in you"
                                subtitle="Practices that reached out, open the job from Job Search to respond."
                                items={interestsBundle.interested_in_you.results}
                                emptyMessage="No practice outreach yet."
                                renderItem={(row) => (
                                    <JobCard job={row.job} showMutual={false} mutual={false} />
                                )}
                            />
                            <JobInterestCarousel
                                title="Interest shown"
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
            </div>
        </div>
    );
}
