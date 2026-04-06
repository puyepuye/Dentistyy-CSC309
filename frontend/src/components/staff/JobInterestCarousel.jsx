import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * Horizontal strip: card-sized pages, left-aligned; dots match one per job card when scrolled.
 */
export default function JobInterestCarousel({ title, subtitle, items, emptyMessage, renderItem }) {
    const viewportRef = useRef(null);
    const [pageIndex, setPageIndex] = useState(0);
    const [pageCount, setPageCount] = useState(1);
    const [hasOverflow, setHasOverflow] = useState(false);

    const updateScrollMetrics = useCallback(() => {
        const vp = viewportRef.current;
        if (!vp) return;
        const { scrollLeft, clientWidth, scrollWidth } = vp;
        const cw = Math.max(1, clientWidth);
        const sw = scrollWidth;
        const overflow = sw > cw + 2;
        setHasOverflow(overflow);

        const track = vp.querySelector('.talent-interest-carousel__track');
        const slots = track?.querySelectorAll('.talent-interest-carousel__card-slot');
        const n = slots?.length ?? 0;

        if (!overflow || n <= 1) {
            setPageCount(1);
            setPageIndex(0);
            return;
        }

        setPageCount(n);

        let best = 0;
        for (let i = 0; i < n; i++) {
            const el = slots[i];
            const left = el.offsetLeft - track.offsetLeft;
            if (left <= scrollLeft + 8) {
                best = i;
            }
        }
        setPageIndex(Math.min(best, n - 1));
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

    const scrollToCardIndex = useCallback((targetIdx) => {
        const vp = viewportRef.current;
        const track = vp?.querySelector('.talent-interest-carousel__track');
        if (!vp || !track) return;
        const slots = track.querySelectorAll('.talent-interest-carousel__card-slot');
        const idx = Math.max(0, Math.min(slots.length - 1, targetIdx));
        const slot = slots[idx];
        if (!slot) return;
        const left = slot.offsetLeft - track.offsetLeft;
        vp.scrollTo({ left, behavior: 'smooth' });
    }, []);

    const scrollByCard = useCallback(
        (delta) => {
            const vp = viewportRef.current;
            const track = vp?.querySelector('.talent-interest-carousel__track');
            if (!vp || !track) return;
            const slots = track.querySelectorAll('.talent-interest-carousel__card-slot');
            let cur = 0;
            for (let i = 0; i < slots.length; i++) {
                const left = slots[i].offsetLeft - track.offsetLeft;
                if (left <= vp.scrollLeft + 8) cur = i;
            }
            scrollToCardIndex(cur + delta);
        },
        [scrollToCardIndex]
    );

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

    const atStart = pageIndex <= 0;
    const atEnd = pageIndex >= pageCount - 1;

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
                        aria-label="Previous job"
                        disabled={atStart}
                        onClick={() => scrollByCard(-1)}
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
                        aria-label="Next job"
                        disabled={atEnd}
                        onClick={() => scrollByCard(1)}
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
                            aria-label={`Job ${i + 1} of ${pageCount}`}
                            className={
                                i === pageIndex
                                    ? 'talent-interest-carousel__dot talent-interest-carousel__dot--active'
                                    : 'talent-interest-carousel__dot'
                            }
                            onClick={() => scrollToCardIndex(i)}
                        />
                    ))}
                </div>
            ) : null}
        </section>
    );
}
