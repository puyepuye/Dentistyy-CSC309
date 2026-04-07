import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { getAdminUsers, patchUserSuspend } from '../../lib/api.js';

export default function AdminUsersPage() {
    const { token } = useAuth();
    const [users, setUsers] = useState([]);
    const [count, setCount] = useState(0);
    const [page, setPage] = useState(1);
    const [keyword, setKeyword] = useState('');
    const [filterSuspend, setFilterSuspend] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const limit = 10;

    async function fetchUsers() {
        setLoading(true);
        setError('');
        try {
            const data = await getAdminUsers(token, {
                page,
                limit,
                ...(keyword ? { keyword } : {}),
                ...(filterSuspend !== '' ? { suspended: filterSuspend } : {}),
            });
            setUsers(data.results);
            setCount(data.count);
        } catch (err) {
            setError(err.message || 'Failed to load users.');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchUsers();
    }, [page, filterSuspend]);

    async function handleVerify(id, suspended) {
        try {
            await patchUserSuspend(token, id, suspended);
            setUsers((prev) => prev.map((b) => (b.id === id ? { ...b, suspended } : b)));
        } catch (err) {
            setError(err.message || 'Action failed.');
        }
    }

    function handleSearch(e) {
        e.preventDefault();
        setPage(1);
        fetchUsers();
    }

    const totalPages = Math.ceil(count / limit);

    return (
        <div className="admin-page">
            <div className="business-jobs-browse__toolbar admin-page__toolbar">
                <form
                    className="admin-page__toolbar-form"
                    onSubmit={handleSearch}
                    aria-label="Search users"
                >
                    <div className="business-jobs-browse__toolbar-row business-jobs-browse__toolbar-row--top">
                        <div className="business-job-postings__search-wrap">
                            <i className="fas fa-search" aria-hidden />
                            <input
                                type="search"
                                placeholder="Search for a user"
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
                            <label htmlFor="admin-users-suspend">Status</label>
                            <select
                                id="admin-users-suspend"
                                value={filterSuspend}
                                onChange={(e) => {
                                    setFilterSuspend(e.target.value);
                                    setPage(1);
                                }}
                            >
                                <option value="">All</option>
                                <option value="true">Suspended</option>
                                <option value="false">Active</option>
                            </select>
                        </div>
                    </div>
                </form>
            </div>

            {error ? <p className="admin-page__error">{error}</p> : null}

            <div className="admin-page__table-wrap">
                <table className="admin-businesses__table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="admin-businesses__empty">
                                    Loading…
                                </td>
                            </tr>
                        ) : users.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="admin-businesses__empty">
                                    No users found.
                                </td>
                            </tr>
                        ) : (
                            users.map((b) => (
                                <tr key={b.id}>
                                    <td>{`${b.first_name ?? ''} ${b.last_name ?? ''}`.trim() || '-'}</td>
                                    <td>{b.email}</td>
                                    <td>
                                        <span
                                            className={`admin-businesses__badge ${
                                                b.suspended
                                                    ? 'admin-businesses__badge--unverified'
                                                    : 'admin-businesses__badge--verified'
                                            }`}
                                        >
                                            {b.suspended ? 'Suspended' : 'Active'}
                                        </span>
                                    </td>
                                    <td>
                                        <button
                                            type="button"
                                            className="admin-businesses__action-btn"
                                            onClick={() => handleVerify(b.id, !b.suspended)}
                                        >
                                            {b.suspended ? 'Unsuspend' : 'Suspend'}
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 ? (
                <div className="talent-jobs__pagination admin-page__pagination">
                    <button
                        type="button"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                    >
                        ◀
                    </button>
                    <span>
                        Page {page} of {totalPages}
                    </span>
                    <button
                        type="button"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                    >
                        ▶
                    </button>
                </div>
            ) : null}
        </div>
    );
}
