import { Link } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useTalentNegotiation } from '../../contexts/TalentNegotiationContext.jsx';
import NegotiationDecisionConfirm from '../../components/negotiation/NegotiationDecisionConfirm.jsx';
import NegotiationChat from '../../components/negotiation/NegotiationChat.jsx';
import NegotiationTimerDonut from '../../components/negotiation/NegotiationTimerDonut.jsx';
import { patchNegotiationDecision } from '../../lib/api.js';
import { celebrateNegotiationSuccess } from '../../lib/negotiationConfetti.js';

export default function StaffNegotiationsPage() {
    const { token } = useAuth();
    const {
        negotiation,
        loading,
        refresh,
        secondsRemaining,
        lastResolution,
        clearLastResolution,
        applyNegotiationPayload,
    } = useTalentNegotiation();
    const [busy, setBusy] = useState(false);
    const [confirm, setConfirm] = useState(null);
    const [resultNotice, setResultNotice] = useState(null);

    const neg = negotiation?.status === 'active' ? negotiation : null;

    useEffect(() => {
        if (neg) {
            setResultNotice(null);
        } else {
            setConfirm(null);
        }
    }, [neg]);

    useEffect(() => {
        return () => {
            clearLastResolution();
        };
    }, [clearLastResolution]);

    const executeDecision = useCallback(
        async (decision) => {
            if (!token || !negotiation) return;
            setBusy(true);
            try {
                const next = await patchNegotiationDecision(token, negotiation.id, decision);
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
                await refresh();
            } catch (e) {
                window.alert(e instanceof Error ? e.message : 'Could not update decision.');
            } finally {
                setBusy(false);
            }
        },
        [token, negotiation, refresh, applyNegotiationPayload]
    );

    const totalSec = neg?.negotiation_window_seconds ?? 900;
    const left = secondsRemaining;
    const chatEnded = !neg || left <= 0 || neg.status !== 'active';
    const talentAlreadyAccepted = neg?.decisions?.candidate === 'accept';

    const handleStatusChange = useCallback(
        (next) => {
            if (!next || typeof next !== 'object') return;
            if (busy) return;
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

            {!loading && !neg && (resultNotice || lastResolution) ? (
                <section
                    className={`talent-card talent-neg__result talent-neg__result--${(resultNotice || lastResolution).tone}`}
                    role={(resultNotice || lastResolution).tone === 'danger' ? 'alert' : 'status'}
                >
                    <h2 className="talent-neg__result-title">{(resultNotice || lastResolution).title}</h2>
                    <p className="talent-neg__result-text">{(resultNotice || lastResolution).body}</p>
                </section>
            ) : null}

            {!loading && !neg ? (
                <section className="talent-card talent-neg__empty">
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
                                Current negotiation · {neg.job?.position_type?.name}
                            </p>
                        </div>
                        <NegotiationChat
                            negotiationId={neg.id}
                            token={token}
                            selfRole="talent"
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
                                disabled={
                                    busy || left <= 0 || neg.status !== 'active' || talentAlreadyAccepted
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
