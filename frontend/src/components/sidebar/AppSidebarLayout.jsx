import { NavLink } from 'react-router-dom';
import DentistyyLogo from '../DentistyyLogo.jsx';
import SidebarLogout from './SidebarLogout.jsx';

/**
 * Shared app sidebar (staff / practice / admin nav lists).
 */
export default function AppSidebarLayout({ ariaLabel, items }) {
    return (
        <aside className="app-sidebar" aria-label={ariaLabel}>
            <div className="app-sidebar__brand">
                <DentistyyLogo size={26} />
                <span className="app-sidebar__title">Dentistyy</span>
            </div>
            <nav className="app-sidebar__nav">
                {items.map(({ to, label, icon, end }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={Boolean(end)}
                        className={({ isActive }) =>
                            isActive ? 'app-sidebar__link app-sidebar__link--active' : 'app-sidebar__link'
                        }
                    >
                        <i className={`fas ${icon}`} aria-hidden />
                        <span>{label}</span>
                    </NavLink>
                ))}
            </nav>
            <SidebarLogout />
        </aside>
    );
}
