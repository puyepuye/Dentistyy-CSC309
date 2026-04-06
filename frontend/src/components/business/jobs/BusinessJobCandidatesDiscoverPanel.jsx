import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import BusinessCandidatePreviewDrawer from './BusinessCandidatePreviewDrawer.jsx';
import { getJobCandidates, patchJobCandidateInterested } from '../../../lib/api.js';

/**
 * Inline discover UI for one job (GET /jobs/:jobId/candidates).
 * @param {boolean} props.active — when false, skips loading (tab not visible).
 */
export default function BusinessJobCandidatesDiscoverPanel({ jobId, jobLabel, active, onInterestChanged }) {
    const { token } = useAuth();
    const [rows, setRows] = useState([]);
    const [count, setCount] = useState(0);
    const [page, setPage] = useState(1);
    const [limit] = useState(12);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [busyId, setBusyId] = useState(null);
    const [hideExpressed, setHideExpressed] = useState(false);
    const [searchInput, setSearchInput] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    /** Total from API before client search / “hide expressed” filter. */
    const [serverCount, setServerCount] = useState(0);
    const [previewAccountId, setPreviewAccountId] = useState(null);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 320);
        return () => clearTimeout(t);
    }, [searchInput]);

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, hideExpressed]);

    const load = useCallback(async () => {
        if (!active || !token || !Number.isInteger(jobId) || jobId < 1) return;
        setLoading(true);
        setError(null);
        try {
            const res = await getJobCandidates(token, jobId, { page: '1', limit: '500' });
            const source = res.results || [];
            setServerCount(typeof res.count === 'number' ? res.count : source.length);
            const q = debouncedSearch.trim().toLowerCase();
            const filtered = source.filter((r) => {
                if (hideExpressed && r.invited) return false;
                if (!q) return true;
                const full = `${r.first_name || ''} ${r.last_name || ''}`.toLowerCase();
                const note = (r.qualification_summary || '').toLowerCase();
                return full.includes(q) || note.includes(q) || String(r.id).includes(q);
            });
            const start = (page - 1) * limit;
            const paginated = filtered.slice(start, start + limit);
            setRows(paginated);
            setCount(filtered.length);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load candidates');
            setRows([]);
            setCount(0);
            setServerCount(0);
        } finally {
            setLoading(false);
        }
    }, [active, token, jobId, page, limit, hideExpressed, debouncedSearch]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        if (!active) {
            setSearchInput('');
            setDebouncedSearch('');
            setHideExpressed(false);
            setPage(1);
            setPreviewAccountId(null);
        }
    }, [active]);

    async function toggleInvite(accountId, currentlyInvited) {
        if (!token) return;
        setBusyId(accountId);
        try {
            await patchJobCandidateInterested(token, jobId, accountId, !currentlyInvited);
            await load();
            onInterestChanged?.();
        } catch (e) {
            window.alert(e instanceof Error ? e.message : 'Could not update interest.');
        } finally {
            setBusyId(null);
        }
    }

    function closePreview() {
        setPreviewAccountId(null);
    }

    function handlePreviewUpdated() {
        void load();
        onInterestChanged?.();
    }

    const totalPages = Math.max(1, Math.ceil(count / limit));

    return (
        <>
        <section className="business-candidates-discover-inline" aria-labelledby="discover-candidates-heading">
            <h3 className="business-candidates-discover-inline__title" id="discover-candidates-heading">
                Discover candidates
            </h3>
            {jobLabel ? <p className="business-candidates-discover-inline__subtitle">{jobLabel}</p> : null}

            <div className="business-candidates-discover-inline__toolbar">
                <div className="business-job-postings__search-wrap business-candidates-discover-inline__search-wrap">
                    <i className="fas fa-search" aria-hidden />
                    <input
                        className="business-job-postings__search"
                        type="search"
                        placeholder="Search by name, ID, or qualification…"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        aria-label="Search candidates"
                    />
                </div>
                <label className="business-job-candidates__filter business-candidates-discover-inline__filter">
                    <input
                        type="checkbox"
                        checked={hideExpressed}
                        onChange={(e) => setHideExpressed(e.target.checked)}
                    />
                    <span>Hide already expressed interest</span>
                </label>
            </div>

            <div className="business-candidates-discover-inline__body">
                {error ? (
                    <p className="talent-profile__error" role="alert">
                        {error}
                    </p>
                ) : null}
                {loading ? <p className="talent-profile__loading">Loading…</p> : null}
                {!loading && !error && rows.length === 0 ? (
                    <p className="talent-bio__resume-missing">
                        {serverCount === 0 && !debouncedSearch && !hideExpressed
                            ? 'No candidates listed. Only talent who are qualified for this role, available, and recently active appear here—if you expected someone, they may not have been active recently.'
                            : 'No matching candidates.'}
                    </p>
                ) : null}
                {!loading && !error
                    ? rows.map((r) => (
                          <article key={r.id} className="business-candidates-drawer__card">
                              <div className="business-candidates-drawer__card-head">
                                  <span className="business-candidates-drawer__name business-candidates-drawer__name--static">
                                      {r.first_name} {r.last_name}
                                  </span>
                                  <span
                                      className={`business-candidates-drawer__pill${r.invited ? ' business-candidates-drawer__pill--on' : ''}`}
                                  >
                                      {r.invited ? 'Interested' : 'Not invited'}
                                  </span>
                              </div>
                              <p className="business-candidates-drawer__summary">
                                  {r.qualification_summary?.trim()
                                      ? r.qualification_summary
                                      : 'Approved for this position.'}
                              </p>
                              <div className="business-candidates-discover-inline__card-actions">
                                  <button
                                      type="button"
                                      className="business-btn business-btn--ghost business-candidates-drawer__action"
                                      onClick={() => setPreviewAccountId(r.id)}
                                  >
                                      View profile
                                  </button>
                                  <button
                                      type="button"
                                      className="business-btn business-btn--ghost business-candidates-drawer__action"
                                      disabled={busyId === r.id}
                                      onClick={() => toggleInvite(r.id, r.invited)}
                                  >
                                      {r.invited ? 'Withdraw interest' : 'Express interest'}
                                  </button>
                              </div>
                          </article>
                      ))
                    : null}
            </div>

            <footer className="business-candidates-discover-inline__footer">
                <div className="business-candidates-drawer__pager">
                    <button
                        type="button"
                        className="business-btn business-btn--ghost"
                        disabled={page <= 1 || loading}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                        Previous
                    </button>
                    <span className="business-candidates-drawer__pager-info">
                        Page {page} of {totalPages} · {count} total
                    </span>
                    <button
                        type="button"
                        className="business-btn business-btn--ghost"
                        disabled={page >= totalPages || loading}
                        onClick={() => setPage((p) => p + 1)}
                    >
                        Next
                    </button>
                </div>
            </footer>
        </section>
        <BusinessCandidatePreviewDrawer
            jobId={jobId}
            candidateAccountId={previewAccountId}
            onClose={closePreview}
            jobLabel={jobLabel}
            interestContext={null}
            onUpdated={handlePreviewUpdated}
        />
        </>
    );
}
