import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import MarketingButton from '../components/marketing/MarketingButton.jsx';
import DentistyyLogo from '../components/DentistyyLogo.jsx';
import { getBusinessesList } from '../lib/api.js';
import formStyles from '../styles/MarketingForms.module.css';
import styles from './BusinessesPage.module.css';

const PAGE_SIZE = 12;

export default function BusinessesPage() {
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
            setError(e instanceof Error ? e.message : 'Failed to load businesses.');
            setData({ count: 0, results: [] });
        } finally {
            setLoading(false);
        }
    }, [searchQuery, page]);

    useEffect(() => {
        void load();
    }, [load]);

    function applySearch() {
        setSearchQuery(inputValue.trim());
        setPage(1);
    }

    const totalPages = Math.max(1, Math.ceil((data.count || 0) / PAGE_SIZE));

    return (
        <div className={styles.directory}>
            <header className={styles.directoryHeader}>
                <section className={styles.directoryHero}>
                    <span className={styles.directoryEyebrow}>Trusted Practices</span>
                    <h1 className={styles.directoryTitle}>Find the right dental practice for you</h1>
                    <p className={styles.directoryLede}>
                        Discover trusted dental practices, explore their public profiles, and find the
                        right clinic for your next opportunity.
                    </p>
                </section>
            </header>

            <div className={styles.directorySearchRow}>
                <div className={styles.directorySearchWrap}>
                    <i className="fas fa-search" aria-hidden />
                    <input
                        type="search"
                        className={styles.directorySearch}
                        placeholder="Search by practice name or location…"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') applySearch();
                        }}
                        aria-label="Search businesses"
                    />
                </div>
                <button type="button" className={styles.directorySearchBtn} onClick={applySearch}>
                    Search
                </button>
            </div>

            {error ? (
                <p className={styles.directoryError} role="alert">
                    {error}
                </p>
            ) : null}

            {loading ? <p className={styles.directoryMuted}>Loading…</p> : null}

            {!loading && data.results.length === 0 ? (
                <p className={styles.directoryMuted}>No businesses match your search.</p>
            ) : null}

            {!loading && data.results.length > 0 ? (
                <ul className={styles.directoryGrid}>
                    {data.results.map((b) => {
                        const addr = b.postal_address || '';
                        const tag =
                            addr.split(',').map((s) => s.trim()).filter(Boolean)[0] || 'Canada';
                        const bioPreview = b.biography?.trim();
                        return (
                            <li key={b.id}>
                                <Link to={`/directory/${b.id}`} className={styles.directoryCard}>
                                    <div className={styles.directoryCardTop}>
                                        <div className={styles.directoryCardIcon} aria-hidden>
                                            <DentistyyLogo size={26} />
                                        </div>
                                        <div className={styles.directoryCardHead}>
                                            <h2 className={styles.directoryCardTitle}>{b.business_name}</h2>
                                        </div>
                                    </div>
                                    <p className={styles.directoryCardLine}>
                                        <i className="fas fa-map-marker-alt" aria-hidden />
                                        <span>{addr || 'Location on file'}</span>
                                    </p>
                                    <p className={styles.directoryCardSummary}>
                                        {bioPreview ||
                                            'View this public business profile to see practice details, location, and background information.'}
                                    </p>
                                    <div className={styles.directoryCardMeta}>
                                        <span className={styles.directoryTag}>{tag}</span>
                                        <span className={styles.directoryCardLinkLabel}>View profile</span>
                                    </div>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            ) : null}

            {!loading && totalPages > 1 ? (
                <div className={styles.directoryPager}>
                    <button
                        type="button"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                        Previous
                    </button>
                    <span>
                        Page {page} of {totalPages}
                    </span>
                    <button
                        type="button"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                    >
                        Next
                    </button>
                </div>
            ) : null}

            <section className={styles.directoryCta} aria-label="For practices">
                <h2 className={styles.directoryCtaTitle}>For dental practices</h2>
                <p className={styles.directoryCtaLede}>
                    List shifts, review interested professionals, and run negotiations in one place.
                </p>
                <div className={styles.directoryCtaActions}>
                    <MarketingButton as={Link} to="/signup/business" variant="primary">
                        Register your practice
                    </MarketingButton>
                    <MarketingButton as={Link} to="/login?tab=business" variant="secondary">
                        Practice login
                    </MarketingButton>
                </div>
                <p className={formStyles.formHint}>
                    <Link to="/">Return home</Link>
                </p>
            </section>
        </div>
    );
}
