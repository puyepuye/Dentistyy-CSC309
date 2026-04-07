import { Link } from 'react-router-dom';
import { formatShiftCardLine } from '../../../lib/scheduleDisplay.js';
import BusinessJobStatusBadge from './BusinessJobStatusBadge.jsx';

function formatSalarySingle(min, max) {
    const a = Number(min);
    const b = Number(max);
    if (Number.isFinite(a) && Number.isFinite(b) && a === b) {
        return `$${Math.round(a).toLocaleString()}`;
    }
    if (Number.isFinite(a) && Number.isFinite(b)) {
        return `$${Math.round(a).toLocaleString()} – $${Math.round(b).toLocaleString()}`;
    }
    if (Number.isFinite(b)) return `$${Math.round(b).toLocaleString()}`;
    return '-';
}

/** Practice job card: mock layout (navy accent, no letter badge). */
export default function BusinessJobPostingCard({ job, practiceName }) {
    const role = job.position_type?.name || 'Role';
    const clinic = practiceName || 'Your practice';

    return (
        <Link className="business-job-card" to={`/businesses/jobs/${job.id}`}>
            <span className="business-job-card__accent" aria-hidden />
            <div className="business-job-card__body">
                <h3 className="business-job-card__title">{role}</h3>
                <p className="business-job-card__clinic">{clinic}</p>
                <p className="business-job-card__row">
                    <i className="fas fa-map-marker-alt" aria-hidden />
                    <span>Practice location on file</span>
                </p>
                <p className="business-job-card__row business-job-card__row--status">
                    <BusinessJobStatusBadge status={job.status} />
                </p>
                {job.worker ? (
                    <p className="business-job-card__row">
                        <i className="fas fa-user" aria-hidden />
                        <span>
                            {job.worker.first_name} {job.worker.last_name}
                        </span>
                    </p>
                ) : null}
                <p className="business-job-card__row">
                    <i className="fas fa-wallet" aria-hidden />
                    <span>{formatSalarySingle(job.salary_min, job.salary_max)}</span>
                </p>
                <p className="business-job-card__shift">
                    {job.start_time && job.end_time
                        ? formatShiftCardLine(job.start_time, job.end_time)
                        : '-'}
                </p>
            </div>
        </Link>
    );
}
