import { formatJobStatusLabel, getBusinessJobBadgeClass } from '../../../lib/businessJobStatus.js';

/** Status pill for a job row (theme tokens via business-workspace.css). */
export default function BusinessJobStatusBadge({ status }) {
    return <span className={getBusinessJobBadgeClass(status)}>{formatJobStatusLabel(status)}</span>;
}
