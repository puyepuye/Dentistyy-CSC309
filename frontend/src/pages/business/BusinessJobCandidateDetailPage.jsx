import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import {
    assetUrl,
    getJobCandidateDetail,
    getJobCandidates,
    patchJobCandidateInterested,
} from '../../lib/api.js';

export default function BusinessJobCandidateDetailPage() {
    const { jobId, userId } = useParams();
    const jid = Number(jobId);
    const uid = Number(userId);
    const { token } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);
    const [invited, setInvited] = useState(false);

    const load = useCallback(async () => {
        if (!token || !Number.isInteger(jid) || jid < 1 || !Number.isInteger(uid) || uid < 1) return;
        setLoading(true);
        setError(null);
        try {
            const res = await getJobCandidateDetail(token, jid, uid);
            setData(res);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not load candidate');
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [token, jid, uid]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        if (!token || !Number.isInteger(jid) || jid < 1 || !Number.isInteger(uid) || uid < 1) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await getJobCandidates(token, jid, { page: '1', limit: '500' });
                const row = (res.results || []).find((r) => r.id === uid);
                if (!cancelled) setInvited(!!row?.invited);
            } catch {
                if (!cancelled) setInvited(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [token, jid, uid, data]);

    async function toggleInterest() {
        if (!token) return;
        setBusy(true);
        try {
            await patchJobCandidateInterested(token, jid, uid, !invited);
            setInvited(!invited);
        } catch (e) {
            window.alert(e instanceof Error ? e.message : 'Could not update interest.');
        } finally {
            setBusy(false);
        }
    }

    if (!Number.isInteger(jid) || jid < 1 || !Number.isInteger(uid) || uid < 1) {
        return (
            <section className="talent-card">
                <p className="talent-profile__error">Invalid link.</p>
            </section>
        );
    }

    if (loading) {
        return (
            <section className="talent-card">
                <p className="talent-profile__loading">Loading candidate…</p>
            </section>
        );
    }

    if (error || !data) {
        return (
            <section className="talent-card">
                <p className="talent-profile__error" role="alert">
                    {error || 'Not found.'}
                </p>
                <Link to={`/businesses/jobs/${jid}/candidates`} className="business-btn business-btn--ghost">
                    Back to list
                </Link>
            </section>
        );
    }

    const u = data.user;
    const q = u.qualification;
    const docHref = assetUrl(q?.document);
    const resumeHref = assetUrl(u.resume);
    const avatarSrc = assetUrl(u.avatar);

    return (
        <>
            <section className="talent-card">
                <div className="talent-card__head">
                    <h2 className="talent-card__title">
                        {u.first_name} {u.last_name}
                    </h2>
                    <Link to={`/businesses/jobs/${jid}/candidates`} className="talent-card__action">
                        <span>Back</span>
                        <i className="fas fa-arrow-left" aria-hidden />
                    </Link>
                </div>
                <div className="talent-profile-personal">
                    <div className="talent-avatar" aria-hidden>
                        {avatarSrc ? (
                            <img className="talent-avatar__img" src={avatarSrc} alt="" />
                        ) : (
                            <div className="talent-avatar__placeholder" />
                        )}
                    </div>
                    <div className="talent-field-grid">
                        {u.email ? (
                            <div>
                                <span className="talent-field__label">Email</span>
                                <p className="talent-field__value">{u.email}</p>
                            </div>
                        ) : null}
                        {u.phone_number ? (
                            <div>
                                <span className="talent-field__label">Phone</span>
                                <p className="talent-field__value">{u.phone_number}</p>
                            </div>
                        ) : null}
                    </div>
                </div>
                <div className="business-stack">
                    <button
                        type="button"
                        className="business-btn business-btn--primary"
                        disabled={busy}
                        onClick={toggleInterest}
                    >
                        {invited ? 'Withdraw practice interest' : 'Express interest'}
                    </button>
                    <Link to={`/businesses/jobs/${jid}/interests`} className="business-btn business-btn--ghost">
                        View mutual interest & negotiate
                    </Link>
                </div>
            </section>

            <section className="talent-card">
                <h3 className="talent-card__title">Biography</h3>
                <p className="talent-bio__body">{u.biography?.trim() ? u.biography : '—'}</p>
            </section>

            <section className="talent-card">
                <h3 className="talent-card__title">Qualification</h3>
                <p className="talent-field__value">{q?.note?.trim() ? q.note : '—'}</p>
                <p className="business-card__hint" style={{ marginTop: '0.75rem' }}>
                    Document
                </p>
                {docHref ? (
                    <a
                        href={docHref}
                        target="_blank"
                        rel="noreferrer"
                        className="talent-bio__resume-link"
                    >
                        Open qualification document
                    </a>
                ) : (
                    <span className="talent-bio__resume-missing">No document on file.</span>
                )}
            </section>

            <section className="talent-card">
                <h3 className="talent-card__title">Resume</h3>
                {resumeHref ? (
                    <a
                        href={resumeHref}
                        target="_blank"
                        rel="noreferrer"
                        className="talent-bio__resume-link"
                    >
                        Open resume
                    </a>
                ) : (
                    <span className="talent-bio__resume-missing">No resume uploaded.</span>
                )}
            </section>
        </>
    );
}
