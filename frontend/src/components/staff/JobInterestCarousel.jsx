import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * Horizontal strip: scroll by viewport width; dots = number of scroll positions (pages), not item count.
 */
export default function JobInterestCarousel({ title, subtitle, items, emptyMessage, renderItem }) {
    const viewportRef = useRef(null);
    const [pageIndex, setPageIndex] = useState(0);
    const [pageCount, setPageCount] = useState(1);
    const [hasOverflow, setHasOverflow] = useState(false);
    const [atStart, setAtStart] = useState(true);
    const [atEnd, setAtEnd] = useState(true);

    const updateScrollMetrics = useCallback(() => {
        const vp = viewportRef.current;
        if (!vp) return;
        const { scrollLeft, clientWidth, scrollWidth } = vp;
        const cw = Math.max(1, clientWidth);
        const sw = scrollWidth;
        const overflow = sw > cw + 2;
        setHasOverflow(overflow);
        const maxScroll = Math.max(0, sw - cw);
        setAtStart(scrollLeft <= 1);
        setAtEnd(scrollLeft >= maxScroll - 1);

        if (!overflow) {
            setPageCount(1);
            setPageIndex(0);
            return;
        }

        const pages = Math.max(1, Math.ceil(sw / cw));
        setPageCount(pages);
        let idx = 0;
        if (pages > 1 && maxScroll > 0) {
            idx = Math.min(pages - 1, Math.round((scrollLeft / maxScroll) * (pages - 1)));
        }
        setPageIndex(idx);
    }, []);

    useLayoutEffect(() => {
        updateScrollMetrics();
    }, [items, updateScrollMetrics]);

    useEffect(() => {
        const vp = viewportRef.current;
        if (!vp) return;
        const ro = new ResizeObserver(() => updateScrollMetrics());
        ro.observe(vp);
        return () => ro.disconnect();
    }, [updateScrollMetrics]);

    useEffect(() => {
        const vp = viewportRef.current;
        if (vp) vp.scrollLeft = 0;
        setPageIndex(0);
    }, [items]);

    const onScroll = useCallback(() => {
        updateScrollMetrics();
    }, [updateScrollMetrics]);

    const scrollToPageIndex = useCallback((targetIdx) => {
        const vp = viewportRef.current;
        if (!vp) return;
        const cw = Math.max(1, vp.clientWidth);
        const sw = vp.scrollWidth;
        const maxScroll = Math.max(0, sw - cw);
        const pages = Math.max(1, Math.ceil(sw / cw));
        if (pages <= 1) return;
        const left = (targetIdx / (pages - 1)) * maxScroll;
        vp.scrollTo({ left, behavior: 'smooth' });
    }, []);

    const scrollByPage = useCallback((dir) => {
        const vp = viewportRef.current;
        if (!vp) return;
        vp.scrollBy({ left: dir * vp.clientWidth, behavior: 'smooth' });
    }, []);

    if (!items?.length) {
        return (
            <section className="talent-interest-carousel talent-interest-carousel--empty">
                <div className="talent-interest-carousel__header">
                    <h2 className="talent-interest-carousel__title">{title}</h2>
                    {subtitle ? <p className="talent-interest-carousel__subtitle">{subtitle}</p> : null}
                </div>
                <p className="talent-interest-carousel__empty">{emptyMessage}</p>
            </section>
        );
    }

    return (
        <section className="talent-interest-carousel" aria-label={title}>
            <div className="talent-interest-carousel__header">
                <h2 className="talent-interest-carousel__title">{title}</h2>
                {subtitle ? <p className="talent-interest-carousel__subtitle">{subtitle}</p> : null}
            </div>
            <div className="talent-interest-carousel__row">
                {hasOverflow ? (
                    <button
                        type="button"
                        className="talent-interest-carousel__arrow talent-interest-carousel__arrow--prev"
                        aria-label="Scroll back"
                        disabled={!hasOverflow || atStart}
                        onClick={() => scrollByPage(-1)}
                    >
                        <i className="fas fa-chevron-left" aria-hidden />
                    </button>
                ) : null}
                <div
                    ref={viewportRef}
                    className="talent-interest-carousel__viewport"
                    onScroll={onScroll}
                >
                    <div className="talent-interest-carousel__track">
                        {items.map((row) => (
                            <div
                                key={row.interest_id}
                                className="talent-interest-carousel__card-slot"
                            >
                                {renderItem(row)}
                            </div>
                        ))}
                    </div>
                </div>
                {hasOverflow ? (
                    <button
                        type="button"
                        className="talent-interest-carousel__arrow talent-interest-carousel__arrow--next"
                        aria-label="Scroll forward"
                        disabled={!hasOverflow || atEnd}
                        onClick={() => scrollByPage(1)}
                    >
                        <i className="fas fa-chevron-right" aria-hidden />
                    </button>
                ) : null}
            </div>
            {hasOverflow && pageCount > 1 ? (
                <div className="talent-interest-carousel__dots" role="tablist" aria-label={`${title} pages`}>
                    {Array.from({ length: pageCount }, (_, i) => (
                        <button
                            key={i}
                            type="button"
                            role="tab"
                            aria-selected={i === pageIndex}
                            aria-label={`Page ${i + 1} of ${pageCount}`}
                            className={
                                i === pageIndex
                                    ? 'talent-interest-carousel__dot talent-interest-carousel__dot--active'
                                    : 'talent-interest-carousel__dot'
                            }
                            onClick={() => scrollToPageIndex(i)}
                        />
                    ))}
                </div>
            ) : null}
        </section>
    );
}
