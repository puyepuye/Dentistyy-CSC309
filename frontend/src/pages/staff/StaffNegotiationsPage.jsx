import { Link } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useTalentNegotiation } from '../../contexts/TalentNegotiationContext.jsx';
import NegotiationDecisionConfirm from '../../components/negotiation/NegotiationDecisionConfirm.jsx';
import NegotiationChat from '../../components/negotiation/NegotiationChat.jsx';
import { patchNegotiationDecision } from '../../lib/api.js';
import { celebrateNegotiationSuccess } from '../../lib/negotiationConfetti.js';

function formatClock(totalSec) {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

function TimerDonut({ totalSec, leftSec }) {
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

export default function StaffNegotiationsPage() {
    const { token } = useAuth();
    const { negotiation, loading, refresh, secondsRemaining } = useTalentNegotiation();
    const [busy, setBusy] = useState(false);
    const [confirm, setConfirm] = useState(null);

    useEffect(() => {
        if (!negotiation) setConfirm(null);
    }, [negotiation]);

    const executeDecision = useCallback(
        async (decision) => {
            if (!token || !negotiation) return;
            setBusy(true);
            try {
                const next = await patchNegotiationDecision(token, negotiation.id, decision);
                setConfirm(null);
                if (decision === 'accept' && next.status === 'success') {
                    celebrateNegotiationSuccess();
                }
                await refresh();
            } catch (e) {
                window.alert(e instanceof Error ? e.message : 'Could not update decision.');
            } finally {
                setBusy(false);
            }
        },
        [token, negotiation, refresh]
    );

    const neg = negotiation;
    const totalSec = neg?.negotiation_window_seconds ?? 900;
    const left = secondsRemaining;
    const chatEnded = !neg || left <= 0 || neg.status !== 'active';

    return (
        <div className="talent-neg">
            <header>
                <p className="talent-neg__intro">
                    After a match, either side can start a timed negotiation: accept before it ends to confirm the shift.
                    Chat with the practice below.
                </p>
            </header>

            {loading ? <p className="talent-jobs__loading">Loading…</p> : null}

            {!loading && !neg ? (
                <section className="talent-card">
                    <p className="talent-bio__resume-missing">
                        No active negotiation. When you match with a practice, open one from the job detail page to agree
                        on terms.
                    </p>
                    <Link to="/talent/jobs" className="talent-job-detail__btn talent-job-detail__btn--primary">
                        Browse jobs
                    </Link>
                </section>
            ) : null}

            {!loading && neg ? (
                <div className="talent-neg__grid">
                    <div className="talent-neg__card">
                        <div className="talent-neg__card-head">
                            <h2>{neg.job?.business?.business_name ?? 'Practice'}</h2>
                            <p>
                                Current negotiation · Job #{neg.job?.id}: {neg.job?.position_type?.name}
                            </p>
                        </div>
                        <NegotiationChat
                            negotiationId={neg.id}
                            token={token}
                            selfRole="talent"
                            disabled={chatEnded}
                        />
                    </div>

                    <div className="talent-neg__card talent-neg-side">
                        <TimerDonut totalSec={totalSec} leftSec={left} />

                        <div className="talent-neg-status">
                            <h3>Current status</h3>
                            <ul>
                                <li>
                                    You:{' '}
                                    <strong>
                                        {neg.decisions?.candidate === 'accept'
                                            ? 'Accepted'
                                            : neg.decisions?.candidate === 'decline'
                                              ? 'Declined'
                                              : 'Pending'}
                                    </strong>
                                </li>
                                <li>
                                    {neg.job?.business?.business_name ?? 'Practice'}:{' '}
                                    <strong>
                                        {neg.decisions?.business === 'accept'
                                            ? 'Accepted'
                                            : neg.decisions?.business === 'decline'
                                              ? 'Declined'
                                              : 'Pending'}
                                    </strong>
                                </li>
                            </ul>
                        </div>

                        <div className="talent-neg-actions">
                            <button
                                type="button"
                                className="business-btn business-btn--primary"
                                disabled={busy || left <= 0 || neg.status !== 'active'}
                                onClick={() => setConfirm('accept')}
                            >
                                Accept
                            </button>
                            <button
                                type="button"
                                className="business-btn business-btn--ghost"
                                disabled={busy || left <= 0 || neg.status !== 'active'}
                                onClick={() => setConfirm('decline')}
                            >
                                Reject
                            </button>
                        </div>

                        <Link to="/talent/jobs" className="business-btn business-btn--ghost" style={{ textAlign: 'center' }}>
                            Browse jobs
                        </Link>
                    </div>
                </div>
            ) : null}

            <NegotiationDecisionConfirm
                open={confirm != null}
                variant={confirm === 'decline' ? 'reject' : 'accept'}
                busy={busy}
                otherPartyLabel={neg?.job?.business?.business_name ?? 'the practice'}
                onCancel={() => !busy && setConfirm(null)}
                onConfirm={() => executeDecision(confirm === 'decline' ? 'decline' : 'accept')}
            />
        </div>
    );
}
