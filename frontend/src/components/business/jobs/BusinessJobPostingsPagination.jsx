export default function BusinessJobPostingsPagination({
    variant = 'default',
    page,
    totalPages,
    totalCount,
    loading,
    onPrev,
    onNext,
}) {
    if (variant === 'browse') {
        return (
            <nav className="business-pagination business-pagination--browse" aria-label="Job postings pages">
                <button
                    type="button"
                    className="business-pagination__chevron"
                    disabled={page <= 1 || loading}
                    onClick={onPrev}
                    aria-label="Previous page"
                >
                    <i className="fas fa-chevron-left" aria-hidden />
                </button>
                <div className="business-pagination__browse-center">
                    <span className="business-pagination__browse-label">
                        Page {page} of {totalPages}
                    </span>
                    {typeof totalCount === 'number' ? (
                        <span className="business-pagination__browse-total">{totalCount} total</span>
                    ) : null}
                </div>
                <button
                    type="button"
                    className="business-pagination__chevron"
                    disabled={page >= totalPages || loading}
                    onClick={onNext}
                    aria-label="Next page"
                >
                    <i className="fas fa-chevron-right" aria-hidden />
                </button>
            </nav>
        );
    }

    return (
        <div className="business-pagination business-job-postings__pagination">
            <span className="business-pagination__info">
                Page {page} of {totalPages} · {totalCount} total
            </span>
            <div className="business-pagination__actions">
                <button
                    type="button"
                    className="business-btn business-btn--ghost"
                    disabled={page <= 1 || loading}
                    onClick={onPrev}
                >
                    Previous
                </button>
                <button
                    type="button"
                    className="business-btn business-btn--ghost"
                    disabled={page >= totalPages || loading}
                    onClick={onNext}
                >
                    Next
                </button>
            </div>
        </div>
    );
}
