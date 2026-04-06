const STATUS_KEYS = ['OPEN', 'FILLED', 'EXPIRED', 'CANCELLED', 'COMPLETED'];

export { STATUS_KEYS };

export default function BusinessJobPostingsFilterBar({
    positionTypes,
    positionTypeId,
    onPositionTypeIdChange,
    salaryMin,
    onSalaryMinChange,
    orderBy,
    onOrderByChange,
    orderDir,
    onOrderDirChange,
    statusFilters,
    onToggleStatus,
    showSortFields = true,
    hideStatusFilters = false,
    statusHiddenHint,
}) {
    return (
        <div className="business-filters business-job-postings__filters" role="search" aria-label="Filter job postings">
            <div className="business-filters__field">
                <span className="business-filters__label">Position type</span>
                <select
                    className="business-filters__select"
                    value={positionTypeId}
                    onChange={(e) => onPositionTypeIdChange(e.target.value)}
                    aria-label="Filter by position type"
                >
                    <option value="">All types</option>
                    {positionTypes.map((pt) => (
                        <option key={pt.id} value={String(pt.id)}>
                            {pt.name}
                        </option>
                    ))}
                </select>
            </div>
            <div className="business-filters__field">
                <span className="business-filters__label">Min. salary (filter)</span>
                <input
                    className="business-filters__input"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Any"
                    value={salaryMin}
                    onChange={(e) => onSalaryMinChange(e.target.value)}
                    aria-label="Minimum salary filter"
                />
            </div>
            {showSortFields ? (
                <>
                    <div className="business-filters__field">
                        <span className="business-filters__label">Sort by</span>
                        <select
                            className="business-filters__select"
                            value={orderBy}
                            onChange={(e) => onOrderByChange(e.target.value)}
                        >
                            <option value="updated_at">Last updated</option>
                            <option value="start_time">Start time</option>
                            <option value="end_time">End time</option>
                            <option value="salary_min">Salary (min)</option>
                            <option value="salary_max">Salary (max)</option>
                            <option value="status">Status</option>
                        </select>
                    </div>
                    <div className="business-filters__field">
                        <span className="business-filters__label">Direction</span>
                        <select
                            className="business-filters__select"
                            value={orderDir}
                            onChange={(e) => onOrderDirChange(e.target.value)}
                        >
                            <option value="desc">Newest / high first</option>
                            <option value="asc">Oldest / low first</option>
                        </select>
                    </div>
                </>
            ) : null}
            <div className="business-filters__field business-filters__field--grow">
                <span className="business-filters__label">Status</span>
                {hideStatusFilters ? (
                    <p className="business-job-postings__open-only-hint">
                        {statusHiddenHint ??
                            'Open roles only. Use the Search tab to filter every status.'}
                    </p>
                ) : (
                    <div className="business-filters__statuses">
                        {STATUS_KEYS.map((k) => (
                            <label key={k} className="business-filters__check">
                                <input type="checkbox" checked={statusFilters.has(k)} onChange={() => onToggleStatus(k)} />
                                {k.charAt(0) + k.slice(1).toLowerCase()}
                            </label>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
