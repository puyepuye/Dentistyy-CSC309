import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useBusinessProfile } from '../../contexts/BusinessProfileContext.jsx';
import BusinessJobPostingCard from '../../components/business/jobs/BusinessJobPostingCard.jsx';
import BusinessJobPostingsFilterBar, { STATUS_KEYS } from '../../components/business/jobs/BusinessJobPostingsFilterBar.jsx';
import BusinessJobPostingsPagination from '../../components/business/jobs/BusinessJobPostingsPagination.jsx';
import BusinessJobsBrowseToolbar, { SORT_PRESETS } from '../../components/business/jobs/BusinessJobsBrowseToolbar.jsx';
import { getBusinessMyJobs, getPositionTypes } from '../../lib/api.js';

export default function BusinessJobsPage() {
    const { token } = useAuth();
    const { profile } = useBusinessProfile();
    const [jobs, setJobs] = useState([]);
    const [count, setCount] = useState(0);
    const [page, setPage] = useState(1);
    const [limit] = useState(6);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [positionTypes, setPositionTypes] = useState([]);
    const [positionTypeId, setPositionTypeId] = useState('');
    const [salaryMin, setSalaryMin] = useState('');
    const [statusFilters, setStatusFilters] = useState(() => new Set(STATUS_KEYS));
    const [orderBy, setOrderBy] = useState('updated_at');
    const [orderDir, setOrderDir] = useState('desc');
    const [searchQuery, setSearchQuery] = useState('');
    const [listTab, setListTab] = useState('search');
    const [sortPresetId, setSortPresetId] = useState('updated_desc');
    const [advancedOpen, setAdvancedOpen] = useState(false);

    const practiceName = profile?.business_name || '';

    const load = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const params = {
                page: String(page),
                limit: String(limit),
            };
            if (orderBy !== 'updated_at' || orderDir !== 'desc') {
                params.order_by = orderBy;
                params.order = orderDir;
            }
            if (positionTypeId) params.position_type_id = positionTypeId;
            if (salaryMin.trim() !== '' && !Number.isNaN(Number(salaryMin))) {
                params.salary_min = salaryMin.trim();
            }
            const st = STATUS_KEYS.filter((k) => statusFilters.has(k));
            if (st.length > 0) params.status = st;
            const res = await getBusinessMyJobs(token, params);
            setJobs(res.results || []);
            setCount(res.count ?? 0);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load jobs');
            setJobs([]);
            setCount(0);
        } finally {
            setLoading(false);
        }
    }, [token, page, limit, orderBy, orderDir, positionTypeId, salaryMin, statusFilters]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        if (!token) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await getPositionTypes(token, { limit: '200', page: '1' });
                if (!cancelled) setPositionTypes(res.results || []);
            } catch {
                if (!cancelled) setPositionTypes([]);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [token]);

    function handleListTabChange(tab) {
        setListTab(tab);
        setPage(1);
        if (tab === 'matched') {
            setStatusFilters(new Set(['FILLED', 'COMPLETED']));
        } else {
            setStatusFilters(new Set(STATUS_KEYS));
        }
    }

    function handleSortPresetChange(id) {
        setSortPresetId(id);
        const p = SORT_PRESETS.find((x) => x.id === id);
        if (p) {
            setOrderBy(p.orderBy);
            setOrderDir(p.orderDir);
        }
        setPage(1);
    }

    function toggleStatus(key) {
        setStatusFilters((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            if (next.size === 0) return prev;
            return next;
        });
        setPage(1);
    }

    const filteredJobs = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return jobs;
        return jobs.filter(
            (j) =>
                (j.position_type?.name || '').toLowerCase().includes(q) || String(j.id).includes(q)
        );
    }, [jobs, searchQuery]);

    const totalPages = Math.max(1, Math.ceil(count / limit));

    const filterCount = useMemo(() => {
        let n = 0;
        if (positionTypeId) n++;
        if (salaryMin.trim()) n++;
        if (sortPresetId !== 'updated_desc') n++;
        if (listTab === 'search' && statusFilters.size < STATUS_KEYS.length) n++;
        return n;
    }, [positionTypeId, salaryMin, sortPresetId, listTab, statusFilters]);

    const resultsLine = useMemo(() => {
        if (searchQuery.trim()) {
            const m = filteredJobs.length;
            return `${m} match${m === 1 ? '' : 'es'} on this page`;
        }
        return `${count.toLocaleString()} results found`;
    }, [searchQuery, filteredJobs.length, count]);

    const heroSubtitle =
        loading && count === 0 ? 'Loading…' : `${count.toLocaleString()} job${count === 1 ? '' : 's'} posted`;

    return (
        <div className="business-job-postings business-job-postings--browse">
            <header className="business-jobs-browse__hero">
                <div className="business-jobs-browse__hero-inner">
                    <div className="business-jobs-browse__hero-text">
                        <h1 className="business-jobs-browse__title">Jobs</h1>
                        <p className="business-jobs-browse__subtitle" aria-live="polite">
                            {heroSubtitle}
                        </p>
                    </div>
                    <Link to="/businesses/jobs/new" className="business-jobs-browse__new">
                        <span>New posting</span>
                        <i className="fas fa-plus" aria-hidden />
                    </Link>
                </div>
            </header>

            <div className="business-jobs-browse__content">
                {!profile?.verified ? (
                    <p className="business-card__hint business-jobs-browse__verify-hint" role="status">
                        Your practice is not verified yet — you cannot create new postings until an administrator
                        verifies you.
                    </p>
                ) : null}

                <BusinessJobsBrowseToolbar
                    listTab={listTab}
                    onListTabChange={handleListTabChange}
                    searchQuery={searchQuery}
                    onSearchChange={(v) => setSearchQuery(v)}
                    sortPresetId={sortPresetId}
                    onSortPresetChange={handleSortPresetChange}
                    advancedOpen={advancedOpen}
                    onToggleAdvanced={() => setAdvancedOpen((o) => !o)}
                    filterCount={filterCount}
                    resultsLine={resultsLine}
                    loading={loading}
                />

                {advancedOpen ? (
                    <BusinessJobPostingsFilterBar
                        positionTypes={positionTypes}
                        positionTypeId={positionTypeId}
                        onPositionTypeIdChange={(v) => {
                            setPositionTypeId(v);
                            setPage(1);
                        }}
                        salaryMin={salaryMin}
                        onSalaryMinChange={(v) => {
                            setSalaryMin(v);
                            setPage(1);
                        }}
                        orderBy={orderBy}
                        onOrderByChange={(v) => {
                            setOrderBy(v);
                            setPage(1);
                        }}
                        orderDir={orderDir}
                        onOrderDirChange={(v) => {
                            setOrderDir(v);
                            setPage(1);
                        }}
                        statusFilters={statusFilters}
                        onToggleStatus={toggleStatus}
                        showSortFields={false}
                        hideStatusFilters={listTab === 'matched'}
                        statusHiddenHint="Showing FILLED and COMPLETED roles. Switch to Search to filter every status."
                    />
                ) : null}

                {error ? (
                    <p className="talent-profile__error" role="alert">
                        {error}
                    </p>
                ) : null}
                {loading ? <p className="talent-profile__loading">Loading postings…</p> : null}

                {!loading && !error && filteredJobs.length === 0 ? (
                    <p className="business-job-postings__empty">No postings match your filters.</p>
                ) : null}

                {!loading && !error && filteredJobs.length > 0 ? (
                    <div className="business-jobs-browse__grid">
                        {filteredJobs.map((job) => (
                            <BusinessJobPostingCard key={job.id} job={job} practiceName={practiceName} />
                        ))}
                    </div>
                ) : null}

                <BusinessJobPostingsPagination
                    variant="browse"
                    page={page}
                    totalPages={totalPages}
                    totalCount={count}
                    loading={loading}
                    onPrev={() => setPage((p) => Math.max(1, p - 1))}
                    onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
                />
            </div>
        </div>
    );
}
