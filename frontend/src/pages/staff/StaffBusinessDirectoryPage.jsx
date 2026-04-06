import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getBusinessesList } from '../../lib/api.js';

const PAGE_SIZE = 15;

export default function StaffBusinessDirectoryPage() {
    const [inputValue, setInputValue] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [data, setData] = useState({ count: 0, results: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getBusinessesList({
                keyword: searchQuery || undefined,
                page,
                limit: PAGE_SIZE,
                sort: 'business_name',
                order: 'asc',
            });
            setData({ count: res.count ?? 0, results: res.results ?? [] });
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load practices.');
            setData({ count: 0, results: [] });
        } finally {
            setLoading(false);
        }
    }, [searchQuery, page]);

    useEffect(() => {
        load();
    }, [load]);

    function applySearch() {
        setSearchQuery(inputValue.trim());
        setPage(1);
    }

    const totalPages = Math.max(1, Math.ceil((data.count || 0) / PAGE_SIZE));
    const startIdx = data.count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
    const endIdx = data.count === 0 ? 0 : Math.min(page * PAGE_SIZE, data.count);

    return (
        <div className="business-job-postings business-job-postings--browse staff-business-directory">
            <header className="business-jobs-browse__hero">
                <div className="business-jobs-browse__hero-inner">
                    <div className="business-jobs-browse__hero-text">
                        <h1 className="business-jobs-browse__title">Business</h1>
                        <p className="business-jobs-browse__subtitle">
                            Search practices and open their profile to see open roles.
                        </p>
                    </div>
                </div>
            </header>

            <div className="business-jobs-browse__content">
                <div className="staff-business-directory__sticky-head">
                    <form
                        className="business-jobs-browse__toolbar staff-business-directory__toolbar"
                        onSubmit={(e) => {
                            e.preventDefault();
                            applySearch();
                        }}
                        aria-label="Search practices"
                    >
                        <div className="business-jobs-browse__toolbar-row business-jobs-browse__toolbar-row--top">
                            <div className="business-job-postings__search-wrap">
                                <i className="fas fa-search" aria-hidden />
                                <input
                                    type="search"
                                    className="business-job-postings__search business-job-postings__search--browse"
                                    placeholder="Search by practice name, address, or phone…"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    aria-label="Search practices"
                                />
                            </div>
                            <button type="submit" className="staff-business-directory__search-btn">
                                Search
                            </button>
                        </div>
                    </form>
                </div>

                {error ? (
                    <p className="talent-jobs__error" role="alert">
                        {error}
                    </p>
                ) : null}

                <div className="staff-business-directory__sheet">
                    {loading ? (
                        <p className="staff-business-directory__state">Loading…</p>
                    ) : data.results.length === 0 ? (
                        <p className="staff-business-directory__state staff-business-directory__state--empty">
                            No practices match your search.
                        </p>
                    ) : (
                        <>
                            <div className="staff-business-directory__table-head" aria-hidden>
                                <span>Practice</span>
                                <span>Location</span>
                                <span>Jobs posted</span>
                            </div>
                            <ul className="staff-business-directory__rows">
                                {data.results.map((b) => (
                                    <li key={b.id} className="staff-business-directory__row-item">
                                        <Link
                                            to={`/talent/businesses/${b.id}`}
                                            className="staff-business-directory__row"
                                        >
                                            <span className="staff-business-directory__name">
                                                {b.business_name}
                                            </span>
                                            <span className="staff-business-directory__location">
                                                {b.postal_address?.trim() ? b.postal_address : 'Address on file'}
                                            </span>
                                            <span className="staff-business-directory__jobs">
                                                {(b.jobs_posted ?? 0).toLocaleString()}
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                </div>

                {!loading && totalPages > 1 ? (
                    <div className="talent-jobs__pagination staff-business-directory__pagination">
                        <button
                            type="button"
                            disabled={page <= 1}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            aria-label="Previous page"
                        >
                            ◀
                        </button>
                        <span>
                            Page {page} of {totalPages}
                        </span>
                        <button
                            type="button"
                            disabled={page >= totalPages}
                            onClick={() => setPage((p) => p + 1)}
                            aria-label="Next page"
                        >
                            ▶
                        </button>
                    </div>
                ) : null}

                {!loading && data.count > 0 ? (
                    <p className="staff-business-directory__page-tag">
                        Page {page} ({startIdx}-{endIdx})
                    </p>
                ) : null}
            </div>
        </div>
    );
}
