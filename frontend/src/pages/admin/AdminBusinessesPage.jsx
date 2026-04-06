import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { getAdminBusinesses, patchBusinessVerified } from '../../lib/api.js';
import '../../styles/admin.css';

export default function AdminBusinessesPage() {
    const { token } = useAuth();
    const [businesses, setBusinesses] = useState([]);
    const [count, setCount] = useState(0);
    const [page, setPage] = useState(1);
    const [keyword, setKeyword] = useState('');
    const [filterVerified, setFilterVerified] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const limit = 10;

    async function fetchBusinesses() {
        setLoading(true);
        setError('');
        try {
            const data = await getAdminBusinesses(token, {
                page,
                limit,
                ...(keyword ? { keyword } : {}),
                ...(filterVerified !== '' ? { verified: filterVerified } : {}),
            });
            setBusinesses(data.results);
            setCount(data.count);
        } catch (err) {
            setError(err.message || 'Failed to load businesses.');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchBusinesses();
    }, [page, filterVerified]);

    async function handleVerify(id, verified) {
        try {
            await patchBusinessVerified(token, id, verified);
            setBusinesses((prev) =>
                prev.map((b) => (b.id === id ? { ...b, verified } : b))
            );
        } catch (err) {
            setError(err.message || 'Action failed.');
        }
    }

    function handleSearch(e) {
        e.preventDefault();
        setPage(1);
        fetchBusinesses();
    }

    const totalPages = Math.ceil(count / limit);

    return (
        <div>
            <h1 className="admin-businesses__header">Businesses</h1>

            <div className="admin-businesses__toolbar">
                <form className="admin-businesses__search-form" onSubmit={handleSearch}>
                    <input
                        type="text"
                        placeholder="Search for a Business"
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        className="admin-businesses__search-input"
                    />
                    <button type="submit" className="admin-businesses__search-btn">Search</button>
                </form>

                <div className="admin-businesses__filter-wrap">
                    <select
                        value={filterVerified}
                        onChange={(e) => { setFilterVerified(e.target.value); setPage(1); }}
                        className="admin-businesses__filter"
                    >
                        <option value="">Filter by: Status</option>
                        <option value="true">Verified</option>
                        <option value="false">Unverified</option>
                    </select>
                    <i className="fas fa-chevron-down admin-businesses__filter-icon" aria-hidden />
                </div>
            </div>

            {error ? <p className="admin-businesses__error">{error}</p> : null}

            <table className="admin-businesses__table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Owner</th>
                        <th>Status</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        <tr><td colSpan={4} className="admin-businesses__empty">Loading…</td></tr>
                    ) : businesses.length === 0 ? (
                        <tr><td colSpan={4} className="admin-businesses__empty">No businesses found.</td></tr>
                    ) : businesses.map((b) => (
                        <tr key={b.id}>
                            <td>{b.business_name}</td>
                            <td>{b.owner_name}</td>
                            <td>
                                <span className={`admin-businesses__badge ${b.verified ? 'admin-businesses__badge--verified' : 'admin-businesses__badge--unverified'}`}>
                                    {b.verified ? 'Verified' : 'Unverified'}
                                </span>
                            </td>
                            <td>
                                <button
                                    className="admin-businesses__action-btn"
                                    onClick={() => handleVerify(b.id, !b.verified)}
                                >
                                    {b.verified ? 'Unverify' : 'Verify'}
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