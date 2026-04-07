import { Link } from 'react-router-dom';
import DentistyyLogo from './DentistyyLogo.jsx';
import styles from './AppFooterLayout.module.css';

export default function AppFooterLayout({ links, copyright }) {
    return (
        <footer className={styles.footer}>
            <div className={styles.inner}>
                <div className={styles.brand}>
                    <div className={styles.brandLogo}>
                        <DentistyyLogo size={28} color="#4fd1c5" />
                        <span className={styles.brandName}>{copyright}</span>
                    </div>
                    <p className={styles.tagline}>
                        Connecting top dental talent with leading practices across Canada.
                    </p>
                </div>
                <div className={styles.links}>
                    {Object.entries(links).map(([section, items]) => (
                        <div key={section} className={styles.linkCol}>
                            <h3 className={styles.linkColTitle}>{section}</h3>
                            <ul className={styles.linkList}>
                                {items.map((item) => (
                                    <li key={item.label}>
                                        <Link to={item.to} className={styles.linkItem}>
                                            {item.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
            <div className={styles.bottom}>
                <span>© {new Date().getFullYear()} {copyright}. All rights reserved.</span>
            </div>
        </footer>
    );
}