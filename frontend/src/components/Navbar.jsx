import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import DentistyyLogo from './DentistyyLogo.jsx';
import styles from './Navbar.module.css';

function overviewPathForRole(role) {
    if (role === 'business') return '/businesses';
    if (role === 'user') return '/talent/jobs';
    return null;
}

function Navbar() {
    const { isLoggedIn, role, logout } = useAuth();
    const overviewPath = overviewPathForRole(role);

    return (
        <header className={styles.navbar}>
            <NavLink to="/" className={styles.brand} end>
                <DentistyyLogo size={28} />
                <span>Dentistyy</span>
            </NavLink>

            <div className={styles.navRight}>
                <nav className={styles.navMarketingInline} aria-label="Primary">
                    <NavLink
                        to="/"
                        className={({ isActive }) =>
                            isActive
                                ? `${styles.navMarketingLink} ${styles.navMarketingLinkActive}`
                                : styles.navMarketingLink
                        }
                        end
                    >
                        Home
                    </NavLink>
                    <NavLink
                        to="/directory"
                        className={({ isActive }) =>
                            isActive
                                ? `${styles.navMarketingLink} ${styles.navMarketingLinkActive}`
                                : styles.navMarketingLink
                        }
                    >
                        Businesses
                    </NavLink>
                    {isLoggedIn && overviewPath ? (
                        <NavLink
                            to={overviewPath}
                            className={({ isActive }) =>
                                isActive
                                    ? `${styles.navOverviewLink} ${styles.navOverviewLinkActive}`
                                    : styles.navOverviewLink
                            }
                        >
                            Go back to overview
                        </NavLink>
                    ) : null}
                </nav>
                {isLoggedIn ? (
                    <button type="button" className={styles.navLogout} onClick={logout}>
                        Log out
                    </button>
                ) : (
                    <NavLink
                        to="/login"
                        className={({ isActive }) =>
                            isActive
                                ? `${styles.navLoginPill} ${styles.navLoginPillActive}`
                                : styles.navLoginPill
                        }
                    >
                        Login
                    </NavLink>
                )}
            </div>
        </header>
    );
}

export default Navbar;
