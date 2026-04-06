import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { getJobById, patchJobInterested, startNegotiation } from '../../lib/api.js';

const DEFAULT_LAT = 43.6532;
const DEFAULT_LON = -79.3832;

function formatShiftRange(startIso, endIso) {
    const s = new Date(startIso);
    const e = new Date(endIso);
    const o = { hour: 'numeric', minute: '2-digit' };
    return `${s.toLocaleTimeString(undefined, o)} – ${e.toLocaleTimeString(undefined, o)}`;
}

export default function StaffJobDetailPage() {
    const { jobId } = useParams();
    const navigate = useNavigate();
    const { token } = useAuth();
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionError, setActionError] = useState(null);
    const [busy, setBusy] = useState(false);
    const [lat, setLat] = useState(DEFAULT_LAT);
    const [lon, setLon] = useState(DEFAULT_LON);

    const load = useCallback(async () => {
        if (!token || !jobId) return;
        setLoading(true);
        setError(null);
        try {
            const data = await getJobById(token, jobId, { lat, lon });
            setJob(data);
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Failed to load job.';
            setError(msg);
            setJob(null);
        } finally {
            setLoading(false);
        }
    }, [token, jobId, lat, lon]);

    useEffect(() => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLat(pos.coords.latitude);
                setLon(pos.coords.longitude);
            },
            () => {},
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
        );
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    async function handleExpressInterest() {
        if (!token || !jobId) return;
        setBusy(true);
        setActionError(null);
        try {
            await patchJobInterested(token, jobId, true);
            await load();
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
            await patchJobInterested(token, jobId, false);
            await load();
        } catch (e) {
            setActionError(e instanceof Error ? e.message : 'Could not withdraw interest.');
        } finally {
            setBusy(false);
        }
    }

    async function handleStartNegotiation() {
        if (!token || !job?.interest?.user_interest_id) return;
        setBusy(true);
        setActionError(null);
        try {
            await startNegotiation(token, job.interest.user_interest_id);
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
        job != null ? formatShiftRange(job.start_time, job.end_time) : '';
    const dist =
        job?.distance != null && typeof job.distance === 'number'
            ? `${job.distance.toFixed(1)} km`
            : null;
    const eta =
        job?.eta != null && typeof job.eta === 'number' ? `${job.eta} min` : null;

    const interest = job?.interest;
    const open = job?.status === 'open';
    const pendingNeg = job?.negotiation_pending_id != null;

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

                            {pendingNeg ? (
                                <section className="talent-job-detail__rail-card">
                                    <h3 className="talent-job-detail__rail-title">Negotiation</h3>
                                    <p className="talent-job-detail__rail-text">
                                        You have an active negotiation for this job. Continue on the
                                        Negotiations page.
                                    </p>
                                    <Link to="/talent/negotiations" className="talent-job-detail__btn talent-job-detail__btn--primary">
                                        Open negotiations
                                    </Link>
                                </section>
                            ) : null}

                            {!pendingNeg && open && interest?.mutual ? (
                                <section className="talent-job-detail__rail-card">
                                    <h3 className="talent-job-detail__rail-title">Matched</h3>
                                    <p className="talent-job-detail__rail-text">
                                        You and the practice both expressed interest. Start a timed
                                        negotiation to agree on terms.
                                    </p>
                                    <button
                                        type="button"
                                        className="talent-job-detail__btn talent-job-detail__btn--primary"
                                        disabled={busy}
                                        onClick={handleStartNegotiation}
                                    >
                                        {busy ? 'Starting…' : 'Start negotiation'}
                                    </button>
                                </section>
                            ) : null}

                            {!pendingNeg &&
                            open &&
                            interest &&
                            !interest.mutual &&
                            interest.user_expressed ? (
                                <section className="talent-job-detail__rail-card">
                                    <h3 className="talent-job-detail__rail-title">Interest sent</h3>
                                    <p className="talent-job-detail__rail-text">
                                        Waiting on the practice. You can withdraw your interest
                                        anytime.
                                    </p>
                                    <button
                                        type="button"
                                        className="talent-job-detail__btn talent-job-detail__btn--ghost"
                                        disabled={busy}
                                        onClick={handleWithdrawInterest}
                                    >
                                        {busy ? 'Updating…' : 'Withdraw interest'}
                                    </button>
                                </section>
                            ) : null}

                            {!pendingNeg &&
                            open &&
                            interest &&
                            !interest.mutual &&
                            interest.business_expressed &&
                            !interest.user_expressed ? (
                                <section className="talent-job-detail__rail-card">
                                    <h3 className="talent-job-detail__rail-title">Interested in you</h3>
                                    <p className="talent-job-detail__rail-text">
                                        This practice expressed interest in you for this role.
                                    </p>
                                    <button
                                        type="button"
                                        className="talent-job-detail__btn talent-job-detail__btn--primary"
                                        disabled={busy}
                                        onClick={handleExpressInterest}
                                    >
                                        {busy ? 'Saving…' : 'Express interest'}
                                    </button>
                                </section>
                            ) : null}

                            {!pendingNeg &&
                            open &&
                            interest &&
                            !interest.mutual &&
                            !interest.user_expressed &&
                            !interest.business_expressed ? (
                                <section className="talent-job-detail__rail-card">
                                    <h3 className="talent-job-detail__rail-title">Interested?</h3>
                                    <p className="talent-job-detail__rail-text">
                                        Let the practice know you want to be considered.
                                    </p>
                                    <button
                                        type="button"
                                        className="talent-job-detail__btn talent-job-detail__btn--primary"
                                        disabled={busy}
                                        onClick={handleExpressInterest}
                                    >
                                        {busy ? 'Saving…' : 'Express interest'}
                                    </button>
                                </section>
                            ) : null}

                            {!open ? (
                                <section className="talent-job-detail__rail-card">
                                    <h3 className="talent-job-detail__rail-title">Status</h3>
                                    <p className="talent-job-detail__rail-text">
                                        This job is <strong>{job.status}</strong> and is not accepting
                                        new interest.
                                    </p>
                                </section>
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
                            </section>
                        </aside>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
