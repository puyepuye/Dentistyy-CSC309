import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import {
    deleteBusinessJob,
    getJobById,
    patchBusinessJob,
    patchJobNoShow,
} from '../../lib/api.js';
import BusinessCandidatePreviewDrawer from '../../components/business/jobs/BusinessCandidatePreviewDrawer.jsx';
import { isJobFilledOrCompleted, isJobPeopleTabDisabled } from '../../lib/businessJobStatus.js';
import { validateBusinessJobDraft } from '../../lib/businessJobValidation.js';

function toLocalDatetimeValue(iso) {
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function statusBadgeClass(status) {
    const s = (status || '').toLowerCase();
    if (s === 'open') return 'business-badge business-badge--open';
    if (s === 'filled') return 'business-badge business-badge--filled';
    return 'business-badge business-badge--muted';
}

export default function BusinessJobDetailPage() {
    const { jobId } = useParams();
    const id = Number(jobId);
    const { token } = useAuth();
    const navigate = useNavigate();
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editBusy, setEditBusy] = useState(false);
    const [editErr, setEditErr] = useState(null);
    const [salaryMin, setSalaryMin] = useState('');
    const [salaryMax, setSalaryMax] = useState('');
    const [startLocal, setStartLocal] = useState('');
    const [endLocal, setEndLocal] = useState('');
    const [note, setNote] = useState('');
    const [editFieldErrors, setEditFieldErrors] = useState({});
    const [workerPreviewAccountId, setWorkerPreviewAccountId] = useState(null);

    function clearEditFieldError(name) {
        setEditFieldErrors((prev) => {
            if (!prev[name]) return prev;
            const next = { ...prev };
            delete next[name];
            return next;
        });
    }
    const load = useCallback(async () => {
        if (!token || !Number.isInteger(id) || id < 1) return;
        setLoading(true);
        setError(null);
        try {
            const j = await getJobById(token, id);
            setJob(j);
            setSalaryMin(String(j.salary_min));
            setSalaryMax(String(j.salary_max));
            setStartLocal(toLocalDatetimeValue(j.start_time));
            setEndLocal(toLocalDatetimeValue(j.end_time));
            setNote(j.note ?? '');
            setEditFieldErrors({});
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load job');
            setJob(null);
        } finally {
            setLoading(false);
        }
    }, [token, id]);

    useEffect(() => {
        load();
    }, [load]);

    const now = new Date();
    const showEditSection =
        job && job.status === 'open' && now < new Date(job.start_time);
    const editBlockedByNegotiation = Boolean(job?.has_pending_negotiation);
    const canNoShow =
        job &&
        job.status === 'filled' &&
        now >= new Date(job.start_time) &&
        now < new Date(job.end_time);
    const canTryDelete = job && (job.status === 'open' || job.status === 'expired');

    async function handleDelete() {
        if (!token || !window.confirm('Delete this posting? This cannot be undone.')) return;
        try {
            await deleteBusinessJob(token, id);
            navigate('/businesses/jobs');
        } catch (e) {
            window.alert(e instanceof Error ? e.message : 'Cannot delete this posting.');
        }
    }

    async function handleNoShow() {
        if (
            !token ||
            !window.confirm(
                'Mark the assigned worker as no-show during this shift? They will be suspended per platform rules.'
            )
        ) {
            return;
        }
        try {
            await patchJobNoShow(token, id);
            await load();
        } catch (e) {
            window.alert(e instanceof Error ? e.message : 'Could not record no-show.');
        }
    }

    async function handleSaveEdit(e) {
        e.preventDefault();
        if (!token) return;
        setEditErr(null);
        const validation = validateBusinessJobDraft({
            salaryMin,
            salaryMax,
            startLocal,
            endLocal,
            note,
        });
        if (validation.hasErrors) {
            setEditFieldErrors(validation.fieldErrors);
            setEditErr('Please fix the highlighted fields and try again.');
            return;
        }
        setEditFieldErrors({});
        setEditBusy(true);
        try {
            await patchBusinessJob(token, id, {
                salary_min: validation.parsed.salaryMin,
                salary_max: validation.parsed.salaryMax,
                start_time: validation.parsed.startIso,
                end_time: validation.parsed.endIso,
                note: validation.parsed.note,
            });
            await load();
        } catch (err) {
            setEditErr(err instanceof Error ? err.message : 'Could not save changes.');
        } finally {
            setEditBusy(false);
        }
    }

    if (!Number.isInteger(id) || id < 1) {
        return (
            <section className="talent-card">
                <p className="talent-profile__error">Invalid job.</p>
            </section>
        );
    }

    if (loading) {
        return (
            <section className="talent-card">
                <p className="talent-profile__loading">Loading job…</p>
            </section>
        );
    }

    if (error || !job) {
        return (
            <section className="talent-card">
                <p className="talent-profile__error" role="alert">
                    {error || 'Job not found.'}
                </p>
                <Link to="/businesses/jobs" className="business-btn business-btn--ghost">
                    Back to postings
                </Link>
            </section>
        );
    }

    return (
        <>
            <section className="talent-card">
                <div className="talent-card__head">
                    <h2 className="talent-card__title">
                        {job.position_type?.name}
                    </h2>
                    <span className={statusBadgeClass(job.status)}>{job.status}</span>
                </div>
                <div className="talent-field-grid">
                    <div>
                        <span className="talent-field__label">Salary</span>
                        <p className="talent-field__value">
                            ${job.salary_min} – ${job.salary_max}
                        </p>
                    </div>
                    <div>
                        <span className="talent-field__label">Start</span>
                        <p className="talent-field__value">{new Date(job.start_time).toLocaleString()}</p>
                    </div>
                    <div>
                        <span className="talent-field__label">End</span>
                        <p className="talent-field__value">{new Date(job.end_time).toLocaleString()}</p>
                    </div>
                    <div>
                        <span className="talent-field__label">
                            {isJobFilledOrCompleted(job.status) ? 'Filled by' : 'Worker'}
                        </span>
                        <p className="talent-field__value">
                            {job.worker ? (
                                isJobFilledOrCompleted(job.status) ? (
                                    <button
                                        type="button"
                                        className="business-text-link-button business-job-detail__filled-by-name-btn"
                                        onClick={() => setWorkerPreviewAccountId(job.worker.id)}
                                        aria-label={`Preview profile: ${job.worker.first_name} ${job.worker.last_name}`}
                                    >
                                        {job.worker.first_name} {job.worker.last_name}
                                    </button>
                                ) : isJobPeopleTabDisabled(job.status) ? (
                                    <>
                                        {job.worker.first_name} {job.worker.last_name}
                                    </>
                                ) : (
                                    <Link to={`/businesses/jobs/${job.id}/candidates?view=manage`}>
                                        {job.worker.first_name} {job.worker.last_name}
                                    </Link>
                                )
                            ) : (
                                '-'
                            )}
                        </p>
                    </div>
                </div>
                <div className="talent-bio__body talent-bio__body--spaced">
                    <span className="talent-field__label">Note</span>
                    <p className="talent-field__value" style={{ marginTop: '0.35rem' }}>
                        {job.note?.trim() ? job.note : '-'}
                    </p>
                </div>
                {canTryDelete || canNoShow ? (
                    <div className="business-stack">
                        {canTryDelete ? (
                            <button type="button" className="business-btn business-btn--danger" onClick={handleDelete}>
                                Delete posting
                            </button>
                        ) : null}
                        {canNoShow ? (
                            <button type="button" className="business-btn business-btn--danger" onClick={handleNoShow}>
                                Mark worker no-show
                            </button>
                        ) : null}
                    </div>
                ) : null}
            </section>

            {showEditSection ? (
                <section
                    className={`talent-card${editBlockedByNegotiation ? ' business-job-edit--negotiation' : ''}`}
                    aria-labelledby="edit-job-heading"
                    aria-disabled={editBlockedByNegotiation ? 'true' : undefined}
                >
                    <h2 className="talent-card__title" id="edit-job-heading">
                        Edit posting
                    </h2>
                    <p className="business-card__hint">
                        Changes are only allowed while the job is open and before the shift start time.
                    </p>
                    {editBlockedByNegotiation ? (
                        <p className="business-job-edit__negotiation-msg" role="status">
                            Job in negotiation cannot be edited.
                        </p>
                    ) : null}
                    <form onSubmit={handleSaveEdit}>
                        {editErr ? (
                            <p className="talent-profile__error" role="alert">
                                {editErr}
                            </p>
                        ) : null}
                        <div className="pm-field-row">
                            <div className="business-filters__field">
                                <label className="business-filters__label" htmlFor="ed-smin">
                                    Salary min
                                </label>
                                <input
                                    id="ed-smin"
                                    className="business-filters__input"
                                    type="number"
                                    min="0"
                                    value={salaryMin}
                                    onChange={(e) => {
                                        setSalaryMin(e.target.value);
                                        clearEditFieldError('salaryMin');
                                        clearEditFieldError('salaryMax');
                                    }}
                                    aria-invalid={editFieldErrors.salaryMin ? 'true' : 'false'}
                                    disabled={editBlockedByNegotiation}
                                    required
                                />
                                {editFieldErrors.salaryMin ? (
                                    <p className="business-form__field-error" role="alert">
                                        {editFieldErrors.salaryMin}
                                    </p>
                                ) : null}
                            </div>
                            <div className="business-filters__field">
                                <label className="business-filters__label" htmlFor="ed-smax">
                                    Salary max
                                </label>
                                <input
                                    id="ed-smax"
                                    className="business-filters__input"
                                    type="number"
                                    min="0"
                                    value={salaryMax}
                                    onChange={(e) => {
                                        setSalaryMax(e.target.value);
                                        clearEditFieldError('salaryMax');
                                    }}
                                    aria-invalid={editFieldErrors.salaryMax ? 'true' : 'false'}
                                    disabled={editBlockedByNegotiation}
                                    required
                                />
                                {editFieldErrors.salaryMax ? (
                                    <p className="business-form__field-error" role="alert">
                                        {editFieldErrors.salaryMax}
                                    </p>
                                ) : null}
                            </div>
                        </div>
                        <div className="pm-field-row">
                            <div className="business-filters__field">
                                <label className="business-filters__label" htmlFor="ed-start">
                                    Start
                                </label>
                                <input
                                    id="ed-start"
                                    className="business-filters__input"
                                    type="datetime-local"
                                    value={startLocal}
                                    onChange={(e) => {
                                        setStartLocal(e.target.value);
                                        clearEditFieldError('startLocal');
                                        clearEditFieldError('endLocal');
                                    }}
                                    aria-invalid={editFieldErrors.startLocal ? 'true' : 'false'}
                                    disabled={editBlockedByNegotiation}
                                    required
                                />
                                {editFieldErrors.startLocal ? (
                                    <p className="business-form__field-error" role="alert">
                                        {editFieldErrors.startLocal}
                                    </p>
                                ) : null}
                            </div>
                            <div className="business-filters__field">
                                <label className="business-filters__label" htmlFor="ed-end">
                                    End
                                </label>
                                <input
                                    id="ed-end"
                                    className="business-filters__input"
                                    type="datetime-local"
                                    value={endLocal}
                                    onChange={(e) => {
                                        setEndLocal(e.target.value);
                                        clearEditFieldError('endLocal');
                                    }}
                                    aria-invalid={editFieldErrors.endLocal ? 'true' : 'false'}
                                    disabled={editBlockedByNegotiation}
                                    required
                                />
                                {editFieldErrors.endLocal ? (
                                    <p className="business-form__field-error" role="alert">
                                        {editFieldErrors.endLocal}
                                    </p>
                                ) : null}
                            </div>
                        </div>
                        <div className="business-filters__field">
                            <label className="business-filters__label" htmlFor="ed-note">
                                Note
                            </label>
                            <textarea
                                id="ed-note"
                                className="pm-field__input pm-field__textarea"
                                rows={3}
                                value={note}
                                onChange={(e) => {
                                    setNote(e.target.value);
                                    clearEditFieldError('note');
                                }}
                                aria-invalid={editFieldErrors.note ? 'true' : 'false'}
                                disabled={editBlockedByNegotiation}
                            />
                            {editFieldErrors.note ? (
                                <p className="business-form__field-error" role="alert">
                                    {editFieldErrors.note}
                                </p>
                            ) : null}
                        </div>
                        <div className="business-stack">
                            <button
                                type="submit"
                                className="business-btn business-btn--primary"
                                disabled={editBusy || editBlockedByNegotiation}
                            >
                                {editBusy ? 'Saving…' : 'Save changes'}
                            </button>
                        </div>
                    </form>
                </section>
            ) : null}

            {isJobFilledOrCompleted(job.status) && job.worker ? (
                <BusinessCandidatePreviewDrawer
                    jobId={id}
                    candidateAccountId={workerPreviewAccountId}
                    onClose={() => setWorkerPreviewAccountId(null)}
                    jobLabel={job.position_type?.name || 'Posting'}
                    interestContext={null}
                />
            ) : null}
        </>
    );
}
