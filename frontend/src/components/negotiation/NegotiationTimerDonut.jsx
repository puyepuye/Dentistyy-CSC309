function formatClock(totalSec) {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

export default function NegotiationTimerDonut({ totalSec, leftSec }) {
    const r = 40;
    const c = 2 * Math.PI * r;
    const pct = totalSec > 0 ? Math.min(1, Math.max(0, leftSec / totalSec)) : 0;
    const offset = c * (1 - pct);

    return (
        <div className="talent-neg-timer" aria-label={`Time remaining ${formatClock(leftSec)}`}>
            <svg className="talent-neg-timer__svg" viewBox="0 0 100 100" aria-hidden>
                <circle className="talent-neg-timer__track" cx="50" cy="50" r={r} />
                <circle
                    className="talent-neg-timer__prog"
                    cx="50"
                    cy="50"
                    r={r}
                    strokeDasharray={c}
                    strokeDashoffset={offset}
                />
            </svg>
            <div>
                <div className="talent-neg-timer__label">Time remaining</div>
                <div className="talent-neg-timer__clock">{formatClock(leftSec)}</div>
                <div className="talent-neg-timer__sub">Minutes · Seconds</div>
            </div>
        </div>
    );
}
