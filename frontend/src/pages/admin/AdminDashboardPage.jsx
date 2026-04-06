import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import {
    getAdminBusinesses,
    getAdminPositionTypes,
    getAdminQualifications,
    getAdminUsers,
} from '../../lib/api.js';

const REVIEW_STATUSES = new Set(['submitted', 'revised']);

const QUICK_LINKS = [
    { to: '/admin/users', label: 'Users', desc: 'Accounts & suspension', icon: 'fa-users' },
    { to: '/admin/businesses', label: 'Businesses', desc: 'Directory & verification', icon: 'fa-store' },
    { to: '/admin/positions', label: 'Position types', desc: 'Roles & visibility', icon: 'fa-tags' },
    { to: '/admin/qualifications', label: 'Qualifications', desc: 'Review queue', icon: 'fa-clipboard-check' },
    { to: '/admin/system', label: 'System', desc: 'Timers & windows', icon: 'fa-cog' },
];

function formatStatus(s) {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function AdminDashboardPage() {
    const { token } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState({
        userCount: 0,
        businessCount: 0,
        positionCount: 0,
        pendingTotal: 0,
        pendingQuals: [],
    });

    const load = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const [usersRes, bizRes, qualRes, posRes] = await Promise.all([
                getAdminUsers(token, { page: 1, limit: 1 }),
                getAdminBusinesses(token, { page: 1, limit: 1 }),
                getAdminQualifications(token, { page: 1, limit: 120 }),
                getAdminPositionTypes(token, { page: 1, limit: 1 }),
            ]);
            const pending = (qualRes.results || []).filter((q) => REVIEW_STATUSES.has(q.status));
            pending.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
            setStats({
                userCount: usersRes.count ?? 0,
                businessCount: bizRes.count ?? 0,
                positionCount: posRes.count ?? 0,
                pendingTotal: pending.length,
                pendingQuals: pending.slice(0, 8),
            });
        } catch (e) {
            setError(e?.message || 'Could not load dashboard.');
            setStats({
                userCount: 0,
                businessCount: 0,
                positionCount: 0,
                pendingTotal: 0,
                pendingQuals: [],
            });
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        load();
    }, [load]);

    return (
        <div className="admin-dashboard">
            <p className="admin-dashboard__lede">
                Overview of the workspace. Jump to a section or review qualification requests that need a
                decision.
            </p>

            {error ? <p className="talent-jobs__error">{error}</p> : null}

            <section className="admin-dashboard__section" aria-labelledby="admin-bento-heading">
                <h2 id="admin-bento-heading" className="admin-dashboard__section-title">
                    Quick actions
                </h2>
                <div className="admin-bento">
                    {QUICK_LINKS.map((item) => (
                        <Link key={item.to} to={item.to} className="admin-bento-card">
                            <span className="admin-bento-card__icon" aria-hidden>
                                <i className={`fas ${item.icon}`} />
                            </span>
                            <span className="admin-bento-card__label">{item.label}</span>
                            <span className="admin-bento-card__desc">{item.desc}</span>
                        </Link>
                    ))}
                </div>
            </section>

            <section className="admin-dashboard__section" aria-labelledby="admin-stats-heading">
                <h2 id="admin-stats-heading" className="admin-dashboard__section-title">
                    At a glance
                </h2>
                <div className="admin-stats">
                    <div className="admin-stats__tile">
                        <span className="admin-stats__value">
                            {loading ? '—' : stats.userCount.toLocaleString()}
                        </span>
                        <span className="admin-stats__label">Regular users</span>
                    </div>
                    <div className="admin-stats__tile">
                        <span className="admin-stats__value">
                            {loading ? '—' : stats.businessCount.toLocaleString()}
                        </span>
                        <span className="admin-stats__label">Businesses</span>
                    </div>
                    <div className="admin-stats__tile">
                        <span className="admin-stats__value">
                            {loading ? '—' : stats.positionCount.toLocaleString()}
                        </span>
                        <span className="admin-stats__label">Position types</span>
                    </div>
                    <div className="admin-stats__tile admin-stats__tile--accent">
                        <span className="admin-stats__value">
                            {loading ? '—' : stats.pendingTotal.toLocaleString()}
                        </span>
                        <span className="admin-stats__label">Awaiting review</span>
                    </div>
                </div>
            </section>

            <section className="admin-dashboard__section" aria-labelledby="admin-pending-heading">
                <div className="admin-dashboard__section-head">
                    <h2 id="admin-pending-heading" className="admin-dashboard__section-title">
                        Qualification queue
                    </h2>
                    <Link to="/admin/qualifications" className="admin-dashboard__section-link">
                        Open qualifications
                        <i className="fas fa-arrow-right" aria-hidden />
                    </Link>
                </div>

                {loading ? (
                    <p className="talent-jobs__loading">Loading…</p>
                ) : stats.pendingQuals.length === 0 ? (
                    <p className="admin-dashboard__empty">No requests pending review right now.</p>
                ) : (
                    <ul className="admin-pending-list">
                        {stats.pendingQuals.map((q) => (
                            <li key={q.id} className="admin-pending-list__item">
                                <div className="admin-pending-list__main">
                                    <span className="admin-pending-list__title">
                                        {q.user?.first_name} {q.user?.last_name}
                                    </span>
                                    <span className="admin-pending-list__meta">
                                        {q.position_type?.name ?? 'Position'} · {formatStatus(q.status)}
                                    </span>
                                </div>
                                <Link
                                    to="/admin/qualifications"
                                    className="admin-pending-list__cta"
                                >
                                    Review
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}
