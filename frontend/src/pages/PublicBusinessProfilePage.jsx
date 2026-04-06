import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { assetUrl, getBusinessById } from '../lib/api.js';
import styles from './PublicBusinessProfilePage.module.css';

export default function PublicBusinessProfilePage() {
    const { businessId: idParam } = useParams();
    const businessId = Number(idParam);
    const [business, setBusiness] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const load = useCallback(async () => {
        if (!Number.isInteger(businessId) || businessId < 1) {
            setBusiness(null);
            setError('Practice not found.');
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const b = await getBusinessById(businessId);
            setBusiness(b);
        } catch (e) {
            setBusiness(null);
            setError(e instanceof Error ? e.message : 'Could not load this practice.');
        } finally {
            setLoading(false);
        }
    }, [businessId]);

    useEffect(() => {
        void load();
    }, [load]);

    if (loading) {
        return (
            <div className={styles.wrap}>
                <p className={styles.muted}>Loading…</p>
            </div>
        );
    }

    if (error || !business) {
        return (
            <div className={styles.wrap}>
                <p className={styles.error} role="alert">
                    {error ?? 'Practice not found.'}
                </p>
                <Link to="/directory" className={styles.backLink}>
                    ← Back to businesses
                </Link>
            </div>
        );
    }

    const name = business.business_name ?? 'Practice';
    const address = business.postal_address?.trim() || '';
    const avatarSrc = business.avatar ? assetUrl(business.avatar) : null;
    const bio =
        business.biography?.trim() ||
        'This practice has not added a public description yet.';

    return (
        <div className={styles.wrap}>
            <nav className={styles.breadcrumb} aria-label="Breadcrumb">
                <Link to="/directory">Businesses</Link>
                <span aria-hidden="true"> / </span>
                <span>{name}</span>
            </nav>

            <header className={styles.hero}>
                <div className={styles.avatarWrap}>
                    {avatarSrc ? (
                        <img className={styles.avatarImg} src={avatarSrc} alt="" />
                    ) : (
                        <div className={styles.avatarPlaceholder} />
                    )}
                </div>
                <div className={styles.heroText}>
                    <h1 className={styles.title}>{name}</h1>
                    {address ? (
                        <p className={styles.location}>
                            <i className="fas fa-map-marker-alt" aria-hidden />
                            {address}
                        </p>
                    ) : (
                        <p className={styles.muted}>Location not listed publicly.</p>
                    )}
                </div>
            </header>

            <section className={styles.section} aria-labelledby="about-heading">
                <h2 id="about-heading" className={styles.sectionTitle}>
                    About
                </h2>
                <p className={styles.bio}>{bio}</p>
            </section>

            <section className={styles.ctaBand} aria-label="Get started">
                <p className={styles.ctaText}>
                    Looking for shifts? Create a talent account to apply and negotiate with practices.
                </p>
                <div className={styles.ctaRow}>
                    <Link to="/signup" className={styles.ctaPrimary}>
                        Register as talent
                    </Link>
                    <Link to="/login" className={styles.ctaSecondary}>
                        Log in
                    </Link>
                </div>
            </section>
        </div>
    );
}
