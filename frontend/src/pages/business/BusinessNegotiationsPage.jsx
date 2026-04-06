import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import NegotiationDecisionConfirm from '../../components/negotiation/NegotiationDecisionConfirm.jsx';
import NegotiationChat from '../../components/negotiation/NegotiationChat.jsx';
import { getMyNegotiation, patchNegotiationDecision } from '../../lib/api.js';
import { celebrateNegotiationSuccess } from '../../lib/negotiationConfetti.js';

function secondsRemaining(iso) {
    return Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000));
}

function formatClock(totalSec) {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

export default function BusinessNegotiationsPage() {
    const { token } = useAuth();
    const [neg, setNeg] = useState(null);
    const [error, setError] = useState(null);
    const [, bumpRender] = useState(0);
    const [busy, setBusy] = useState(false);
    const [confirm, setConfirm] = useState(null);

    const load = useCallback(async () => {
        if (!token) return;
        try {
            const n = await getMyNegotiation(token);
            setNeg(n);
            setError(null);
        } catch (e) {
            const status = e && typeof e === 'object' && 'status' in e ? e.status : undefined;
            if (status === 404) {
                setNeg(null);
                setError(null);
            } else {
                setNeg(null);
                setError(e instanceof Error ? e.message : 'Could not load negotiation');
            }
        }
    }, [token]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        if (!neg) setConfirm(null);
    }, [neg]);

    useEffect(() => {
        if (!neg) return undefined;
        const id = setInterval(() => bumpRender((t) => t + 1), 1000);
        return () => clearInterval(id);
    }, [neg]);

    async function executeDecision(decision) {
        if (!token || !neg) return;
        setBusy(true);
        try {
            const next = await patchNegotiationDecision(token, neg.id, decision);
            setConfirm(null);
            if (decision === 'accept' && next.status === 'success') {
                celebrateNegotiationSuccess();
            }
            setNeg(next.status === 'active' ? next : null);
            if (next.status !== 'active') {
                await load();
            }
        } catch (e) {
            window.alert(e instanceof Error ? e.message : 'Could not update decision.');
        } finally {
            setBusy(false);
        }
    }

    const left = neg ? secondsRemaining(neg.expiresAt) : 0;

    return (
        <div className="talent-profile">
            <section className="talent-card">
                <h2 className="talent-card__title">Negotiations</h2>
                <p className="business-card__hint">
                    After a match, either side can start a timed negotiation: accept before it ends to fill the shift.
                </p>
                {error ? (
                    <p className="talent-profile__error" role="alert">
                        {error}
                    </p>
                ) : null}

                {!neg ? (
                    <p className="talent-bio__resume-missing">
                        No active negotiation for your practice. Start one from a job&apos;s{' '}
                        <strong>Interest</strong> tab when mutual interest is shown.
                    </p>
                ) : (
                    <div className="talent-profile-split" style={{ marginTop: '1rem' }}>
                        <div>
                            <h3 className="talent-card__title" style={{ fontSize: '1rem' }}>
                                Active negotiation
                            </h3>
                            <p className="talent-field__value" style={{ marginTop: '0.5rem' }}>
                                <span className="business-neg-timer">{formatClock(left)}</span> remaining
                            </p>
                            <div
                                className="talent-neg__card"
                                style={{ marginTop: '1rem', maxWidth: '100%' }}
                            >
                                <div className="talent-neg__card-head">
                                    <h2>
                                        {neg.user.first_name} {neg.user.last_name}
                                    </h2>
                                    <p>
                                        Job #{neg.job.id}: {neg.job.position_type?.name}
                                    </p>
                                </div>
                                <NegotiationChat
                                    negotiationId={neg.id}
                                    token={token}
                                    selfRole="business"
                                    disabled={left <= 0}
                                />
                            </div>
                            <ul className="talent-quals__list" style={{ marginTop: '0.75rem' }}>
                                <li>
                                    Job #{neg.job.id}: {neg.job.position_type?.name}
                                </li>
                                <li>
                                    Candidate: {neg.user.first_name} {neg.user.last_name}
                                </li>
                                <li>
                                    Salary band: ${neg.job.salary_min} – ${neg.job.salary_max}
                                </li>
                                <li>
                                    Shift: {new Date(neg.job.start_time).toLocaleString()} →{' '}
                                    {new Date(neg.job.end_time).toLocaleString()}
                                </li>
                            </ul>
                            <div className="business-stack">
                                <button
                                    type="button"
                                    className="business-btn business-btn--primary"
                                    disabled={busy || left <= 0}
                                    onClick={() => setConfirm('accept')}
                                >
                                    Accept
                                </button>
                                <button
                                    type="button"
                                    className="business-btn business-btn--danger"
                                    disabled={busy || left <= 0}
                                    onClick={() => setConfirm('decline')}
                                >
                                    Decline
                                </button>
                            </div>
                            <p className="business-card__hint" style={{ marginTop: '0.75rem' }}>
                                Your decision:{' '}
                                <strong>{neg.decisions?.business === 'accept' ? 'Accepted' : 'Pending'}</strong>
                                {' · '}
                                Candidate:{' '}
                                <strong>
                                    {neg.decisions?.candidate === 'accept'
                                        ? 'Accepted'
                                        : neg.decisions?.candidate === 'decline'
                                          ? 'Declined'
                                          : 'Pending'}
                                </strong>
                            </p>
                        </div>
                        <div>
                            <Link to="/businesses/jobs" className="business-btn business-btn--ghost">
                                Browse job postings
                            </Link>
                        </div>
                    </div>
                )}
            </section>

            <NegotiationDecisionConfirm
                open={confirm != null}
                variant={confirm === 'decline' ? 'reject' : 'accept'}
                busy={busy}
                otherPartyLabel={`${neg?.user?.first_name ?? ''} ${neg?.user?.last_name ?? ''}`.trim() || 'the candidate'}
                onCancel={() => !busy && setConfirm(null)}
                onConfirm={() => executeDecision(confirm === 'decline' ? 'decline' : 'accept')}
            />
        </div>
    );
}
