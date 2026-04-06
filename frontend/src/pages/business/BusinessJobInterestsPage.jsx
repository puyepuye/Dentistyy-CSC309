import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { getJobInterests, startNegotiation } from '../../lib/api.js';

export default function BusinessJobInterestsPage() {
    const { jobId } = useParams();
    const id = Number(jobId);
    const { token } = useAuth();
    const [rows, setRows] = useState([]);
    const [count, setCount] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [busyId, setBusyId] = useState(null);

    const load = useCallback(async () => {
        if (!token || !Number.isInteger(id) || id < 1) return;
        setLoading(true);
        setError(null);
        try {
            const res = await getJobInterests(token, id, { page: String(page), limit: '20' });
            setRows(res.results || []);
            setCount(res.count ?? 0);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load interest list');
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [token, id, page]);

    useEffect(() => {
        load();
    }, [load]);

    async function negotiate(interestId) {
        if (!token) return;
        setBusyId(interestId);
        try {
            await startNegotiation(token, interestId);
            window.alert('Negotiation started. Open Negotiations in the sidebar to review and respond.');
        } catch (e) {
            window.alert(e instanceof Error ? e.message : 'Could not start negotiation.');
        } finally {
            setBusyId(null);
        }
    }

    const totalPages = Math.max(1, Math.ceil(count / 20));

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
                <h2 className="talent-card__title">Candidate interest</h2>
                <Link to={`/businesses/jobs/${id}`} className="talent-card__action">
                    <span>Job overview</span>
                    <i className="fas fa-arrow-left" aria-hidden />
                </Link>
            </div>
            <p className="business-card__hint">
                Talent who tapped interest on this job. When you have also expressed interest, it is mutual: start
                a negotiation to proceed (one active negotiation at a time per practice).
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
                                <th scope="col">Candidate</th>
                                <th scope="col">Mutual interest</th>
                                <th scope="col">Negotiation</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan={3}>
                                        <span className="talent-bio__resume-missing">
                                            No candidate interest yet.
                                        </span>
                                    </td>
                                </tr>
                            ) : (
                                rows.map((r) => (
                                    <tr key={r.interest_id}>
                                        <td>
                                            <Link to={`/businesses/jobs/${id}/candidates/${r.user.id}`}>
                                                {r.user.first_name} {r.user.last_name}
                                            </Link>
                                        </td>
                                        <td>{r.mutual ? 'Yes' : 'No'}</td>
                                        <td>
                                            {r.mutual ? (
                                                <button
                                                    type="button"
                                                    className="business-btn business-btn--primary"
                                                    disabled={busyId === r.interest_id}
                                                    onClick={() => negotiate(r.interest_id)}
                                                >
                                                    {busyId === r.interest_id ? 'Starting…' : 'Start negotiation'}
                                                </button>
                                            ) : (
                                                <span className="talent-bio__resume-missing">
                                                    Express interest from Candidates to match.
                                                </span>
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
                    Page {page} of {totalPages} · {count} interested
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
