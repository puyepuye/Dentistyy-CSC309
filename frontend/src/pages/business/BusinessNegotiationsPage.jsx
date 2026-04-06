import { Link } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import NegotiationDecisionConfirm from '../../components/negotiation/NegotiationDecisionConfirm.jsx';
import NegotiationChat from '../../components/negotiation/NegotiationChat.jsx';
import NegotiationTimerDonut from '../../components/negotiation/NegotiationTimerDonut.jsx';
import { getMyNegotiation, patchNegotiationDecision } from '../../lib/api.js';
import {
    celebrateNegotiationSuccess,
    celebrateNegotiationSuccessIfJobFilled,
} from '../../lib/negotiationConfetti.js';

function secondsRemaining(iso) {
    if (!iso) return 0;
    return Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000));
}

export default function BusinessNegotiationsPage() {
    const { token } = useAuth();
    const [neg, setNeg] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [clock, setClock] = useState(0);
    const [busy, setBusy] = useState(false);
    const [confirm, setConfirm] = useState(null);
    const negRef = useRef(null);
    useEffect(() => {
        negRef.current = neg;
    }, [neg]);

    const load = useCallback(async () => {
        if (!token) {
            setNeg(null);
            setLoading(false);
            return;
        }
        const priorNeg = negRef.current;
        try {
            const n = await getMyNegotiation(token);
            setNeg(n);
            setError(null);
        } catch (e) {
            const status = e && typeof e === 'object' && 'status' in e ? e.status : undefined;
            if (status === 404) {
                await celebrateNegotiationSuccessIfJobFilled(token, priorNeg);
                setNeg(null);
                setError(null);
            } else {
                setNeg(null);
                setError(e instanceof Error ? e.message : 'Could not load negotiation');
            }
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        if (!token) return undefined;
        const id = setInterval(() => void load(), 8000);
        return () => clearInterval(id);
    }, [token, load]);

    useEffect(() => {
        if (!neg) return undefined;
        const id = setInterval(() => setClock((t) => t + 1), 1000);
        return () => clearInterval(id);
    }, [neg]);

    useEffect(() => {
        if (!neg) setConfirm(null);
    }, [neg]);

    const executeDecision = useCallback(
        async (decision) => {
            if (!token || !neg) return;
            setBusy(true);
            try {
                const next = await patchNegotiationDecision(token, neg.id, decision);
                setConfirm(null);
                if (decision === 'accept' && next.status === 'success') {
                    celebrateNegotiationSuccess();
                }
                await load();
            } catch (e) {
                window.alert(e instanceof Error ? e.message : 'Could not update decision.');
            } finally {
                setBusy(false);
            }
        },
        [token, neg, load]
    );

    const left = useMemo(() => secondsRemaining(neg?.expiresAt), [neg?.expiresAt, clock]);
    const totalSec = neg?.negotiation_window_seconds ?? 900;
    const chatEnded = !neg || left <= 0 || neg.status !== 'active';
    const businessAlreadyAccepted = neg?.decisions?.business === 'accept';

    const candidateLabel = neg
        ? `${neg.user?.first_name ?? ''} ${neg.user?.last_name ?? ''}`.trim() || 'Candidate'
        : 'Candidate';

    return (
        <div className="talent-neg">
            {loading ? <p className="talent-jobs__loading">Loading…</p> : null}

            {error ? (
                <p className="talent-profile__error" role="alert">
                    {error}
                </p>
            ) : null}

            {!loading && !neg ? (
                <section className="talent-card talent-neg__empty">
                    <p className="talent-bio__resume-missing">
                        No active negotiation. When you match with a candidate, open one from the job detail page to agree
                        on terms.
                    </p>
                    <Link to="/businesses/jobs" className="talent-job-detail__btn talent-job-detail__btn--primary">
                        Browse jobs
                    </Link>
                </section>
            ) : null}

            {!loading && neg ? (
                <div className="talent-neg__grid">
                    <div className="talent-neg__card">
                        <div className="talent-neg__card-head">
                            <h2>{candidateLabel}</h2>
                            <p>
                                Current negotiation · {neg.job?.position_type?.name}
                            </p>
                        </div>
                        <NegotiationChat
                            negotiationId={neg.id}
                            token={token}
                            selfRole="business"
                            disabled={chatEnded}
                        />
                    </div>

                    <div className="talent-neg__card talent-neg-side">
                        <NegotiationTimerDonut totalSec={totalSec} leftSec={left} />

                        <div className="talent-neg-status">
                            <h3>Current status</h3>
                            <ul>
                                <li>
                                    You:{' '}
                                    <strong>
                                        {neg.decisions?.business === 'accept'
                                            ? 'Accepted'
                                            : neg.decisions?.business === 'decline'
                                              ? 'Declined'
                                              : 'Pending'}
                                    </strong>
                                </li>
                                <li>
                                    {candidateLabel}:{' '}
                                    <strong>
                                        {neg.decisions?.candidate === 'accept'
                                            ? 'Accepted'
                                            : neg.decisions?.candidate === 'decline'
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
                                disabled={
                                    busy || left <= 0 || neg.status !== 'active' || businessAlreadyAccepted
                                }
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

                        <Link to="/businesses/jobs" className="business-btn business-btn--ghost" style={{ textAlign: 'center' }}>
                            Browse jobs
                        </Link>
                    </div>
                </div>
            ) : null}

            <NegotiationDecisionConfirm
                open={confirm != null}
                variant={confirm === 'decline' ? 'reject' : 'accept'}
                busy={busy}
                otherPartyLabel={candidateLabel}
                onCancel={() => !busy && setConfirm(null)}
                onConfirm={() => executeDecision(confirm === 'decline' ? 'decline' : 'accept')}
            />
        </div>
    );
}
