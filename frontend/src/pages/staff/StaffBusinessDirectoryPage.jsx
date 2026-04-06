import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getBusinessesList } from '../../lib/api.js';

const PAGE_SIZE = 9;

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
                <div className="business-jobs-browse__toolbar">
                    <div className="business-jobs-browse__toolbar-row business-jobs-browse__toolbar-row--top">
                        <div className="talent-business-directory__search-row">
                            <div className="business-job-postings__search-wrap">
                                <i className="fas fa-search" aria-hidden />
                                <input
                                    type="search"
                                    className="business-job-postings__search"
                                    placeholder="Search by practice name, address, or phone…"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') applySearch();
                                    }}
                                    aria-label="Search practices"
                                />
                            </div>
                            <button
                                type="button"
                                className="talent-business-directory__search-btn"
                                onClick={applySearch}
                            >
                                Search
                            </button>
                        </div>
                    </div>
                </div>

                {error ? (
                    <p className="talent-jobs__error" role="alert">
                        {error}
                    </p>
                ) : null}

                {loading ? <p className="talent-jobs__loading">Loading…</p> : null}

                {!loading && data.results.length === 0 ? (
                    <p className="talent-jobs__empty">No practices match your search.</p>
                ) : null}

                {!loading && data.results.length > 0 ? (
                    <div className="business-jobs-browse__grid talent-business-directory__grid">
                        {data.results.map((b) => (
                            <Link
                                key={b.id}
                                to={`/talent/businesses/${b.id}`}
                                className="talent-business-directory__card"
                            >
                                <div className="talent-business-directory__card-accent" aria-hidden />
                                <div className="talent-business-directory__card-body">
                                    <h2 className="talent-business-directory__card-title">
                                        {b.business_name}
                                    </h2>
                                    <p className="talent-business-directory__card-line">
                                        <i className="fas fa-map-marker-alt" aria-hidden />
                                        <span>{b.postal_address || 'Address on file'}</span>
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : null}

                {!loading && totalPages > 1 ? (
                    <div className="talent-jobs__pagination">
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
            </div>
        </div>
    );
}
