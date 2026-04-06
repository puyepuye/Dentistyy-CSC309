import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { getJobCandidates, patchJobCandidateInterested } from '../../lib/api.js';

export default function BusinessJobCandidatesListPage() {
    const { jobId } = useParams();
    const id = Number(jobId);
    const { token } = useAuth();
    const [rows, setRows] = useState([]);
    const [count, setCount] = useState(0);
    const [page, setPage] = useState(1);
    const [limit] = useState(15);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [busyId, setBusyId] = useState(null);

    const load = useCallback(async () => {
        if (!token || !Number.isInteger(id) || id < 1) return;
        setLoading(true);
        setError(null);
        try {
            const res = await getJobCandidates(token, id, { page: String(page), limit: String(limit) });
            setRows(res.results || []);
            setCount(res.count ?? 0);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load candidates');
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [token, id, page, limit]);

    useEffect(() => {
        load();
    }, [load]);

    async function toggleInvite(accountId, currentlyInvited) {
        if (!token) return;
        setBusyId(accountId);
        try {
            await patchJobCandidateInterested(token, id, accountId, !currentlyInvited);
            await load();
        } catch (e) {
            window.alert(e instanceof Error ? e.message : 'Could not update interest.');
        } finally {
            setBusyId(null);
        }
    }

    const totalPages = Math.max(1, Math.ceil(count / limit));

    if (!Number.isInteger(id) || id < 1) {
        return (
            <section className="talent-card">
                <p className="talent-profile__error">Invalid job.</p>
            </section>
        );
    }

    return (
        <section className="talent-card">
            <div className="talent-card__head">
                <h2 className="talent-card__title">Discoverable candidates</h2>
                <Link to={`/businesses/jobs/${id}`} className="talent-card__action">
                    <span>Job overview</span>
                    <i className="fas fa-arrow-left" aria-hidden />
                </Link>
            </div>
            <p className="business-card__hint">
                Qualified, available talent for this role. Expressing interest flags your practice; mutual interest
                unlocks negotiation from the Interest tab.
            </p>
            {error ? (
                <p className="talent-profile__error" role="alert">
                    {error}
                </p>
            ) : null}
            {loading ? <p className="talent-profile__loading">Loading…</p> : null}
            {!loading && !error ? (
                <div className="business-table-wrap">
                    <table className="business-table">
                        <thead>
                            <tr>
                                <th scope="col">Name</th>
                                <th scope="col">Qualification summary</th>
                                <th scope="col">Invited</th>
                                <th scope="col">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan={4}>
                                        <span className="talent-bio__resume-missing">
                                            No discoverable candidates right now.
                                        </span>
                                    </td>
                                </tr>
                            ) : (
                                rows.map((r) => (
                                    <tr key={r.id}>
                                        <td>
                                            <Link to={`/businesses/jobs/${id}/candidates/${r.id}`}>
                                                {r.first_name} {r.last_name}
                                            </Link>
                                        </td>
                                        <td>
                                            {r.qualification_summary?.trim()
                                                ? r.qualification_summary
                                                : 'Approved for this position.'}
                                        </td>
                                        <td>{r.invited ? 'Yes' : 'No'}</td>
                                        <td>
                                            <div className="business-stack" style={{ marginTop: 0 }}>
                                                <button
                                                    type="button"
                                                    className="business-btn business-btn--ghost"
                                                    disabled={busyId === r.id}
                                                    onClick={() => toggleInvite(r.id, r.invited)}
                                                >
                                                    {r.invited ? 'Withdraw interest' : 'Express interest'}
                                                </button>
                                            </div>
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
                    Page {page} of {totalPages} · {count} candidates
                </span>
                <div className="business-pagination__actions">
                    <button
                        type="button"
                        className="business-btn business-btn--ghost"
                        disabled={page <= 1 || loading}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                        Previous
                    </button>
                    <button
                        type="button"
                        className="business-btn business-btn--ghost"
                        disabled={page >= totalPages || loading}
                        onClick={() => setPage((p) => p + 1)}
                    >
                        Next
                    </button>
                </div>
            </div>
        </section>
    );
}
