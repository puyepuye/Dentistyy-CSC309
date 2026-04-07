import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import BusinessCandidatePreviewDrawer from '../../components/business/jobs/BusinessCandidatePreviewDrawer.jsx';
import BusinessJobCandidatesDiscoverPanel from '../../components/business/jobs/BusinessJobCandidatesDiscoverPanel.jsx';
import { assetUrl, getJobById, getJobInterests } from '../../lib/api.js';
import { isJobPeopleTabDisabled } from '../../lib/businessJobStatus.js';

const FETCH_LIMIT = '500';
const PAGE_SIZE = 15;

function yesNo(v) {
    return v ? 'Yes' : 'No';
}

/**
 * Merge talent-initiated and practice-initiated interest rows into one list per candidate.
 * Talent rows carry mutual / negotiation fields from GET /jobs/:id/interests?initiated_by=user.
 */
function mergeInterestRows(talentRes, practiceRes) {
    const talent = talentRes?.results || [];
    const practice = practiceRes?.results || [];
    const talentUserIds = new Set(talent.map((r) => r.user.id));

    const merged = talent.map((r) => ({
        ...r,
        talent_interested: true,
        practice_interested: !!r.mutual,
    }));

    for (const r of practice) {
        if (!talentUserIds.has(r.user.id)) {
            merged.push({
                ...r,
                talent_interested: false,
                practice_interested: true,
            });
        }
    }

    merged.sort((a, b) => {
        const an = `${a.user.first_name || ''} ${a.user.last_name || ''}`.toLowerCase();
        const bn = `${b.user.first_name || ''} ${b.user.last_name || ''}`.toLowerCase();
        return an.localeCompare(bn);
    });

    return merged;
}

export default function BusinessJobCandidatesListPage() {
    const { jobId } = useParams();
    const id = Number(jobId);
    const { token } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();

    const rawView = searchParams.get('view');
    const view = rawView === 'discover' ? 'discover' : 'manage';

    function setView(next) {
        if (next === 'discover') {
            setSearchParams({ view: 'discover' }, { replace: true });
        } else {
            setSearchParams({ view: 'manage' }, { replace: true });
        }
    }

    useEffect(() => {
        const v = searchParams.get('view');
        if (v === 'interest' || v === 'shortlist') {
            setSearchParams({ view: 'manage' }, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    const [mergedRows, setMergedRows] = useState([]);
    const [manageLoading, setManageLoading] = useState(true);
    const [manageError, setManageError] = useState(null);
    const [searchInput, setSearchInput] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);

    const [preview, setPreview] = useState(null);
    const [jobStatus, setJobStatus] = useState(null);
    const [jobMetaLoading, setJobMetaLoading] = useState(true);

    useEffect(() => {
        if (!token || !Number.isInteger(id) || id < 1) {
            setJobMetaLoading(false);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const j = await getJobById(token, id);
                if (!cancelled) setJobStatus(j?.status ?? null);
            } catch {
                if (!cancelled) setJobStatus(null);
            } finally {
                if (!cancelled) setJobMetaLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [token, id]);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 320);
        return () => clearTimeout(t);
    }, [searchInput]);

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch]);

    const loadManage = useCallback(async () => {
        if (!token || !Number.isInteger(id) || id < 1) return;
        setManageLoading(true);
        setManageError(null);
        try {
            const [talentRes, practiceRes] = await Promise.all([
                getJobInterests(token, id, {
                    initiated_by: 'user',
                    page: '1',
                    limit: FETCH_LIMIT,
                }),
                getJobInterests(token, id, {
                    initiated_by: 'business',
                    page: '1',
                    limit: FETCH_LIMIT,
                }),
            ]);
            setMergedRows(mergeInterestRows(talentRes, practiceRes));
        } catch (e) {
            setManageError(e instanceof Error ? e.message : 'Failed to load candidates');
            setMergedRows([]);
        } finally {
            setManageLoading(false);
        }
    }, [token, id]);

    function openPreview(accountId, interestContext) {
        setPreview({ accountId, interestContext });
    }

    function closePreview() {
        setPreview(null);
    }

    const refreshManage = useCallback(async () => {
        await loadManage();
    }, [loadManage]);

    useEffect(() => {
        if (view !== 'manage') return;
        loadManage();
    }, [view, loadManage]);

    const filteredRows = useMemo(() => {
        const q = debouncedSearch.toLowerCase();
        if (!q) return mergedRows;
        return mergedRows.filter((r) => {
            const full = `${r.user.first_name || ''} ${r.user.last_name || ''}`.toLowerCase();
            const note = (r.user.qualification_summary || '').toLowerCase();
            return full.includes(q) || note.includes(q) || String(r.user.id).includes(q);
        });
    }, [mergedRows, debouncedSearch]);

    const totalCount = filteredRows.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    const pageRows = useMemo(() => {
        const start = (page - 1) * PAGE_SIZE;
        return filteredRows.slice(start, start + PAGE_SIZE);
    }, [filteredRows, page]);

    if (!Number.isInteger(id) || id < 1) {
        return (
            <section className="talent-card">
                <p className="talent-profile__error">Invalid job.</p>
            </section>
        );
    }

    if (jobMetaLoading) {
        return (
            <section className="talent-card">
                <p className="talent-profile__loading">Loading…</p>
            </section>
        );
    }

    if (isJobPeopleTabDisabled(jobStatus)) {
        return <Navigate to={`/businesses/jobs/${id}`} replace />;
    }

    return (
        <>
            <section className="talent-card">
                <div className="talent-card__head business-job-people__head">
                    <h2 className="talent-card__title">People</h2>
                    <Link to={`/businesses/jobs/${id}`} className="talent-card__action">
                        <span>Job overview</span>
                        <i className="fas fa-arrow-left" aria-hidden />
                    </Link>
                </div>
                <p className="business-card__hint">
                    Use <strong>Discover</strong> to search and express interest in new candidates. Use{' '}
                    <strong>Manage candidates</strong> to see everyone in one place — who tapped the job, who you
                    shortlisted, and when interest is mutual.
                </p>

                <div className="business-jobs-browse__tabs business-job-people__tabs" role="tablist" aria-label="People">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={view === 'discover'}
                        className={`business-jobs-browse__tab${view === 'discover' ? ' business-jobs-browse__tab--active' : ''}`}
                        onClick={() => setView('discover')}
                    >
                        Discover
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={view === 'manage'}
                        className={`business-jobs-browse__tab${view === 'manage' ? ' business-jobs-browse__tab--active' : ''}`}
                        onClick={() => setView('manage')}
                    >
                        Manage candidates
                    </button>
                </div>

                {view === 'discover' ? (
                    <BusinessJobCandidatesDiscoverPanel
                        jobId={id}
                        active={view === 'discover'}
                        jobLabel={undefined}
                        onInterestChanged={loadManage}
                    />
                ) : null}

                {view === 'manage' ? (
                    <>
                        <div className="business-job-postings__search-wrap business-job-candidates__search business-candidates-manage__search">
                            <i className="fas fa-search" aria-hidden />
                            <input
                                className="business-job-postings__search"
                                type="search"
                                placeholder="Search by name, account ID, or qualification…"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                aria-label="Search candidates"
                            />
                        </div>
                        {manageError ? (
                            <p className="talent-profile__error" role="alert">
                                {manageError}
                            </p>
                        ) : null}
                        {manageLoading ? <p className="talent-profile__loading">Loading…</p> : null}
                        {!manageLoading && !manageError ? (
                            <div className="business-table-wrap">
                                <table className="business-table business-table--interest business-table--manage-candidates">
                                    <thead>
                                        <tr>
                                            <th scope="col">Candidate</th>
                                            <th scope="col">Availability</th>
                                            <th scope="col">Talent interest</th>
                                            <th scope="col">Practice interest</th>
                                            <th scope="col">Mutual interest</th>
                                            <th scope="col">Next step</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pageRows.length === 0 ? (
                                            <tr>
                                                <td colSpan={6}>
                                                    <span className="talent-bio__resume-missing">
                                                        No candidates yet. Use Discover to find people, or wait for
                                                        talent to tap this job.
                                                    </span>
                                                </td>
                                            </tr>
                                        ) : (
                                            pageRows.map((r) => (
                                                <tr key={`${r.user.id}-${r.interest_id}`}>
                                                    <td>
                                                        <div className="business-interest-user">
                                                            <span className="business-interest-user__avatar" aria-hidden>
                                                                {assetUrl(r.user.avatar_url) ? (
                                                                    <img src={assetUrl(r.user.avatar_url)} alt="" />
                                                                ) : (
                                                                    <i className="fas fa-user" />
                                                                )}
                                                            </span>
                                                            <div>
                                                                <p className="business-interest-user__name">
                                                                    <button
                                                                        type="button"
                                                                        className="business-text-link-button"
                                                                        onClick={() => openPreview(r.user.id, r)}
                                                                    >
                                                                        {r.user.first_name} {r.user.last_name}
                                                                    </button>
                                                                </p>
                                                                <p className="business-interest-user__summary">
                                                                    {r.user.qualification_summary?.trim()
                                                                        ? r.user.qualification_summary
                                                                        : 'Approved for this position.'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="business-table__availability-cell">
                                                        {r.user.available ? 'Available' : 'Unavailable'}
                                                    </td>
                                                    <td className="business-table__flag-cell">{yesNo(r.talent_interested)}</td>
                                                    <td className="business-table__flag-cell">{yesNo(r.practice_interested)}</td>
                                                    <td className="business-table__mutual-cell">{yesNo(r.mutual)}</td>
                                                    <td className="business-table__negotiation-cell">
                                                        {r.mutual ? (
                                                            r.negotiation_allowed ? (
                                                                <span className="talent-bio__resume-missing">
                                                                    Open preview to negotiate
                                                                </span>
                                                            ) : (
                                                                <p className="business-interest-user__note">
                                                                    {r.negotiation_block_reason ||
                                                                        'Negotiation is not available right now.'}
                                                                </p>
                                                            )
                                                        ) : (
                                                            <>
                                                                <span className="talent-bio__resume-missing">
                                                                    Open preview to respond
                                                                </span>
                                                                {r.negotiation_block_reason ? (
                                                                    <p className="business-interest-user__note">
                                                                        {r.negotiation_block_reason}
                                                                    </p>
                                                                ) : null}
                                                            </>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        ) : null}
                        <div className="business-pagination">
                            <span className="business-pagination__info">
                                Page {page} of {totalPages} · {totalCount} candidate{totalCount === 1 ? '' : 's'}
                            </span>
                            <div className="business-pagination__actions">
                                <button
                                    type="button"
                                    className="business-btn business-btn--ghost"
                                    disabled={page <= 1 || manageLoading}
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                >
                                    Previous
                                </button>
                                <button
                                    type="button"
                                    className="business-btn business-btn--ghost"
                                    disabled={page >= totalPages || manageLoading}
                                    onClick={() => setPage((p) => p + 1)}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </>
                ) : null}
            </section>

            <BusinessCandidatePreviewDrawer
                jobId={id}
                candidateAccountId={preview?.accountId ?? null}
                onClose={closePreview}
                interestContext={preview?.interestContext}
                onUpdated={refreshManage}
            />
        </>
    );
}
