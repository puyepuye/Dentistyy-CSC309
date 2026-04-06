import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useBusinessProfile } from '../../contexts/BusinessProfileContext.jsx';
import { createBusinessJob, getPositionTypes } from '../../lib/api.js';

function toLocalDatetimeValue(d) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function BusinessJobNewPage() {
    const { token } = useAuth();
    const { profile } = useBusinessProfile();
    const navigate = useNavigate();
    const [positionTypes, setPositionTypes] = useState([]);
    const [positionTypeId, setPositionTypeId] = useState('');
    const [salaryMin, setSalaryMin] = useState('');
    const [salaryMax, setSalaryMax] = useState('');
    const [startLocal, setStartLocal] = useState('');
    const [endLocal, setEndLocal] = useState('');
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!token) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await getPositionTypes(token, { limit: '200', page: '1' });
                if (!cancelled) {
                    const list = res.results || [];
                    setPositionTypes(list);
                    if (list.length && !positionTypeId) {
                        setPositionTypeId(String(list[0].id));
                    }
                }
            } catch {
                if (!cancelled) setPositionTypes([]);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [token]);

    useEffect(() => {
        const now = new Date();
        const start = new Date(now.getTime() + 2 * 60 * 60 * 1000);
        const end = new Date(start.getTime() + 4 * 60 * 60 * 1000);
        setStartLocal(toLocalDatetimeValue(start));
        setEndLocal(toLocalDatetimeValue(end));
    }, []);

    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);
        if (!token || !profile?.verified) return;
        const pt = Number(positionTypeId);
        const smin = Number(salaryMin);
        const smax = Number(salaryMax);
        if (!Number.isInteger(pt) || pt < 1) {
            setError('Choose a position type.');
            return;
        }
        if (Number.isNaN(smin) || smin < 0 || Number.isNaN(smax) || smax < smin) {
            setError('Enter a valid salary range.');
            return;
        }
        const startIso = new Date(startLocal).toISOString();
        const endIso = new Date(endLocal).toISOString();
        setSubmitting(true);
        try {
            const created = await createBusinessJob(token, {
                position_type_id: pt,
                salary_min: smin,
                salary_max: smax,
                start_time: startIso,
                end_time: endIso,
                note,
            });
            navigate(`/businesses/jobs/${created.id}`, { replace: true });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not create posting.');
        } finally {
            setSubmitting(false);
        }
    }

    if (!profile?.verified) {
        return (
            <div className="talent-profile">
                <section className="talent-card">
                    <h2 className="talent-card__title">New job posting</h2>
                    <p className="talent-profile__error" role="alert">
                        Verified practices can create postings. Your account is not verified yet.
                    </p>
                    <Link to="/businesses/jobs" className="business-btn business-btn--ghost">
                        Back to postings
                    </Link>
                </section>
            </div>
        );
    }

    return (
        <div className="talent-profile">
            <section className="talent-card">
                <div className="talent-card__head">
                    <h2 className="talent-card__title">New job posting</h2>
                    <Link to="/businesses/jobs" className="talent-card__action">
                        <span>Cancel</span>
                        <i className="fas fa-times" aria-hidden />
                    </Link>
                </div>
                <form onSubmit={handleSubmit} className="business-job-form">
                    {error ? (
                        <p className="talent-profile__error" role="alert">
                            {error}
                        </p>
                    ) : null}
                    <div className="business-filters__field">
                        <label className="business-filters__label" htmlFor="job-pos-type">
                            Position type
                        </label>
                        <select
                            id="job-pos-type"
                            className="business-filters__select"
                            value={positionTypeId}
                            onChange={(e) => setPositionTypeId(e.target.value)}
                            required
                        >
                            {positionTypes.map((pt) => (
                                <option key={pt.id} value={String(pt.id)}>
                                    {pt.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="pm-field-row">
                        <div className="business-filters__field">
                            <label className="business-filters__label" htmlFor="job-smin">
                                Salary min ($)
                            </label>
                            <input
                                id="job-smin"
                                className="business-filters__input"
                                type="number"
                                min="0"
                                step="1"
                                value={salaryMin}
                                onChange={(e) => setSalaryMin(e.target.value)}
                                required
                            />
                        </div>
                        <div className="business-filters__field">
                            <label className="business-filters__label" htmlFor="job-smax">
                                Salary max ($)
                            </label>
                            <input
                                id="job-smax"
                                className="business-filters__input"
                                type="number"
                                min="0"
                                step="1"
                                value={salaryMax}
                                onChange={(e) => setSalaryMax(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    <div className="pm-field-row">
                        <div className="business-filters__field">
                            <label className="business-filters__label" htmlFor="job-start">
                                Shift start
                            </label>
                            <input
                                id="job-start"
                                className="business-filters__input"
                                type="datetime-local"
                                value={startLocal}
                                onChange={(e) => setStartLocal(e.target.value)}
                                required
                            />
                        </div>
                        <div className="business-filters__field">
                            <label className="business-filters__label" htmlFor="job-end">
                                Shift end
                            </label>
                            <input
                                id="job-end"
                                className="business-filters__input"
                                type="datetime-local"
                                value={endLocal}
                                onChange={(e) => setEndLocal(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    <div className="business-filters__field">
                        <label className="business-filters__label" htmlFor="job-note">
                            Note
                        </label>
                        <textarea
                            id="job-note"
                            className="pm-field__input pm-field__textarea"
                            rows={4}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                        />
                    </div>
                    <div className="business-stack">
                        <button
                            type="submit"
                            className="business-btn business-btn--primary"
                            disabled={submitting}
                        >
                            {submitting ? 'Creating…' : 'Create posting'}
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
}
