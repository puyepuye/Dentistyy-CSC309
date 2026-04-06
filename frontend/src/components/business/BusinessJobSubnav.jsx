import { NavLink, useParams } from 'react-router-dom';

export default function BusinessJobSubnav() {
    const { jobId } = useParams();
    if (!jobId) return null;
    const base = `/businesses/jobs/${jobId}`;

    function linkClass({ isActive }) {
        return `business-subnav__link${isActive ? ' business-subnav__link--active' : ''}`;
    }

    return (
        <nav className="business-subnav" aria-label="Job sections">
            <NavLink to={base} end className={linkClass}>
                Overview
            </NavLink>
            <NavLink to={`${base}/candidates`} className={linkClass}>
                Candidates
            </NavLink>
            <NavLink to={`${base}/interests`} className={linkClass}>
                Interest
            </NavLink>
        </nav>
    );
}
