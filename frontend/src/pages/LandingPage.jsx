import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DentistyyLogo from '../components/DentistyyLogo.jsx';
import { getBusinessesList } from '../lib/api.js';
import styles from './LandingPage.module.css';

const HERO_IMAGE_SRC =
    'https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=880&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';
const PARTNER_SLOTS = 6;

function LandingPage() {
    const [partners, setPartners] = useState([]);
    const marqueePartners = partners.length ? [...partners, ...partners] : [];

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const res = await getBusinessesList({
                    page: 1,
                    limit: PARTNER_SLOTS,
                    sort: 'business_name',
                    order: 'asc',
                });
                if (!cancelled) setPartners(res.results ?? []);
            } catch {
                if (!cancelled) setPartners([]);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <div className={styles.landing}>
            <section className={styles.heroCard}>
                <div className={styles.heroLeft}>
                    <div className={styles.heroBrandPill}>
                        <DentistyyLogo size={28} />
                        <span>Dentistyy</span>
                    </div>

                    <h1 className={styles.heroTitle}>
                        Connecting top
                        <br />
                        talent with leading
                        <br />
                        opportunities
                        <br />
                        in Dental Care
                    </h1>
                </div>

                <div className={styles.heroRight}>
                    <img
                        src={HERO_IMAGE_SRC}
                        alt="Dental clinic"
                        className={styles.heroImage}
                    />

                    <div className={styles.quoteBubbleTop}>
                        <span className={styles.quoteIcon}>◎</span>
                        <span>“Best Recruitment Platform”, said Toronto Magazine.</span>
                    </div>

                    <div className={styles.quoteBubbleBottom}>
                        <span className={styles.ufotBadge}>UofT</span>
                        <span>Recommended by experts at UofT</span>
                    </div>
                </div>
            </section>

            <section className={styles.statsBand}>
                <div className={styles.statsFeature}>
                    <div className={styles.statsFeatureInner}>
                        <div className={styles.statsFeatureNumber}>#1</div>
                        <div className={styles.statsFeatureText}>Platform for Dentists</div>
                    </div>
                </div>

                <div className={styles.statsItem}>
                    <div className={styles.statsBig}>40,000+</div>
                    <div className={styles.statsSmall}>connections made across the platform</div>
                </div>

                <div className={styles.statsItem}>
                    <div className={styles.statsBig}>15 years</div>
                    <div className={styles.statsSmall}>of recruiting and staffing insight</div>
                </div>
            </section>

            <section className={styles.partnersSection}>
                <h2 className={styles.partnersTitle}>Our Business Partners</h2>
                <p className={styles.partnersSubtitle}>
                    Discover trusted dental practices on Dentistyy and{' '}
                    <Link to="/directory" className={styles.partnersSubtitleLink}>
                        more
                    </Link>
                </p>
                {partners.length ? (
                    <div className={styles.partnersMarquee}>
                        <div className={styles.partnersTrack}>
                            {marqueePartners.map((business, index) => (
                                <Link
                                    key={`${business.id}-${index}`}
                                    to={`/directory/${business.id}`}
                                    className={styles.partnerChip}
                                    tabIndex={index >= partners.length ? -1 : undefined}
                                    aria-hidden={index >= partners.length ? 'true' : undefined}
                                >
                                    <span className={styles.partnerChipName}>{business.business_name}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                ) : null}
            </section>
        </div>
    );
}

export default LandingPage;
