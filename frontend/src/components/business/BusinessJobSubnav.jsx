import { useEffect, useState } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { getJobById } from '../../lib/api.js';
import { isJobPeopleTabDisabled } from '../../lib/businessJobStatus.js';

export default function BusinessJobSubnav() {
    const { jobId } = useParams();
    const { token } = useAuth();
    const [jobStatus, setJobStatus] = useState(null);
    const [jobLoading, setJobLoading] = useState(true);

    useEffect(() => {
        if (!jobId || !token) {
            setJobLoading(false);
            return;
        }
        const id = Number(jobId);
        if (!Number.isInteger(id) || id < 1) {
            setJobLoading(false);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const j = await getJobById(token, id);
                if (!cancelled) setJobStatus(j?.status ?? null);
            } catch {
                if (!cancelled) setJobStatus(null);
            } finally {
                if (!cancelled) setJobLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [jobId, token]);

    if (!jobId) return null;
    const base = `/businesses/jobs/${jobId}`;

    function linkClass({ isActive }) {
        return `business-jobs-browse__tab${isActive ? ' business-jobs-browse__tab--active' : ''}`;
    }

    const peopleDisabled = jobLoading || (jobStatus != null && isJobPeopleTabDisabled(jobStatus));

    return (
        <nav className="business-jobs-browse__tabs" aria-label="Job sections">
            <NavLink to={base} end className={linkClass}>
                Overview
            </NavLink>
            {peopleDisabled ? (
                <span
                    className="business-jobs-browse__tab business-jobs-browse__tab--disabled"
                    aria-disabled="true"
                    title={
                        jobLoading
                            ? 'Loading…'
                            : 'People is not available for filled, completed, or cancelled jobs.'
                    }
                >
                    People
                </span>
            ) : (
                <NavLink to={`${base}/candidates?view=manage`} className={linkClass}>
                    People
                </NavLink>
            )}
        </nav>
    );
}
