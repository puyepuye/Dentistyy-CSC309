import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { getAdminBusinesses, patchBusinessVerified } from '../../lib/api.js';

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
            setBusinesses((prev) => prev.map((b) => (b.id === id ? { ...b, verified } : b)));
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
        <div className="admin-page">
            <div className="business-jobs-browse__toolbar admin-page__toolbar">
                <form
                    className="admin-page__toolbar-form"
                    onSubmit={handleSearch}
                    aria-label="Search businesses"
                >
                    <div className="business-jobs-browse__toolbar-row business-jobs-browse__toolbar-row--top">
                        <div className="business-job-postings__search-wrap">
                            <i className="fas fa-search" aria-hidden />
                            <input
                                type="search"
                                placeholder="Search for a business"
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
                            <label htmlFor="admin-biz-verified">Verification</label>
                            <select
                                id="admin-biz-verified"
                                value={filterVerified}
                                onChange={(e) => {
                                    setFilterVerified(e.target.value);
                                    setPage(1);
                                }}
                            >
                                <option value="">All</option>
                                <option value="true">Verified</option>
                                <option value="false">Unverified</option>
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
                            <th>Owner</th>
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
                        ) : businesses.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="admin-businesses__empty">
                                    No businesses found.
                                </td>
                            </tr>
                        ) : (
                            businesses.map((b) => (
                                <tr key={b.id}>
                                    <td>{b.business_name}</td>
                                    <td>{b.owner_name}</td>
                                    <td>
                                        <span
                                            className={`admin-businesses__badge ${
                                                b.verified
                                                    ? 'admin-businesses__badge--verified'
                                                    : 'admin-businesses__badge--unverified'
                                            }`}
                                        >
                                            {b.verified ? 'Verified' : 'Unverified'}
                                        </span>
                                    </td>
                                    <td>
                                        <button
                                            type="button"
                                            className="admin-businesses__action-btn"
                                            onClick={() => handleVerify(b.id, !b.verified)}
                                        >
                                            {b.verified ? 'Unverify' : 'Verify'}
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
