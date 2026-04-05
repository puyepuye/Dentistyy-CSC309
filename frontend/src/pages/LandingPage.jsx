import { Link } from 'react-router-dom';
import DentistyyLogo from '../components/DentistyyLogo.jsx';
import formStyles from '../styles/MarketingForms.module.css';
import styles from './LandingPage.module.css';

const HERO_IMAGE_SRC = '';

function LandingPage() {
    return (
        <div className={styles.landing}>
            <section className={styles.landingHeroPanel} aria-labelledby="landing-headline">
                <div className={styles.landingHeroGrid}>
                    <div>
                        <div className={styles.landingHeroBadge}>
                            <DentistyyLogo size={22} />
                            <span>Dentistyy</span>
                        </div>
                        <h1 id="landing-headline" className={styles.landingHeadline}>
                            Connecting top talent with leading opportunities in Dental Care
                        </h1>
                        <p className={styles.landingSubhead}>
                            Public home: jump into registration for professionals or practices, or log in to
                            continue where you left off.
                        </p>
                        <div className={styles.landingHeroActions}>
                            <Link
                                to="/signup"
                                className={`${formStyles.btn} ${styles.landingBtnWhiteSolid}`}
                            >
                                Register as talent
                            </Link>
                            <Link
                                to="/signup/business"
                                className={`${formStyles.btn} ${styles.landingBtnOutline}`}
                            >
                                Register your practice
                            </Link>
                            <Link to="/login" className={`${formStyles.btn} ${styles.landingBtnGhost}`}>
                                Login
                            </Link>
                        </div>
                    </div>
                    <div className={styles.landingHeroVisual}>
                        <img
                            className={styles.landingHeroImg}
                            src={HERO_IMAGE_SRC}
                            alt="Still need to add some dental picture"
                            width={440}
                            height={560}
                            loading="eager"
                        />
                        <div className={`${styles.landingFloat} ${styles.landingFloatUoft}`}>
                            <span
                                className={`${styles.landingFloatIcon} ${styles.landingFloatIconUoft}`}
                                aria-hidden
                            >
                                U
                            </span>
                            <span className={styles.landingFloatText}>
                                Recommended by experts at <strong>UofT</strong>
                            </span>
                        </div>
                        <div className={`${styles.landingFloat} ${styles.landingFloatPress}`}>
                            <span
                                className={`${styles.landingFloatIcon} ${styles.landingFloatIconPress}`}
                                aria-hidden
                            >
                                ★
                            </span>
                            <span className={styles.landingFloatText}>
                                &ldquo;Best Recruitment Platform&rdquo;, said Toronto Magazine.
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            <section className={styles.landingStats} aria-label="Platform highlights">
                <div className={styles.landingStatsGrid}>
                    <div className={styles.landingStatsCallout}>
                        <span>
                            #1 Platform for <span className={styles.landingStatsEmphasis}>Dentists</span>
                        </span>
                    </div>
                    <div className={styles.landingStatsMetric}>
                        <span className={styles.landingStatsNumber}>40,000+</span>
                        <span className={styles.landingStatsLabel}>Something actually so cool</span>
                    </div>
                    <div className={styles.landingStatsMetric}>
                        <span className={styles.landingStatsNumber}>15 years</span>
                        <span className={styles.landingStatsLabel}>of experience in match-making</span>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default LandingPage;
