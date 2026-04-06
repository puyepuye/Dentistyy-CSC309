import { Link } from 'react-router-dom';
import MarketingButton from '../components/marketing/MarketingButton.jsx';
import formStyles from '../styles/MarketingForms.module.css';
import styles from './BusinessesPage.module.css';

function BusinessesPage() {
    return (
        <div className={styles.businessesPublic}>
            <h1 className={styles.businessesPublicTitle}>For dental practices</h1>
            <p className={styles.businessesPublicLede}>
                List shifts, review interested professionals, and run negotiations, all in one place.
                New practices can register to get started; returning users can log in.
            </p>
            <div className={styles.businessesPublicActions}>
                <MarketingButton as={Link} to="/signup/business" variant="primary">
                    Register your practice
                </MarketingButton>
                <MarketingButton as={Link} to="/login?tab=business" variant="secondary">
                    Practice login
                </MarketingButton>
            </div>
            <p className={formStyles.formHint}>
                Looking for shifts as a professional?{' '}
                <Link to="/signup">Sign up as talent</Link> or <Link to="/">return home</Link>.
            </p>
        </div>
    );
}

export default BusinessesPage;
