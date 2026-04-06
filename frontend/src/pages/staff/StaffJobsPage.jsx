import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import {
    getBusinessesList,
    getMyJobInterests,
    getOpenJobs,
    getPositionTypes,
} from '../../lib/api.js';

const DEFAULT_LAT = 43.6532;
const DEFAULT_LON = -79.3832;
const PAGE_SIZE = 9;

function formatShiftRange(startIso, endIso) {
    const s = new Date(startIso);
    const e = new Date(endIso);
    const o = { hour: 'numeric', minute: '2-digit' };
    return `${s.toLocaleTimeString(undefined, o)} – ${e.toLocaleTimeString(undefined, o)}`;
}

function JobCard({ job, showMutual, mutual }) {
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
        <article className="talent-job-card">
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
        </article>
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
    const [interestsData, setInterestsData] = useState({ count: 0, results: [] });
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
            const data = await getMyJobInterests(token, { page, limit: PAGE_SIZE });
            setInterestsData({ count: data.count ?? 0, results: data.results ?? [] });
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load interests.');
            setInterestsData({ count: 0, results: [] });
        } finally {
            setLoading(false);
        }
    }, [token, page]);

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

    const filterCount =
        (positionTypeId ? 1 : 0) + (businessId ? 1 : 0) + (searchText.trim() ? 1 : 0);

    const totalPagesSearch = Math.max(1, Math.ceil((jobsData.count || 0) / PAGE_SIZE));
    const totalPagesInterests = Math.max(
        1,
        Math.ceil((interestsData.count || 0) / PAGE_SIZE)
    );
    const totalPages = tab === 'search' ? totalPagesSearch : totalPagesInterests;

    const displayCount =
        tab === 'search'
            ? searchText.trim()
                ? filteredJobs.length
                : jobsData.count
            : interestsData.count;

    const openJobsPosted =
        tab === 'search' ? jobsData.count : interestsData.count;

    useEffect(() => {
        setPage(1);
    }, [sortId, positionTypeId, businessId]);

    return (
        <div className="talent-jobs">
            <header className="talent-jobs__hero">
                <h1 className="talent-jobs__title">Jobs</h1>
                <p className="talent-jobs__subtitle">
                    {tab === 'search'
                        ? `${openJobsPosted} job${openJobsPosted === 1 ? '' : 's'} posted`
                        : `${interestsData.count} interested / matched`}
                </p>
                {geoNote ? (
                    <p className="talent-jobs__subtitle" style={{ fontSize: '0.85rem' }}>
                        {geoNote}
                    </p>
                ) : null}
            </header>

            <div className="talent-jobs__tabs" role="tablist">
                <button
                    type="button"
                    role="tab"
                    aria-selected={tab === 'search'}
                    className={
                        tab === 'search' ? 'talent-jobs__tab talent-jobs__tab--active' : 'talent-jobs__tab'
                    }
                    onClick={() => {
                        setTab('search');
                        setPage(1);
                    }}
                >
                    Search
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={tab === 'interested'}
                    className={
                        tab === 'interested'
                            ? 'talent-jobs__tab talent-jobs__tab--active'
                            : 'talent-jobs__tab'
                    }
                    onClick={() => {
                        setTab('interested');
                        setPage(1);
                    }}
                >
                    Interested / Matched Jobs
                </button>
            </div>

            {tab === 'search' ? (
                <>
                    <div className="talent-jobs__toolbar">
                        <div className="talent-jobs__search-wrap">
                            <i className="fas fa-search" aria-hidden />
                            <input
                                type="search"
                                className="talent-jobs__search"
                                placeholder="Search for a Job"
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                aria-label="Search jobs on this page"
                            />
                        </div>
                        <div className="talent-jobs__sort">
                            <span>Sort by:</span>
                            <select
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

                    <div className="talent-jobs__meta-row">
                        <button
                            type="button"
                            className="talent-jobs__advanced-toggle"
                            onClick={() => setAdvancedOpen((v) => !v)}
                            aria-expanded={advancedOpen}
                        >
                            Advanced Search
                            <i className={`fas fa-chevron-${advancedOpen ? 'up' : 'down'}`} aria-hidden />
                        </button>
                        <span>
                            {filterCount} filter{filterCount === 1 ? '' : 's'} applied
                        </span>
                        <span>
                            {searchText.trim()
                                ? `${filteredJobs.length} on this page (filtered)`
                                : `${displayCount} results found`}
                        </span>
                    </div>

                    {advancedOpen ? (
                        <div className="talent-jobs__advanced-panel">
                            <div className="talent-jobs__field">
                                <label htmlFor="tj-pt">Position type</label>
                                <select
                                    id="tj-pt"
                                    value={positionTypeId}
                                    onChange={(e) => setPositionTypeId(e.target.value)}
                                >
                                    <option value="">Any</option>
                                    {positionTypes.map((pt) => (
                                        <option key={pt.id} value={String(pt.id)}>
                                            {pt.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="talent-jobs__field">
                                <label htmlFor="tj-bus">Business</label>
                                <select
                                    id="tj-bus"
                                    value={businessId}
                                    onChange={(e) => setBusinessId(e.target.value)}
                                >
                                    <option value="">Any</option>
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

            {loading ? <p className="talent-jobs__loading">Loading…</p> : null}

            {!loading && tab === 'search' ? (
                filteredJobs.length === 0 ? (
                    <p className="talent-jobs__empty">No jobs match your filters.</p>
                ) : (
                    <div className="talent-jobs__grid">
                        {filteredJobs.map((job) => (
                            <JobCard key={job.id} job={job} />
                        ))}
                    </div>
                )
            ) : null}

            {!loading && tab === 'interested' ? (
                interestsData.results.length === 0 ? (
                    <p className="talent-jobs__empty">No interested jobs yet.</p>
                ) : (
                    <div className="talent-jobs__grid">
                        {interestsData.results.map((row) => (
                            <JobCard
                                key={row.interest_id}
                                job={row.job}
                                showMutual
                                mutual={row.mutual}
                            />
                        ))}
                    </div>
                )
            ) : null}

            {!loading && totalPages > 1 ? (
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
    );
}
