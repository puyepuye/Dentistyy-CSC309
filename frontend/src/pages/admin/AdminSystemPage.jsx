import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import {
    getSystemConfig,
    patchSystemAvailabilityTimeout,
    patchSystemJobStartWindow,
    patchSystemNegotiationWindow,
    patchSystemResetCooldown,
} from '../../lib/api.js';

const KEYS = ['reset_cooldown', 'negotiation_window', 'job_start_window', 'availability_timeout'];

/** Mirrors backend/src/config/runtimeSystem.js initial values (same unit as the input). */
function formatDefaultLine(value, unit) {
    const n = Number(value).toLocaleString();
    if (unit === 'hours') {
        const word = value === 1 ? 'hour' : 'hours';
        return `Default: ${n} ${word}`;
    }
    const word = value === 1 ? 'second' : 'seconds';
    return `Default: ${n} ${word}`;
}

const CARDS = [
    {
        key: 'reset_cooldown',
        title: 'Reset cooldown',
        description:
            'Minimum time between password-reset requests from the same IP address. Set to 0 to disable throttling.',
        unit: 'seconds',
        defaultValue: 60,
        min: 0,
        step: 1,
    },
    {
        key: 'negotiation_window',
        title: 'Negotiation window',
        description: 'How long an active negotiation session remains valid before it expires.',
        unit: 'seconds',
        defaultValue: 900,
        min: 1,
        step: 1,
    },
    {
        key: 'job_start_window',
        title: 'Job start window',
        description: 'How far in advance a job may be scheduled (maximum lead time for start times).',
        unit: 'hours',
        defaultValue: 24 * 7,
        min: 1,
        step: 1,
    },
    {
        key: 'availability_timeout',
        title: 'Availability timeout',
        description:
            'How long a user is considered “recently active” for discovery and negotiation eligibility.',
        unit: 'seconds',
        defaultValue: 300,
        min: 1,
        step: 1,
    },
];

function parsePositiveInt(raw, min) {
    const n = Number.parseInt(String(raw).trim(), 10);
    if (!Number.isFinite(n)) return null;
    if (n < min) return null;
    return n;
}

export default function AdminSystemPage() {
    const { token } = useAuth();
    const [config, setConfig] = useState(null);
    const [draft, setDraft] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [savingKey, setSavingKey] = useState(null);
    const [confirmSave, setConfirmSave] = useState(null);
    const confirmRef = useRef(null);

    const load = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const data = await getSystemConfig(token);
            const next = {};
            for (const k of KEYS) {
                next[k] = data[k] ?? '';
            }
            setConfig(data);
            setDraft(next);
        } catch (e) {
            setError(e?.message || 'Could not load system configuration.');
            setConfig(null);
            setDraft({});
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        load();
    }, [load]);

    const dirtyByKey = useMemo(() => {
        const out = {};
        if (!config) return out;
        for (const k of KEYS) {
            const cur = config[k];
            const d = parsePositiveInt(draft[k], k === 'reset_cooldown' ? 0 : 1);
            out[k] = d !== null && d !== cur;
        }
        return out;
    }, [config, draft]);

    function handleRequestSave(key) {
        const meta = CARDS.find((c) => c.key === key);
        const min = meta?.min ?? 1;
        const value = parsePositiveInt(draft[key], min);
        if (value === null) {
            setError('Enter a valid number that meets the minimum for this setting.');
            return;
        }
        setError(null);
        setConfirmSave({
            key,
            value,
            title: meta?.title ?? key,
            unit: meta?.unit ?? '',
        });
    }

    useEffect(() => {
        if (!confirmSave) return undefined;
        function onKey(e) {
            if (e.key === 'Escape') setConfirmSave(null);
        }
        window.addEventListener('keydown', onKey);
        queueMicrotask(() => confirmRef.current?.focus());
        return () => window.removeEventListener('keydown', onKey);
    }, [confirmSave]);

    async function executeConfirmedSave() {
        if (!confirmSave || !token) return;
        const { key, value } = confirmSave;
        setConfirmSave(null);
        setSavingKey(key);
        setError(null);
        try {
            let res;
            if (key === 'reset_cooldown') {
                res = await patchSystemResetCooldown(token, value);
            } else if (key === 'negotiation_window') {
                res = await patchSystemNegotiationWindow(token, value);
            } else if (key === 'job_start_window') {
                res = await patchSystemJobStartWindow(token, value);
            } else {
                res = await patchSystemAvailabilityTimeout(token, value);
            }
            setConfig((prev) => ({ ...prev, ...res }));
            setDraft((d) => ({ ...d, [key]: String(res[key] ?? value) }));
        } catch (e) {
            setError(e?.message || 'Update failed.');
        } finally {
            setSavingKey(null);
        }
    }

    const confirmDialog =
        confirmSave &&
        createPortal(
            <div
                className="admin-system-confirm-backdrop"
                role="presentation"
                onClick={(e) => {
                    if (e.target === e.currentTarget) setConfirmSave(null);
                }}
            >
                <div
                    ref={confirmRef}
                    className="admin-system-confirm"
                    role="alertdialog"
                    aria-modal="true"
                    aria-labelledby="admin-system-confirm-title"
                    aria-describedby="admin-system-confirm-desc"
                    tabIndex={-1}
                >
                    <div className="admin-system-confirm__header">
                        <i className="fas fa-exclamation-triangle admin-system-confirm__header-icon" aria-hidden />
                        <h2 id="admin-system-confirm-title" className="admin-system-confirm__title">
                            Confirm system change
                        </h2>
                    </div>
                    <p id="admin-system-confirm-desc" className="admin-system-confirm__body">
                        Update <strong>{confirmSave.title}</strong> to{' '}
                        <strong className="admin-system-confirm__value">{confirmSave.value}</strong>{' '}
                        {confirmSave.unit ? (
                            <span className="admin-system-confirm__unit">{confirmSave.unit}</span>
                        ) : null}
                        ?
                    </p>
                    <p className="admin-system-confirm__warn">
                        This applies immediately for everyone using the platform.
                    </p>
                    <div className="admin-system-confirm__actions">
                        <button
                            type="button"
                            className="admin-system-confirm__btn admin-system-confirm__btn--cancel"
                            onClick={() => setConfirmSave(null)}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="admin-system-confirm__btn admin-system-confirm__btn--danger"
                            onClick={() => void executeConfirmedSave()}
                        >
                            Confirm update
                        </button>
                    </div>
                </div>
            </div>,
            document.body
        );

    return (
        <div className="admin-page admin-page--system">
            <div className="admin-system-danger-banner" role="status">
                <i className="fas fa-exclamation-triangle admin-system-danger-banner__icon" aria-hidden />
                <div className="admin-system-danger-banner__text">
                    <strong>Please proceed with caution.</strong>
                    <p className="admin-system-danger-banner__sub">
                        These values affect authentication, negotiations, and scheduling across the whole
                        platform.
                    </p>
                </div>
            </div>

            {error ? <p className="talent-jobs__error">{error}</p> : null}

            {loading ? (
                <p className="talent-jobs__loading">Loading configuration…</p>
            ) : (
                <div className="admin-system-bento">
                    {CARDS.map((card) => {
                        const dirty = dirtyByKey[card.key];
                        const saving = savingKey === card.key;
                        return (
                            <div key={card.key} className="admin-system-card">
                                <h2 className="admin-system-card__title">{card.title}</h2>
                                <p className="admin-system-card__desc">{card.description}</p>
                                <p className="admin-system-card__default">
                                    {formatDefaultLine(card.defaultValue, card.unit)}
                                </p>
                                <label className="admin-system-card__label" htmlFor={`sys-${card.key}`}>
                                    Value ({card.unit})
                                </label>
                                <div className="admin-system-card__row">
                                    <input
                                        id={`sys-${card.key}`}
                                        type="number"
                                        className="admin-system-card__input"
                                        min={card.min}
                                        step={card.step}
                                        value={draft[card.key] ?? ''}
                                        onChange={(e) =>
                                            setDraft((d) => ({ ...d, [card.key]: e.target.value }))
                                        }
                                        disabled={saving || !config}
                                    />
                                    <button
                                        type="button"
                                        className="admin-system-card__save"
                                        disabled={!dirty || saving || !config}
                                        onClick={() => handleRequestSave(card.key)}
                                    >
                                        {saving ? 'Saving…' : 'Save'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            {confirmDialog}
        </div>
    );
}
