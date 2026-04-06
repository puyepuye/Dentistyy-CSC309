import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import AdminQualificationReviewModal from '../../components/admin/AdminQualificationReviewModal.jsx';
import { getAdminQualifications } from '../../lib/api.js';

const LIMIT = 10;

function formatDate(iso) {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    } catch {
        return '—';
    }
}

function statusBadgeClass(status) {
    const s = (status || '').toLowerCase();
    if (s === 'approved') return 'admin-qual-row__badge admin-qual-row__badge--approved';
    if (s === 'rejected') return 'admin-qual-row__badge admin-qual-row__badge--rejected';
    if (s === 'revised') return 'admin-qual-row__badge admin-qual-row__badge--revised';
    if (s === 'submitted') return 'admin-qual-row__badge admin-qual-row__badge--submitted';
    return 'admin-qual-row__badge';
}

export default function AdminQualificationsPage() {
    const { token } = useAuth();
    const [rows, setRows] = useState([]);
    const [count, setCount] = useState(0);
    const [page, setPage] = useState(1);
    const [keyword, setKeyword] = useState('');
    const [appliedKeyword, setAppliedKeyword] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [order, setOrder] = useState('desc');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [manageId, setManageId] = useState(null);

    const load = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const data = await getAdminQualifications(token, {
                page,
                limit: LIMIT,
                ...(appliedKeyword ? { keyword: appliedKeyword } : {}),
                ...(statusFilter ? { status: statusFilter } : {}),
                order,
            });
            setRows(data.results || []);
            setCount(data.count ?? 0);
        } catch (e) {
            setError(e?.message || 'Failed to load qualifications.');
            setRows([]);
            setCount(0);
        } finally {
            setLoading(false);
        }
    }, [token, page, appliedKeyword, statusFilter, order]);

    useEffect(() => {
        load();
    }, [load]);

    function handleSearch(e) {
        e.preventDefault();
        setAppliedKeyword(keyword.trim());
        setPage(1);
    }

    const totalPages = Math.max(1, Math.ceil(count / LIMIT));

    return (
        <div className="admin-page admin-page--qualifications">
            <div className="business-jobs-browse__toolbar admin-page__toolbar">
                <form
                    className="admin-page__toolbar-form"
                    onSubmit={handleSearch}
                    aria-label="Search qualifications"
                >
                    <div className="business-jobs-browse__toolbar-row business-jobs-browse__toolbar-row--top">
                        <div className="business-job-postings__search-wrap">
                            <i className="fas fa-search" aria-hidden />
                            <input
                                type="search"
                                placeholder="Search by name, email, or position"
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                                className="business-job-postings__search business-job-postings__search--browse"
                                aria-label="Keyword"
                            />
                        </div>
                        <button type="submit" className="admin-page__toolbar-submit">
                            Search
                        </button>
                        <div className="business-jobs-browse__sort">
                            <label htmlFor="admin-qual-order">Sort</label>
                            <select
                                id="admin-qual-order"
                                value={order}
                                onChange={(e) => {
                                    setOrder(e.target.value);
                                    setPage(1);
                                }}
                            >
                                <option value="desc">Updated (newest)</option>
                                <option value="asc">Updated (oldest)</option>
                            </select>
                        </div>
                        <div className="business-jobs-browse__sort">
                            <label htmlFor="admin-qual-status">Status</label>
                            <select
                                id="admin-qual-status"
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    setPage(1);
                                }}
                            >
                                <option value="">All</option>
                                <option value="created">Created</option>
                                <option value="submitted">Submitted</option>
                                <option value="revised">Revised</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>
                    </div>
                </form>
            </div>

            {error ? <p className="admin-page__error">{error}</p> : null}

            <div className="admin-qual-list">
                {loading ? (
                    <p className="talent-jobs__loading">Loading…</p>
                ) : rows.length === 0 ? (
                    <p className="admin-dashboard__empty">No qualifications found.</p>
                ) : (
                    rows.map((row) => {
                        const fullName =
                            `${row.user?.first_name ?? ''} ${row.user?.last_name ?? ''}`.trim() ||
                            '—';
                        return (
                            <div key={row.id} className="admin-qual-row">
                                <div className="admin-qual-row__accent" aria-hidden />
                                <div className="admin-qual-row__cells">
                                    <div className="admin-qual-row__cell admin-qual-row__cell--user">
                                        <span className="admin-qual-row__label">User</span>
                                        <span className="admin-qual-row__value">{fullName}</span>
                                    </div>
                                    <div className="admin-qual-row__cell">
                                        <span className="admin-qual-row__label">Position type</span>
                                        <span className="admin-qual-row__value">
                                            {row.position_type?.name ?? '—'}
                                        </span>
                                    </div>
                                    <div className="admin-qual-row__cell">
                                        <span className="admin-qual-row__label">Status</span>
                                        <span
                                            className={statusBadgeClass(row.status)}
                                        >
                                            {row.status
                                                ? row.status.charAt(0).toUpperCase() +
                                                  row.status.slice(1)
                                                : '—'}
                                        </span>
                                    </div>
                                    <div className="admin-qual-row__cell">
                                        <span className="admin-qual-row__label">Updated</span>
                                        <span className="admin-qual-row__value">
                                            {formatDate(row.updatedAt)}
                                        </span>
                                    </div>
                                    <div className="admin-qual-row__cell admin-qual-row__cell--action">
                                        <button
                                            type="button"
                                            className="admin-qual-row__manage"
                                            onClick={() => setManageId(row.id)}
                                        >
                                            Manage
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {totalPages > 1 ? (
                <div className="talent-jobs__pagination admin-page__pagination">
                    <button
                        type="button"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                    >
                        ◀
                    </button>
                    <span>
                        Page {page} of {totalPages}
                    </span>
                    <button
                        type="button"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                    >
                        ▶
                    </button>
                </div>
            ) : null}

            <AdminQualificationReviewModal
                token={token}
                qualificationId={manageId}
                onClose={() => setManageId(null)}
                onUpdated={load}
            />
        </div>
    );
}
