import { useCallback, useEffect, useMemo, useState } from 'react';
import ProfileModalShell from './ProfileModalShell.jsx';
import {
    assetUrl,
    createQualification,
    getMyQualificationRequests,
    getPositionTypes,
    patchQualification,
    uploadQualificationDocument,
} from '../../../lib/api.js';

function formatDate(iso) {
    if (!iso) return '-';
    return iso.slice(0, 10);
}

function statusLabel(status) {
    switch (status) {
        case 'approved':
            return 'Approved';
        case 'rejected':
            return 'Rejected';
        case 'submitted':
        case 'revised':
        case 'created':
        default:
            return 'Pending';
    }
}

export default function ManageQualificationsModal({ open, onClose, token, onSaved }) {
    const [requests, setRequests] = useState([]);
    const [positionTypes, setPositionTypes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadErr, setLoadErr] = useState(null);

    const [positionTypeId, setPositionTypeId] = useState('');
    const [newNote, setNewNote] = useState('');
    const [newFile, setNewFile] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [formErr, setFormErr] = useState(null);

    const [viewRow, setViewRow] = useState(null);
    const [resubmitRow, setResubmitRow] = useState(null);
    const [resubmitFile, setResubmitFile] = useState(null);
    const [resubmitErr, setResubmitErr] = useState(null);
    const [resubmitting, setResubmitting] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setLoadErr(null);
        try {
            const [reqRes, ptRes] = await Promise.all([
                getMyQualificationRequests(token),
                getPositionTypes(token),
            ]);
            setRequests(reqRes.results ?? []);
            setPositionTypes(ptRes.results ?? []);
        } catch (e) {
            setLoadErr(e instanceof Error ? e.message : 'Failed to load qualifications.');
            setRequests([]);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (!open) return;
        load();
    }, [open, load]);

    useEffect(() => {
        if (!open) return undefined;
        function onKey(e) {
            if (e.key !== 'Escape') return;
            if (resubmitRow) {
                setResubmitRow(null);
                setResubmitFile(null);
                setResubmitErr(null);
                return;
            }
            if (viewRow) {
                setViewRow(null);
                return;
            }
            onClose();
        }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, viewRow, resubmitRow, onClose]);

    const takenTypeIds = useMemo(() => new Set(requests.map((r) => r.position_type.id)), [requests]);
    const addableTypes = useMemo(
        () => positionTypes.filter((pt) => !takenTypeIds.has(pt.id)),
        [positionTypes, takenTypeIds]
    );

    async function handleSubmitRequest(e) {
        e.preventDefault();
        setFormErr(null);
        const ptId = Number(positionTypeId, 10);
        if (!Number.isInteger(ptId) || ptId < 1) {
            setFormErr('Select a qualification type.');
            return;
        }
        setSubmitting(true);
        try {
            const created = await createQualification(token, {
                position_type_id: ptId,
                note: newNote.trim(),
            });
            if (newFile) {
                await uploadQualificationDocument(token, created.id, newFile);
            }
            setPositionTypeId('');
            setNewNote('');
            setNewFile(null);
            await load();
            if (onSaved) await onSaved();
        } catch (err) {
            setFormErr(err instanceof Error ? err.message : 'Could not submit.');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleResubmit(e) {
        e.preventDefault();
        if (!resubmitRow) return;
        if (!resubmitFile) {
            setResubmitErr('Choose a PDF document.');
            return;
        }
        setResubmitErr(null);
        setResubmitting(true);
        try {
            await uploadQualificationDocument(token, resubmitRow.id, resubmitFile);
            await patchQualification(token, resubmitRow.id, { status: 'revised' });
            setResubmitRow(null);
            setResubmitFile(null);
            await load();
            if (onSaved) await onSaved();
        } catch (err) {
            setResubmitErr(err instanceof Error ? err.message : 'Could not resubmit.');
        } finally {
            setResubmitting(false);
        }
    }

    if (!open) return null;

    return (
        <>
            <ProfileModalShell
                title="Qualifications"
                wide
                closeOnEscape={false}
                onClose={onClose}
                footer={
                    <button type="button" className="profile-modal__btn-ghost" onClick={onClose}>
                        Close
                    </button>
                }
            >
                <div className="pm-add-block">
                    <h3 className="pm-quals-section-title" style={{ marginTop: 0 }}>
                        Add Qualifications
                    </h3>
                    <form onSubmit={handleSubmitRequest}>
                        {formErr ? (
                            <p className="profile-modal__error" role="alert">
                                {formErr}
                            </p>
                        ) : null}
                        <div className="pm-field">
                            <label className="pm-field__label" htmlFor="pm-qual-type">
                                Select Qualification Type
                            </label>
                            <select
                                id="pm-qual-type"
                                className="pm-field__select"
                                value={positionTypeId}
                                onChange={(e) => setPositionTypeId(e.target.value)}
                                required
                            >
                                <option value="">Choose…</option>
                                {addableTypes.map((pt) => (
                                    <option key={pt.id} value={String(pt.id)}>
                                        {pt.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="pm-field">
                            <span className="pm-field__label">Upload Qualifications Documents</span>
                            <div className="pm-upload-row">
                                <input
                                    type="file"
                                    accept="application/pdf"
                                    onChange={(e) => setNewFile(e.target.files?.[0] ?? null)}
                                />
                                {newFile ? (
                                    <span className="pm-file-name">{newFile.name}</span>
                                ) : (
                                    <span className="pm-file-name">Optional PDF</span>
                                )}
                            </div>
                        </div>
                        <div className="pm-submit-inline">
                            <button
                                type="submit"
                                className="profile-modal__btn-primary"
                                disabled={submitting || addableTypes.length === 0}
                            >
                                {submitting ? 'Submitting…' : 'Submit Request'}
                            </button>
                        </div>
                    </form>
                </div>

                <h3 className="pm-quals-section-title">Qualifications Requests</h3>
                {loading ? (
                    <p className="talent-profile__loading">Loading…</p>
                ) : loadErr ? (
                    <p className="profile-modal__error" role="alert">
                        {loadErr}
                    </p>
                ) : requests.length === 0 ? (
                    <p className="talent-quals__empty">No qualification requests yet.</p>
                ) : (
                    <div className="pm-quals-table-wrap">
                        <table className="pm-quals-table">
                            <thead>
                                <tr>
                                    <th>Qualification Type</th>
                                    <th>Last Updated</th>
                                    <th>Status</th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map((row) => (
                                    <tr key={row.id}>
                                        <td>{row.position_type.name}</td>
                                        <td>{formatDate(row.updatedAt)}</td>
                                        <td>{statusLabel(row.status)}</td>
                                        <td>
                                            <button
                                                type="button"
                                                className="pm-link"
                                                onClick={() => setViewRow(row)}
                                            >
                                                View
                                            </button>
                                            {row.status === 'rejected' ? (
                                                <>
                                                    {' · '}
                                                    <button
                                                        type="button"
                                                        className="pm-link"
                                                        onClick={() => {
                                                            setResubmitRow(row);
                                                            setResubmitFile(null);
                                                            setResubmitErr(null);
                                                        }}
                                                    >
                                                        Resubmit
                                                    </button>
                                                </>
                                            ) : null}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </ProfileModalShell>

            {viewRow ? (
                <ProfileModalShell
                    title="View Qualification"
                    nested
                    closeOnEscape={false}
                    onClose={() => setViewRow(null)}
                    footer={
                        <button
                            type="button"
                            className="profile-modal__btn-primary"
                            onClick={() => setViewRow(null)}
                        >
                            Close
                        </button>
                    }
                >
                    <div className="pm-field">
                        <label className="pm-field__label" htmlFor="pm-view-type">
                            Qualification Type
                        </label>
                        <input
                            id="pm-view-type"
                            className="pm-field__input"
                            readOnly
                            value={viewRow.position_type.name}
                        />
                    </div>
                    <div className="pm-field">
                        <span className="pm-field__label">Uploaded Qualifications Documents</span>
                        {viewRow.document ? (
                            <p style={{ margin: '0.25rem 0 0', fontSize: '0.92rem' }}>
                                <a
                                    href={assetUrl(viewRow.document)}
                                    className="talent-bio__resume-link"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Click to Download
                                </a>
                            </p>
                        ) : (
                            <p style={{ margin: '0.25rem 0 0', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                                No document uploaded.
                            </p>
                        )}
                    </div>
                </ProfileModalShell>
            ) : null}

            {resubmitRow ? (
                <ProfileModalShell
                    title="Resubmit Qualification"
                    nested
                    closeOnEscape={false}
                    onClose={() => {
                        setResubmitRow(null);
                        setResubmitFile(null);
                        setResubmitErr(null);
                    }}
                    footer={
                        <>
                            <button
                                type="button"
                                className="profile-modal__btn-ghost"
                                onClick={() => {
                                    setResubmitRow(null);
                                    setResubmitFile(null);
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="resubmit-qual-form"
                                className="profile-modal__btn-primary"
                                disabled={resubmitting}
                            >
                                {resubmitting ? 'Submitting…' : 'Submit Request'}
                            </button>
                        </>
                    }
                >
                    <form id="resubmit-qual-form" onSubmit={handleResubmit}>
                        {resubmitErr ? (
                            <p className="profile-modal__error" role="alert">
                                {resubmitErr}
                            </p>
                        ) : null}
                        <div className="pm-field">
                            <label className="pm-field__label" htmlFor="pm-resubmit-type">
                                Qualification Type
                            </label>
                            <input
                                id="pm-resubmit-type"
                                className="pm-field__input"
                                readOnly
                                value={resubmitRow.position_type.name}
                            />
                        </div>
                        <div className="pm-field">
                            <span className="pm-field__label">Upload New Qualifications Documents</span>
                            <div className="pm-upload-row">
                                <input
                                    type="file"
                                    accept="application/pdf"
                                    required
                                    onChange={(e) => setResubmitFile(e.target.files?.[0] ?? null)}
                                />
                                {resubmitFile ? (
                                    <span className="pm-file-name">{resubmitFile.name}</span>
                                ) : null}
                            </div>
                        </div>
                    </form>
                </ProfileModalShell>
            ) : null}
        </>
    );
}
