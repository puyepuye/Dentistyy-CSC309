import { useCallback, useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import { assetUrl, getJobCandidateDetail, patchJobCandidateInterested, startNegotiation } from '../../../lib/api.js';
import { isJobPeopleTabDisabled } from '../../../lib/businessJobStatus.js';

/**
 * Slide-out preview for one candidate on a job (GET /jobs/:jobId/candidates/:userId).
 * @param {object} [props.interestContext] — merged row from Manage tab: mutual, talent_interested, practice_interested, negotiation_*, interest_id
 */
export default function BusinessCandidatePreviewDrawer({
    jobId,
    candidateAccountId,
    onClose,
    jobLabel,
    interestContext,
    onUpdated,
}) {
    const { token } = useAuth();
    const titleId = useId();
    const open =
        candidateAccountId != null && Number.isInteger(candidateAccountId) && candidateAccountId > 0;

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        if (!open || !token || !Number.isInteger(jobId) || jobId < 1) return;
        setLoading(true);
        setError(null);
        try {
            const res = await getJobCandidateDetail(token, jobId, candidateAccountId);
            setData(res);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not load candidate');
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [open, token, jobId, candidateAccountId]);

    useEffect(() => {
        if (!open) {
            setData(null);
            setError(null);
            return;
        }
        load();
    }, [open, load]);

    useEffect(() => {
        if (!open) return undefined;
        function onKey(e) {
            if (e.key === 'Escape') onClose();
        }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    useEffect(() => {
        if (!open) return undefined;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [open]);

    async function togglePracticeInterest(nextInterested) {
        if (!token || !open) return;
        setBusy(true);
        try {
            await patchJobCandidateInterested(token, jobId, candidateAccountId, nextInterested);
            await load();
            onUpdated?.();
        } catch (e) {
            window.alert(e instanceof Error ? e.message : 'Could not update interest.');
        } finally {
            setBusy(false);
        }
    }

    async function handleNegotiate() {
        const iid = interestContext?.interest_id;
        if (!token || !iid) return;
        setBusy(true);
        try {
            await startNegotiation(token, iid);
            onUpdated?.();
            window.alert('Negotiation started. Open Negotiations in the sidebar to review and respond.');
            onClose();
        } catch (e) {
            window.alert(e instanceof Error ? e.message : 'Could not start negotiation.');
        } finally {
            setBusy(false);
        }
    }

    if (!open || typeof document === 'undefined') return null;

    const u = data?.user;
    const job = data?.job;
    const now = new Date();
    const jobBlocksInterest =
        !job || job.status !== 'open' || now >= new Date(job.start_time);
    const invited = !!data?.business_expressed_interest;
    const q = u?.qualification;
    const docHref = assetUrl(q?.document);
    const resumeHref = assetUrl(u?.resume);
    const avatarSrc = assetUrl(u?.avatar);

    const ctx = interestContext;
    const mutual = ctx?.mutual === true;
    const talentInterested = ctx?.talent_interested === true;
    const practiceInterested = ctx?.practice_interested === true;
    const negotiationAllowed = ctx?.negotiation_allowed === true;
    const negotiationReason = ctx?.negotiation_block_reason;

    const practiceOnly = practiceInterested && !talentInterested;
    const talentOnly = talentInterested && !practiceInterested;

    /** Filled/completed jobs: profile only — no interest or negotiation UI. */
    const hiringClosed = job != null && isJobPeopleTabDisabled(job.status);

    return createPortal(
        <div className="business-candidates-drawer-root" role="presentation">
            <button
                type="button"
                className="business-candidates-drawer__backdrop"
                aria-label="Close candidate preview"
                onClick={onClose}
            />
            <aside
                className="business-candidates-drawer business-candidates-drawer--preview"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
            >
                <header className="business-candidates-drawer__header">
                    <div>
                        <h2 className="business-candidates-drawer__title" id={titleId}>
                            {hiringClosed ? 'Worker profile' : 'Candidate preview'}
                        </h2>
                        {jobLabel ? <p className="business-candidates-drawer__subtitle">{jobLabel}</p> : null}
                    </div>
                    <button type="button" className="business-candidates-drawer__close" onClick={onClose} aria-label="Close">
                        <i className="fas fa-times" aria-hidden />
                    </button>
                </header>

                <div className="business-candidate-preview-drawer__body">
                    {error ? (
                        <p className="talent-profile__error" role="alert">
                            {error}
                        </p>
                    ) : null}
                    {loading ? <p className="talent-profile__loading">Loading…</p> : null}

                    {!loading && !error && data && u ? (
                        <>
                            <div className="business-candidate-preview-drawer__hero">
                                <div className="business-candidate-preview-drawer__avatar" aria-hidden>
                                    {avatarSrc ? (
                                        <img src={avatarSrc} alt="" />
                                    ) : (
                                        <i className="fas fa-user" />
                                    )}
                                </div>
                                <div className="business-candidate-preview-drawer__hero-text">
                                    <p className="business-candidate-preview-drawer__name">
                                        {u.first_name} {u.last_name}
                                    </p>
                                    {ctx ? (
                                        <p className="business-candidate-preview-drawer__meta">
                                            Talent: {talentInterested ? 'Yes' : 'No'} · Practice:{' '}
                                            {practiceInterested ? 'Yes' : 'No'} · Mutual: {mutual ? 'Yes' : 'No'}
                                        </p>
                                    ) : null}
                                </div>
                            </div>

                            {u.biography?.trim() ? (
                                <section className="business-candidate-preview-drawer__block">
                                    <h3 className="business-candidate-preview-drawer__block-title">Biography</h3>
                                    <p className="business-candidate-preview-drawer__bio">{u.biography}</p>
                                </section>
                            ) : null}

                            <section className="business-candidate-preview-drawer__block">
                                <h3 className="business-candidate-preview-drawer__block-title">Qualification</h3>
                                <p className="business-candidate-preview-drawer__muted">
                                    {q?.note?.trim() ? q.note : '—'}
                                </p>
                                {docHref ? (
                                    <a
                                        href={docHref}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="talent-bio__resume-link business-candidate-preview-drawer__inline-link"
                                    >
                                        Open qualification document
                                    </a>
                                ) : (
                                    <p className="business-candidate-preview-drawer__muted">No document on file.</p>
                                )}
                            </section>

                            <section className="business-candidate-preview-drawer__block">
                                <h3 className="business-candidate-preview-drawer__block-title">Resume</h3>
                                {resumeHref ? (
                                    <a
                                        href={resumeHref}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="talent-bio__resume-link business-candidate-preview-drawer__inline-link"
                                    >
                                        Open resume
                                    </a>
                                ) : (
                                    <p className="business-candidate-preview-drawer__muted">No resume uploaded.</p>
                                )}
                            </section>

                            {!hiringClosed ? (
                                <p className="business-card__hint business-candidate-preview-drawer__hint">
                                    {invited
                                        ? 'You have expressed practice interest in this candidate for this job.'
                                        : 'You have not expressed practice interest yet.'}
                                </p>
                            ) : null}
                        </>
                    ) : null}
                </div>

                {!loading && !error && data && u && !hiringClosed ? (
                <footer className="business-candidate-preview-drawer__footer">
                    <div className="business-candidate-preview-drawer__actions">
                        {mutual && ctx ? (
                            <>
                                <button
                                    type="button"
                                    className="business-btn business-btn--primary"
                                    disabled={busy || !negotiationAllowed || !ctx.interest_id}
                                    onClick={handleNegotiate}
                                >
                                    Start negotiation
                                </button>
                                {!negotiationAllowed && negotiationReason ? (
                                    <p className="business-interest-user__note">{negotiationReason}</p>
                                ) : null}
                                <button
                                    type="button"
                                    className="business-btn business-btn--ghost"
                                    disabled={busy || jobBlocksInterest}
                                    onClick={() => togglePracticeInterest(false)}
                                >
                                    Withdraw practice interest
                                </button>
                            </>
                        ) : practiceOnly ? (
                            <button
                                type="button"
                                className="business-btn business-btn--ghost"
                                disabled={busy || jobBlocksInterest}
                                onClick={() => togglePracticeInterest(false)}
                            >
                                Withdraw practice interest
                            </button>
                        ) : talentOnly ? (
                            <>
                                <button
                                    type="button"
                                    className="business-btn business-btn--primary"
                                    disabled={busy || jobBlocksInterest || invited}
                                    onClick={() => togglePracticeInterest(true)}
                                    title={
                                        jobBlocksInterest
                                            ? 'Interest can only be changed while the job is open and before shift start.'
                                            : undefined
                                    }
                                >
                                    Express interest back
                                </button>
                                {negotiationReason ? (
                                    <p className="business-interest-user__note">{negotiationReason}</p>
                                ) : null}
                            </>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    className="business-btn business-btn--primary"
                                    disabled={busy || jobBlocksInterest || invited}
                                    onClick={() => togglePracticeInterest(true)}
                                    title={
                                        jobBlocksInterest
                                            ? 'Interest can only be changed while the job is open and before shift start.'
                                            : undefined
                                    }
                                >
                                    Express interest back
                                </button>
                                {invited ? (
                                    <button
                                        type="button"
                                        className="business-btn business-btn--ghost"
                                        disabled={busy || jobBlocksInterest}
                                        onClick={() => togglePracticeInterest(false)}
                                    >
                                        Withdraw practice interest
                                    </button>
                                ) : null}
                                {negotiationReason ? (
                                    <p className="business-interest-user__note">{negotiationReason}</p>
                                ) : null}
                            </>
                        )}
                    </div>
                </footer>
                ) : null}
            </aside>
        </div>,
        document.body
    );
}
