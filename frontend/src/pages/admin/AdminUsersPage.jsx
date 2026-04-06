import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import {getAdminUsers,  patchUserSuspend } from '../../lib/api.js';
import '../../styles/admin.css';

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
            setError(err.message || 'Failed to load businesses.');
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
            setUsers((prev) =>
                prev.map((b) => (b.id === id ? { ...b, suspended } : b))
            );
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
        <div>
            <h1 className="admin-businesses__header">Users</h1>

            <div className="admin-businesses__toolbar">
                <form className="admin-businesses__search-form" onSubmit={handleSearch}>
                    <input
                        type="text"
                        placeholder="Search for a User"
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        className="admin-businesses__search-input"
                    />
                    <button type="submit" className="admin-businesses__search-btn">Search</button>
                </form>

                <div className="admin-businesses__filter-wrap">
                    <select
                        value={filterSuspend}
                        onChange={(e) => { setFilterSuspend(e.target.value); setPage(1); }}
                        className="admin-businesses__filter"
                    >
                        <option value="">Filter by: Status</option>
                        <option value="true">Suspended</option>
                        <option value="false">Active</option>
                    </select>
                    <i className="fas fa-chevron-down admin-businesses__filter-icon" aria-hidden />
                </div>
            </div>

            {error ? <p className="admin-businesses__error">{error}</p> : null}

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
                        <tr><td colSpan={4} className="admin-businesses__empty">Loading…</td></tr>
                    ) : users.length === 0 ? (
                        <tr><td colSpan={4} className="admin-businesses__empty">No users found.</td></tr>
                    ) : users.map((b) => (
                        <tr key={b.id}>
                            <td>{b.first_name}</td>
                            <td>{b.email}</td>
                            <td>
                                <span className={`admin-businesses__badge ${b.suspended ?  'admin-businesses__badge--unverified' : 'admin-businesses__badge--verified'}`}>
                                    {b.suspended ?'Suspended':    'Active'}
                                </span>
                            </td>
                            <td>
                                <button
                                    className="admin-businesses__action-btn"
                                    onClick={() => handleVerify(b.id, !b.suspended)}
                                >
                                    {b.suspended ?  'Unsuspend' :'Suspend'}
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {totalPages > 1 && (
                <div className="admin-businesses__pagination">
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>◀</button>
                    <span>Page {page} of {totalPages}</span>
                    <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>▶</button>
                </div>
            )}
        </div>
    );
}