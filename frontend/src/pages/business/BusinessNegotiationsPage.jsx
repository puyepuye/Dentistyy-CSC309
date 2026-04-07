import { Link } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useBusinessNegotiation } from '../../contexts/BusinessNegotiationContext.jsx';
import NegotiationDecisionConfirm from '../../components/negotiation/NegotiationDecisionConfirm.jsx';
import NegotiationChat from '../../components/negotiation/NegotiationChat.jsx';
import NegotiationTimerDonut from '../../components/negotiation/NegotiationTimerDonut.jsx';
import { getMyNegotiation, patchNegotiationDecision } from '../../lib/api.js';
import {
    celebrateNegotiationSuccess,
    getClosedNegotiationNotice,
} from '../../lib/negotiationConfetti.js';

function secondsRemaining(iso) {
    if (!iso) return 0;
    return Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000));
}

export default function BusinessNegotiationsPage() {
    const { token } = useAuth();
    const { applyNegotiationPayload } = useBusinessNegotiation();
    const [neg, setNeg] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [clock, setClock] = useState(0);
    const [busy, setBusy] = useState(false);
    const [confirm, setConfirm] = useState(null);
    const [resultNotice, setResultNotice] = useState(null);
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
            if (n) setResultNotice(null);
        } catch (e) {
            const status = e && typeof e === 'object' && 'status' in e ? e.status : undefined;
            if (status === 404) {
                const notice = await getClosedNegotiationNotice(token, priorNeg);
                if (notice?.tone === 'success') {
                    celebrateNegotiationSuccess();
                }
                setResultNotice(notice);
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

    const activeNeg = neg?.status === 'active' ? neg : null;

    useEffect(() => {
        if (activeNeg) {
            setResultNotice(null);
        } else {
            setConfirm(null);
        }
    }, [activeNeg]);

    const executeDecision = useCallback(
        async (decision) => {
            if (!token || !neg) return;
            setBusy(true);
            try {
                const next = await patchNegotiationDecision(token, neg.id, decision);
                setNeg(next);
                applyNegotiationPayload(next);
                setConfirm(null);
                if (decision === 'accept' && next.status === 'success') {
                    celebrateNegotiationSuccess();
                    setResultNotice({
                        tone: 'success',
                        title: 'Match confirmed',
                        body: 'Your negotiation was accepted, this shift has been confirmed successfully, and it has been added to Scheduled.',
                    });
                } else if (decision === 'decline' || next.status === 'failed') {
                    setResultNotice({
                        tone: 'danger',
                        title: 'Negotiation ended',
                        body: 'This negotiation was rejected, so it is no longer active.',
                    });
                }
                await load();
            } catch (e) {
                window.alert(e instanceof Error ? e.message : 'Could not update decision.');
            } finally {
                setBusy(false);
            }
        },
        [token, neg, load, applyNegotiationPayload]
    );

    const left = useMemo(() => secondsRemaining(activeNeg?.expiresAt), [activeNeg?.expiresAt, clock]);
    const totalSec = activeNeg?.negotiation_window_seconds ?? 900;
    const chatEnded = !activeNeg || left <= 0 || activeNeg.status !== 'active';
    const businessAlreadyAccepted = activeNeg?.decisions?.business === 'accept';

    const candidateLabel = activeNeg
        ? `${activeNeg.user?.first_name ?? ''} ${activeNeg.user?.last_name ?? ''}`.trim() || 'Candidate'
        : 'Candidate';

    const handleStatusChange = useCallback(
        (next) => {
            if (!next || typeof next !== 'object') return;
            if (busy) return;
            setNeg(next);
            applyNegotiationPayload(next);
            if (next.status === 'success') {
                celebrateNegotiationSuccess();
                setResultNotice({
                    tone: 'success',
                    title: 'Match confirmed',
                    body: 'The other side accepted. This shift has been confirmed successfully and it has been added to Scheduled.',
                });
            } else if (next.status === 'failed') {
                setResultNotice({
                    tone: 'danger',
                    title: 'Negotiation ended',
                    body: 'This negotiation was rejected, so it is no longer active.',
                });
            }
        },
        [applyNegotiationPayload, busy]
    );

    return (
        <div className="talent-neg">
            {loading ? <p className="talent-jobs__loading">Loading…</p> : null}

            {error ? (
                <p className="talent-profile__error" role="alert">
                    {error}
                </p>
            ) : null}

            {!loading && !activeNeg && resultNotice ? (
                <section
                    className={`talent-card talent-neg__result talent-neg__result--${resultNotice.tone}`}
                    role={resultNotice.tone === 'danger' ? 'alert' : 'status'}
                >
                    <h2 className="talent-neg__result-title">{resultNotice.title}</h2>
                    <p className="talent-neg__result-text">{resultNotice.body}</p>
                </section>
            ) : null}

            {!loading && !activeNeg ? (
                <section className="talent-card talent-neg__empty">
                    <p className="talent-bio__resume-missing">
                        No active negotiation. When you match with a candidate, open one from the job detail page to agree
                        on terms.
                    </p>
                    <Link to="/businesses/jobs" className="talent-job-detail__btn talent-job-detail__btn--primary">
                        Go to job posting
                    </Link>
                </section>
            ) : null}

            {!loading && activeNeg ? (
                <div className="talent-neg__grid">
                    <div className="talent-neg__card">
                        <div className="talent-neg__card-head">
                            <h2>{candidateLabel}</h2>
                            <p>
                                Current negotiation · {activeNeg.job?.position_type?.name}
                            </p>
                        </div>
                        <NegotiationChat
                            negotiationId={activeNeg.id}
                            token={token}
                            selfRole="business"
                            disabled={chatEnded}
                            onStatusChange={handleStatusChange}
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
                                        {activeNeg.decisions?.business === 'accept'
                                            ? 'Accepted'
                                            : activeNeg.decisions?.business === 'decline'
                                              ? 'Declined'
                                              : 'Pending'}
                                    </strong>
                                </li>
                                <li>
                                    {candidateLabel}:{' '}
                                    <strong>
                                        {activeNeg.decisions?.candidate === 'accept'
                                            ? 'Accepted'
                                            : activeNeg.decisions?.candidate === 'decline'
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
                                    busy || left <= 0 || activeNeg.status !== 'active' || businessAlreadyAccepted
                                }
                                onClick={() => setConfirm('accept')}
                            >
                                Accept
                            </button>
                            <button
                                type="button"
                                className="business-btn business-btn--ghost"
                                disabled={busy || left <= 0 || activeNeg.status !== 'active'}
                                onClick={() => setConfirm('decline')}
                            >
                                Reject
                            </button>
                        </div>

                        <Link to="/businesses/jobs" className="business-btn business-btn--ghost" style={{ textAlign: 'center' }}>
                            Go to job posting
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
