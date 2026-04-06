import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useBusinessProfile } from '../../contexts/BusinessProfileContext.jsx';
import { getBusinessMyJobs } from '../../lib/api.js';

export default function BusinessDashboardPage() {
    const { token } = useAuth();
    const { profile } = useBusinessProfile();
    const [openCount, setOpenCount] = useState(null);
    const [filledCount, setFilledCount] = useState(null);

    useEffect(() => {
        if (!token) return;
        let cancelled = false;
        (async () => {
            try {
                const [openRes, filledRes] = await Promise.all([
                    getBusinessMyJobs(token, { status: ['OPEN'], limit: '1', page: '1' }),
                    getBusinessMyJobs(token, { status: ['FILLED'], limit: '1', page: '1' }),
                ]);
                if (!cancelled) {
                    setOpenCount(openRes.count);
                    setFilledCount(filledRes.count);
                }
            } catch {
                if (!cancelled) {
                    setOpenCount(null);
                    setFilledCount(null);
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [token]);

    return (
        <div className="talent-profile">
            <section className="talent-card" aria-labelledby="overview-heading">
                <h2 className="talent-card__title" id="overview-heading">
                    Practice overview
                </h2>
                <p className="business-card__hint">
                    Signed in as <strong>{profile?.business_name ?? 'your practice'}</strong>.
                    {profile && !profile.verified
                        ? ' Verification is required before you can publish new shifts.'
                        : null}
                </p>
                <div className="business-stat-grid">
                    <div className="business-stat-card">
                        <span className="talent-field__label">Open postings</span>
                        <p className="business-stat-card__value">{openCount ?? '—'}</p>
                        <Link to="/businesses/jobs" className="business-stat-card__link">
                            Manage job postings
                        </Link>
                    </div>
                    <div className="business-stat-card">
                        <span className="talent-field__label">Filled postings</span>
                        <p className="business-stat-card__value">{filledCount ?? '—'}</p>
                        <Link to="/businesses/jobs" className="business-stat-card__link">
                            View schedule
                        </Link>
                    </div>
                </div>
                <div className="business-stack">
                    <Link to="/businesses/profile" className="business-btn business-btn--ghost">
                        Practice profile
                    </Link>
                    <Link to="/businesses/jobs/new" className="business-btn business-btn--primary">
                        New job posting
                    </Link>
                    <Link to="/businesses/negotiations" className="business-btn business-btn--ghost">
                        Negotiations
                    </Link>
                </div>
            </section>
        </div>
    );
}
