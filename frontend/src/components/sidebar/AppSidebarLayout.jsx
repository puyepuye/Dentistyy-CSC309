import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import DentistyyLogo from '../DentistyyLogo.jsx';
import SidebarLogout from './SidebarLogout.jsx';

const MOBILE_QUERY = '(max-width: 768px)';

function useIsMobileNav() {
    const [isMobile, setIsMobile] = useState(() =>
        typeof window !== 'undefined' ? window.matchMedia(MOBILE_QUERY).matches : false
    );

    useEffect(() => {
        const mq = window.matchMedia(MOBILE_QUERY);
        const onChange = () => setIsMobile(mq.matches);
        mq.addEventListener('change', onChange);
        setIsMobile(mq.matches);
        return () => mq.removeEventListener('change', onChange);
    }, []);

    return isMobile;
}

/**
 * Shared app sidebar (staff / practice / admin nav lists).
 * Desktop: persistent column. Mobile: compact bar + hamburger drawer.
 */
export default function AppSidebarLayout({ ariaLabel, items }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const isMobile = useIsMobileNav();
    const location = useLocation();

    useEffect(() => {
        setMenuOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        if (!menuOpen) return;
        const onKey = (e) => {
            if (e.key === 'Escape') setMenuOpen(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [menuOpen]);

    useEffect(() => {
        if (!isMobile || !menuOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [isMobile, menuOpen]);

    const panelInert = isMobile && !menuOpen;

    return (
        <aside
            className={`app-sidebar${menuOpen ? ' app-sidebar--open' : ''}`}
            aria-label={ariaLabel}
        >
            <div className="app-sidebar__brand-row">
                <div className="app-sidebar__brand">
                    <DentistyyLogo size={26} />
                    <span className="app-sidebar__title">Dentistyy</span>
                </div>
                <button
                    type="button"
                    className="app-sidebar__menu-toggle"
                    aria-expanded={isMobile ? menuOpen : undefined}
                    aria-controls="app-sidebar-panel"
                    onClick={() => setMenuOpen((o) => !o)}
                >
                    <span className="app-sidebar__sr-only">
                        {menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                    </span>
                    <i className={`fas ${menuOpen ? 'fa-times' : 'fa-bars'}`} aria-hidden />
                </button>
            </div>

            {isMobile && menuOpen ? (
                <button
                    type="button"
                    className="app-sidebar__backdrop"
                    tabIndex={-1}
                    aria-label="Close menu"
                    onClick={() => setMenuOpen(false)}
                />
            ) : null}

            <div
                id="app-sidebar-panel"
                className="app-sidebar__panel"
                inert={panelInert || undefined}
            >
                <nav className="app-sidebar__nav" aria-label={ariaLabel}>
                    {items.map(({ to, label, icon, end }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={Boolean(end)}
                            className={({ isActive }) =>
                                isActive ? 'app-sidebar__link app-sidebar__link--active' : 'app-sidebar__link'
                            }
                            onClick={() => isMobile && setMenuOpen(false)}
                        >
                            <i className={`fas ${icon}`} aria-hidden />
                            <span>{label}</span>
                        </NavLink>
                    ))}
                </nav>
                <SidebarLogout />
            </div>
        </aside>
    );
}
