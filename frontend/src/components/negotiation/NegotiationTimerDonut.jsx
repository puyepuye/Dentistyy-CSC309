function formatClock(totalSec) {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

function getClockParts(totalSec) {
    return {
        minutes: String(Math.floor(totalSec / 60)),
        seconds: String(totalSec % 60).padStart(2, '0'),
    };
}

export default function NegotiationTimerDonut({ totalSec, leftSec }) {
    const r = 40;
    const c = 2 * Math.PI * r;
    const pct = totalSec > 0 ? Math.min(1, Math.max(0, leftSec / totalSec)) : 0;
    const offset = c * (1 - pct);
    const { minutes, seconds } = getClockParts(leftSec);

    return (
        <div className="talent-neg-timer" aria-label={`Time remaining ${formatClock(leftSec)}`}>
            <div className="talent-neg-timer__donut">
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
                <div className="talent-neg-timer__clock">
                    <div className="talent-neg-timer__value talent-neg-timer__value--minutes">{minutes}</div>
                    <div className="talent-neg-timer__separator">:</div>
                    <div className="talent-neg-timer__value talent-neg-timer__value--seconds">{seconds}</div>
                    <div className="talent-neg-timer__unit-label talent-neg-timer__unit-label--minutes">Minutes</div>
                    <div className="talent-neg-timer__unit-label talent-neg-timer__unit-label--seconds">Seconds</div>
                </div>
            </div>
            <div className="talent-neg-timer__meta">
                <div className="talent-neg-timer__label">Time remaining</div>
            </div>
        </div>
    );
}
