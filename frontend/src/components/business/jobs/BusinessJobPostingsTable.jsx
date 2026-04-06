import { Link } from 'react-router-dom';
import BusinessJobStatusBadge from './BusinessJobStatusBadge.jsx';

function formatSalaryRange(min, max) {
    const a = Number(min);
    const b = Number(max);
    if (Number.isFinite(a) && Number.isFinite(b)) {
        return `$${a.toLocaleString()} – $${b.toLocaleString()}`;
    }
    return '—';
}

export default function BusinessJobPostingsTable({ jobs }) {
    return (
        <div className="business-table-wrap business-job-postings__table-wrap">
            <table className="business-table">
                <thead>
                    <tr>
                        <th scope="col">ID</th>
                        <th scope="col">Role</th>
                        <th scope="col">Status</th>
                        <th scope="col">Worker</th>
                        <th scope="col">Salary</th>
                        <th scope="col">Start</th>
                        <th scope="col">End</th>
                    </tr>
                </thead>
                <tbody>
                    {jobs.length === 0 ? (
                        <tr>
                            <td colSpan={7}>
                                <span className="business-job-postings__empty">No postings match these filters.</span>
                            </td>
                        </tr>
                    ) : (
                        jobs.map((j) => (
                            <tr key={j.id}>
                                <td>
                                    <Link to={`/businesses/jobs/${j.id}`}>{j.id}</Link>
                                </td>
                                <td>{j.position_type?.name ?? '—'}</td>
                                <td>
                                    <BusinessJobStatusBadge status={j.status} />
                                </td>
                                <td>
                                    {j.worker ? (
                                        <Link to={`/businesses/jobs/${j.id}/candidates/${j.worker.id}`}>
                                            {j.worker.first_name} {j.worker.last_name}
                                        </Link>
                                    ) : (
                                        '—'
                                    )}
                                </td>
                                <td>{formatSalaryRange(j.salary_min, j.salary_max)}</td>
                                <td>{new Date(j.start_time).toLocaleString()}</td>
                                <td>{new Date(j.end_time).toLocaleString()}</td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
