export const SORT_PRESETS = [
    { id: 'updated_desc', orderBy: 'updated_at', orderDir: 'desc', label: 'Last updated' },
    { id: 'updated_asc', orderBy: 'updated_at', orderDir: 'asc', label: 'Last updated (oldest)' },
    { id: 'start_asc', orderBy: 'start_time', orderDir: 'asc', label: 'Start time (soonest)' },
    { id: 'start_desc', orderBy: 'start_time', orderDir: 'desc', label: 'Start time (latest)' },
    { id: 'salary_high', orderBy: 'salary_max', orderDir: 'desc', label: 'Salary (high first)' },
    { id: 'salary_low', orderBy: 'salary_min', orderDir: 'asc', label: 'Salary (low first)' },
];

export default function BusinessJobsBrowseToolbar({
    listTab,
    onListTabChange,
    searchQuery,
    onSearchChange,
    sortPresetId,
    onSortPresetChange,
    advancedOpen,
    onToggleAdvanced,
    filterCount,
    resultsLine,
    loading,
}) {
    return (
        <>
            <div className="business-jobs-browse__tabs" role="tablist" aria-label="Job list views">
                <button
                    type="button"
                    role="tab"
                    aria-selected={listTab === 'search'}
                    className={`business-jobs-browse__tab${listTab === 'search' ? ' business-jobs-browse__tab--active' : ''}`}
                    onClick={() => onListTabChange('search')}
                >
                    Search
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={listTab === 'matched'}
                    className={`business-jobs-browse__tab${listTab === 'matched' ? ' business-jobs-browse__tab--active' : ''}`}
                    onClick={() => onListTabChange('matched')}
                >
                    Interested / Matched Jobs
                </button>
            </div>

            <div className="business-jobs-browse__toolbar">
                <div className="business-jobs-browse__toolbar-row business-jobs-browse__toolbar-row--top">
                    <div className="business-job-postings__search-wrap">
                        <i className="fas fa-search" aria-hidden />
                        <input
                            className="business-job-postings__search business-job-postings__search--browse"
                            type="search"
                            placeholder="Search for a Job"
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            aria-label="Search jobs"
                        />
                    </div>
                    <div className="business-jobs-browse__sort">
                        <label htmlFor="biz-jobs-sort">Sort by:</label>
                        <select
                            id="biz-jobs-sort"
                            value={sortPresetId}
                            onChange={(e) => onSortPresetChange(e.target.value)}
                        >
                            {SORT_PRESETS.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="business-jobs-browse__toolbar-row business-jobs-browse__toolbar-row--sub">
                    <button
                        type="button"
                        className="business-jobs-browse__advanced"
                        aria-expanded={advancedOpen}
                        onClick={onToggleAdvanced}
                    >
                        Advanced Search
                        <i className="fas fa-chevron-down" aria-hidden />
                    </button>
                    <span className="business-jobs-browse__filter-hint">
                        {filterCount > 0 ? `${filterCount} filters applied` : 'No filters applied'}
                    </span>
                    <span className="business-jobs-browse__results" aria-live="polite">
                        {loading ? 'Loading…' : resultsLine}
                    </span>
                </div>
            </div>
        </>
    );
}
