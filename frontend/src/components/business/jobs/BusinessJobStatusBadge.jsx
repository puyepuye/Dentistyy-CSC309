function badgeClass(status) {
    const s = (status || '').toLowerCase();
    if (s === 'open') return 'business-badge business-badge--open';
    if (s === 'filled') return 'business-badge business-badge--filled';
    return 'business-badge business-badge--muted';
}

/** Status pill for a job row (theme tokens via business-workspace.css). */
export default function BusinessJobStatusBadge({ status }) {
    const label = (status || '—').toUpperCase();
    return <span className={badgeClass(status)}>{label}</span>;
}
