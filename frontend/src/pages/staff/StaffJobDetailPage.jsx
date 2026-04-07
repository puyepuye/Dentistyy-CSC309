import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useTalentNegotiation } from '../../contexts/TalentNegotiationContext.jsx';
import {
    getJobById,
    getNegotiationWindowSeconds,
    parseJwtPayload,
    patchJobInterested,
    startNegotiation,
} from '../../lib/api.js';
import { formatShiftDateTimeRange } from '../../lib/scheduleDisplay.js';

const DEFAULT_LAT = 43.6532;
const DEFAULT_LON = -79.3832;

/** Align client state with PATCH /jobs/:id/interested response (before optional GET refresh). */
const EMPTY_INTEREST = {
    mutual: false,
    user_expressed: false,
    business_expressed: false,
    user_interest_id: null,
    business_interest_id: null,
};

function normalizeJobPayload(data) {
    if (!data) return data;
    return {
        ...data,
        interest: data.interest != null ? { ...EMPTY_INTEREST, ...data.interest } : { ...EMPTY_INTEREST },
    };
}

function mergeJobInterestFromPatchResponse(prev, patchJson) {
    if (!prev || !patchJson) return prev;
    const userExpressed = patchJson.candidate?.interested === true;
    const businessExpressed =
        Boolean(prev.interest?.business_expressed) || patchJson.business?.interested === true;
    return {
        ...prev,
        interest: {
            ...prev.interest,
            user_interest_id: patchJson.id ?? null,
            user_expressed: userExpressed,
            business_expressed: businessExpressed,
            business_interest_id: prev.interest?.business_interest_id ?? null,
            mutual: Boolean(userExpressed && businessExpressed),
        },
    };
}

export default function StaffJobDetailPage() {
    const { jobId } = useParams();
    const navigate = useNavigate();
    const { token } = useAuth();
    const { refresh: refreshNegotiation, applyNegotiationPayload } = useTalentNegotiation();
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionError, setActionError] = useState(null);
    const [busy, setBusy] = useState(false);
    const [confirmNegotiationOpen, setConfirmNegotiationOpen] = useState(false);
    const [negotiationWindowSec, setNegotiationWindowSec] = useState(null);
    /** Keep latest coords without re-creating `load` (avoids full reload when geo updates). */
    const coordsRef = useRef({ lat: DEFAULT_LAT, lon: DEFAULT_LON });

    const load = useCallback(async (options = {}) => {
        const silent = options.silent === true;
        if (!token || !jobId) return;
        if (!silent) {
            setLoading(true);
        }
        if (!silent) {
            setError(null);
        }
        try {
            const { lat, lon } = coordsRef.current;
            const data = await getJobById(token, jobId, { lat, lon });
            setJob(normalizeJobPayload(data));
            if (silent) {
                setActionError(null);
            }
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Failed to load job.';
            if (silent) {
                setActionError(msg);
            } else {
                setError(msg);
                setJob(null);
            }
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    }, [token, jobId]);

    useEffect(() => {
        setJob(null);
        setError(null);
        setActionError(null);
    }, [jobId]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                coordsRef.current = {
                    lat: pos.coords.latitude,
                    lon: pos.coords.longitude,
                };
                load({ silent: true });
            },
            () => {},
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
        );
    }, [load]);

    async function handleExpressInterest() {
        if (!token || !jobId) return;
        setBusy(true);
        setActionError(null);
        try {
            const patchJson = await patchJobInterested(token, jobId, true);
            setJob((prev) => mergeJobInterestFromPatchResponse(prev, patchJson));
        } catch (e) {
            setActionError(e instanceof Error ? e.message : 'Could not update interest.');
        } finally {
            setBusy(false);
        }
    }

    async function handleWithdrawInterest() {
        if (!token || !jobId) return;
        setBusy(true);
        setActionError(null);
        try {
            const patchJson = await patchJobInterested(token, jobId, false);
            setJob((prev) => mergeJobInterestFromPatchResponse(prev, patchJson));
        } catch (e) {
            setActionError(e instanceof Error ? e.message : 'Could not withdraw interest.');
        } finally {
            setBusy(false);
        }
    }

    async function openConfirmNegotiation() {
        if (!token) return;
        setConfirmNegotiationOpen(true);
        setNegotiationWindowSec(null);
        try {
            const w = await getNegotiationWindowSeconds(token);
            setNegotiationWindowSec(w.negotiation_window_seconds);
        } catch {
            setNegotiationWindowSec(900);
        }
    }

    async function handleStartNegotiation() {
        if (!token || !job?.interest?.user_interest_id) return;
        setBusy(true);
        setActionError(null);
        try {
            const created = await startNegotiation(token, job.interest.user_interest_id);
            applyNegotiationPayload(created);
            setConfirmNegotiationOpen(false);
            await refreshNegotiation();
            navigate('/talent/negotiations');
        } catch (e) {
            setActionError(e instanceof Error ? e.message : 'Could not start negotiation.');
        } finally {
            setBusy(false);
        }
    }

    const title = job?.position_type?.name ?? 'Job';
    const clinic = job?.business?.business_name ?? 'Practice';
    const address = job?.business?.postal_address ?? '';
    const salary =
        job != null ? `$${job.salary_min}–${job.salary_max}/hr` : '';
    const shift =
        job != null ? formatShiftDateTimeRange(job.start_time, job.end_time) : '';
    const dist =
        job?.distance != null && typeof job.distance === 'number'
            ? `${job.distance.toFixed(1)} km`
            : null;
    const eta =
        job?.eta != null && typeof job.eta === 'number' ? `${job.eta} min` : null;

    const interest = job?.interest ?? EMPTY_INTEREST;
    const currentAccountId = Number(parseJwtPayload(token)?.id ?? 0);
    const isCurrentUserWorker =
        Number.isInteger(currentAccountId) &&
        currentAccountId > 0 &&
        Number(job?.worker?.id ?? 0) === currentAccountId;
    const open = job?.status === 'open';
    const pendingNeg = job?.negotiation_pending_id != null;
    const hasUserInterest = Boolean(interest?.user_expressed);
    const hasBusinessInterest = Boolean(interest?.business_expressed);
    const isMutual = Boolean(interest?.mutual);

    let actionTitle = 'Action';
    let actionText = 'Choose how you want to respond to this posting.';
    let actionLabel = null;
    let actionVariant = 'talent-job-detail__btn--primary';
    let actionHandler = null;

    if (!open) {
        actionTitle = 'Status';
        if (job?.status === 'filled' && isCurrentUserWorker) {
            actionText = 'You already took this job.';
        } else {
            actionText = `This job is ${job?.status ?? 'closed'} and is not accepting new interest.`;
        }
    } else if (pendingNeg) {
        actionTitle = 'Negotiation';
        actionText = 'You have an active negotiation for this job.';
        actionLabel = 'Open negotiations';
        actionHandler = () => navigate('/talent/negotiations');
    } else if (isMutual) {
        actionTitle = 'Matched';
        actionText = 'You and this practice matched. Start negotiation to agree on terms.';
        actionLabel = 'Start negotiation';
        actionHandler = openConfirmNegotiation;
    } else if (hasBusinessInterest && !hasUserInterest) {
        actionTitle = 'Interested in you';
        actionText =
            'This practice expressed interest in you. Accept by showing your interest back.';
        actionLabel = 'Accept interest';
        actionHandler = handleExpressInterest;
    } else if (hasUserInterest) {
        actionTitle = 'Interest expressed';
        actionText = 'You’ve shown interest in this role. You can withdraw anytime.';
        actionLabel = 'Withdraw interest';
        actionVariant = 'talent-job-detail__btn--ghost';
        actionHandler = handleWithdrawInterest;
    } else {
        actionTitle = 'Interested?';
        actionText = 'Express interest to let this practice know you want this job.';
        actionLabel = 'Express interest';
        actionHandler = handleExpressInterest;
    }

    let actionBusyLabel = 'Updating…';
    if (actionLabel === 'Start negotiation') {
        actionBusyLabel = 'Starting…';
    } else if (actionLabel === 'Express interest' || actionLabel === 'Accept interest') {
        actionBusyLabel = 'Saving…';
    }

    return (
        <div className="business-job-postings business-job-postings--browse talent-job-detail">
            <header className="business-jobs-browse__hero">
                <div className="business-jobs-browse__hero-inner">
                    <div className="business-jobs-browse__hero-text talent-job-detail__hero-text">
                        <button
                            type="button"
                            className="talent-job-detail__back"
                            onClick={() => navigate(-1)}
                        >
                            ← Back
                        </button>
                        <h1 className="business-jobs-browse__title">{loading ? '…' : title}</h1>
                        <p className="business-jobs-browse__subtitle">
                            {address ? `${clinic} · ${address}` : clinic}
                        </p>
                    </div>
                </div>
            </header>

            <div className="business-jobs-browse__content">
                <div className="talent-job-detail__tabs" role="tablist">
                    <span className="talent-job-detail__tab talent-job-detail__tab--active" role="tab" aria-selected>
                        Description
                    </span>
                </div>

                {error ? (
                    <p className="talent-jobs__error" role="alert">
                        {error}
                    </p>
                ) : null}

                {loading ? <p className="talent-jobs__loading">Loading…</p> : null}

                {!loading && job ? (
                    <div className="talent-job-detail__layout">
                        <div className="talent-job-detail__main">
                            <section className="talent-job-detail__card">
                                <h2 className="talent-job-detail__card-title">Role &amp; requirements</h2>
                                <p className="talent-job-detail__meta-muted">
                                    Position type:{' '}
                                    <strong>{job.position_type?.name ?? '-'}</strong>
                                </p>
                                <p className="talent-job-detail__body-text">
                                    {job.position_type?.description?.trim()
                                        ? job.position_type.description
                                        : 'No extended requirements text for this role type. Approved qualifications for this position type are required to apply from search, unless the practice has already reached out to you.'}
                                </p>
                            </section>
                            <section className="talent-job-detail__card">
                                <h2 className="talent-job-detail__card-title">Shift &amp; pay</h2>
                                <p className="talent-job-detail__meta">
                                    <strong>{salary}</strong>
                                    <span className="talent-job-detail__meta-sep"> · </span>
                                    {shift}
                                </p>
                                {dist || eta ? (
                                    <p className="talent-job-detail__meta-muted">
                                        <i className="fas fa-map-marker-alt" aria-hidden /> {dist}
                                        {dist && eta ? ' · ' : ''}
                                        {eta}
                                    </p>
                                ) : null}
                            </section>
                            <section className="talent-job-detail__card">
                                <h2 className="talent-job-detail__card-title">Description</h2>
                                <p className="talent-job-detail__body-text">
                                    {job.note?.trim()
                                        ? job.note
                                        : 'No additional description for this posting.'}
                                </p>
                            </section>
                        </div>

                        <aside className="talent-job-detail__rail" aria-label="Actions">
                            {actionError ? (
                                <p className="talent-job-detail__action-error" role="alert">
                                    {actionError}
                                </p>
                            ) : null}

                            <section className="talent-job-detail__rail-card talent-job-detail__rail-card--muted">
                                <h3 className="talent-job-detail__rail-title">{clinic}</h3>
                                <p className="talent-job-detail__rail-text">
                                    {address || 'Location on file with the practice.'}
                                </p>
                                {job.business?.id ? (
                                    <Link
                                        to={`/talent/businesses/${job.business.id}`}
                                        className="talent-job-detail__btn talent-job-detail__btn--outline"
                                    >
                                        View practice
                                    </Link>
                                ) : null}
                                <div className="talent-job-detail__rail-action">
                                    <h4 className="talent-job-detail__rail-action-title">{actionTitle}</h4>
                                    <p className="talent-job-detail__rail-text">{actionText}</p>
                                    {actionLabel && actionHandler ? (
                                        <button
                                            type="button"
                                            className={`talent-job-detail__btn ${actionVariant}`}
                                            disabled={busy}
                                            onClick={actionHandler}
                                        >
                                            {busy ? actionBusyLabel : actionLabel}
                                        </button>
                                    ) : null}
                                </div>
                            </section>
                        </aside>
                    </div>
                ) : null}
            </div>

            {confirmNegotiationOpen ? (
                <div
                    className="profile-modal-backdrop"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="neg-confirm-title"
                    onClick={() => !busy && setConfirmNegotiationOpen(false)}
                >
                    <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="profile-modal__head">
                            <h2 id="neg-confirm-title" className="profile-modal__title">
                                Start negotiation?
                            </h2>
                            <button
                                type="button"
                                className="profile-modal__close"
                                aria-label="Close"
                                disabled={busy}
                                onClick={() => setConfirmNegotiationOpen(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="profile-modal__body">
                            <p className="talent-job-detail__rail-text" style={{ marginTop: 0 }}>
                                You can only have <strong>one active negotiation</strong> at a time. Once you start, you
                                and the practice will have{' '}
                                <strong>
                                    {negotiationWindowSec != null
                                        ? `${Math.max(1, Math.round(negotiationWindowSec / 60))} minutes`
                                        : '…'}
                                </strong>{' '}
                                (or the time set by the administrator) to both accept. If the timer runs out or someone
                                rejects, the negotiation ends.
                            </p>
                            <div className="business-stack" style={{ marginTop: '1rem' }}>
                                <button
                                    type="button"
                                    className="talent-job-detail__btn talent-job-detail__btn--ghost"
                                    disabled={busy}
                                    onClick={() => setConfirmNegotiationOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="talent-job-detail__btn talent-job-detail__btn--primary"
                                    disabled={busy}
                                    onClick={handleStartNegotiation}
                                >
                                    {busy ? 'Starting…' : 'Start negotiation'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
