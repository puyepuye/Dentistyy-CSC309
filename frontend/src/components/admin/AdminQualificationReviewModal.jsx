import { useEffect, useRef, useState } from 'react';
import {
    fetchQualificationDocumentBlobUrl,
    getQualificationById,
    patchQualification,
} from '../../lib/api.js';

function formatDate(iso) {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    } catch {
        return '—';
    }
}

function statusBadgeClass(status) {
    const s = (status || '').toLowerCase();
    if (s === 'pending' || s === 'created' || s === 'submitted' || s === 'revised') {
        return 'admin-qual-modal__badge admin-qual-modal__badge--pending';
    }
    if (s === 'approved') return 'admin-qual-modal__badge admin-qual-modal__badge--approved';
    if (s === 'rejected') return 'admin-qual-modal__badge admin-qual-modal__badge--rejected';
    return 'admin-qual-modal__badge';
}

function canAdminDecide(status) {
    const s = (status || '').toLowerCase();
    return s === 'pending' || s === 'created' || s === 'submitted' || s === 'revised';
}

/**
 * @param {object} props
 * @param {string} props.token
 * @param {number | null} props.qualificationId
 * @param {() => void} props.onClose
 * @param {() => void} [props.onUpdated]
 */
export default function AdminQualificationReviewModal({ token, qualificationId, onClose, onUpdated }) {
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [pdfUrl, setPdfUrl] = useState(null);
    const [documentError, setDocumentError] = useState(null);
    const [actionError, setActionError] = useState(null);
    const [acting, setActing] = useState(false);
    const pdfRef = useRef(null);
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    useEffect(() => {
        if (pdfRef.current) {
            URL.revokeObjectURL(pdfRef.current);
            pdfRef.current = null;
        }
        setPdfUrl(null);
        setDetail(null);
        setError(null);
        setDocumentError(null);
        setActionError(null);

        if (!qualificationId || !token) {
            return;
        }

        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const d = await getQualificationById(token, qualificationId);
                if (cancelled) return;
                setDetail(d);
                if (d.document) {
                    try {
                        const url = await fetchQualificationDocumentBlobUrl(token, qualificationId);
                        if (cancelled) {
                            URL.revokeObjectURL(url);
                            return;
                        }
                        pdfRef.current = url;
                        setPdfUrl(url);
                    } catch (e) {
                        if (!cancelled) {
                            setPdfUrl(null);
                            setDocumentError(
                                e?.status === 404
                                    ? 'The uploaded PDF could not be found.'
                                    : e?.message || 'Could not load the PDF preview.'
                            );
                        }
                    }
                }
            } catch (e) {
                if (!cancelled) {
                    setError(e?.message || 'Could not load qualification.');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
            if (pdfRef.current) {
                URL.revokeObjectURL(pdfRef.current);
                pdfRef.current = null;
            }
        };
    }, [qualificationId, token]);

    useEffect(() => {
        if (!qualificationId) return undefined;
        function onKey(e) {
            if (e.key === 'Escape') onCloseRef.current();
        }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [qualificationId]);

    if (!qualificationId) {
        return null;
    }

    async function handleDecision(nextStatus) {
        if (!detail) return;
        setActing(true);
        setActionError(null);
        try {
            await patchQualification(token, detail.id, { status: nextStatus });
            onUpdated?.();
            onClose();
        } catch (e) {
            setActionError(e?.message || 'Update failed.');
        } finally {
            setActing(false);
        }
    }

    const name = detail
        ? `${detail.user?.first_name ?? ''} ${detail.user?.last_name ?? ''}`.trim() || 'Applicant'
        : '…';
    const positionName = detail?.position_type?.name ?? '—';
    const showActions = detail && canAdminDecide(detail.status);

    return (
        <div
            className="admin-qual-modal__backdrop"
            role="presentation"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className="admin-qual-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="admin-qual-modal-title"
            >
                <button
                    type="button"
                    className="admin-qual-modal__close"
                    onClick={onClose}
                    aria-label="Close"
                >
                    <i className="fas fa-times" aria-hidden />
                </button>

                {loading ? (
                    <p className="talent-jobs__loading">Loading…</p>
                ) : error ? (
                    <p className="talent-jobs__error" role="alert">
                        {error}
                    </p>
                ) : detail ? (
                    <>
                        <h2 id="admin-qual-modal-title" className="admin-qual-modal__name">
                            {name}
                        </h2>
                        <p className="admin-qual-modal__position">{positionName}</p>

                        <div className="admin-qual-modal__meta">
                            <div className="admin-qual-modal__meta-row">
                                <span className="admin-qual-modal__meta-label">Status</span>
                                <span className={statusBadgeClass(detail.status)}>
                                    {(detail.status || '').toLowerCase() === 'approved' ||
                                    (detail.status || '').toLowerCase() === 'rejected'
                                        ? detail.status.charAt(0).toUpperCase() + detail.status.slice(1)
                                        : 'Pending'}
                                </span>
                            </div>
                            <div className="admin-qual-modal__meta-row">
                                <span className="admin-qual-modal__meta-label">Updated</span>
                                <span className="admin-qual-modal__meta-value">
                                    {formatDate(detail.updatedAt)}
                                </span>
                            </div>
                        </div>

                        <div className="admin-qual-modal__divider" />

                        <section className="admin-qual-modal__section">
                            <h3 className="admin-qual-modal__section-label">Applicant note</h3>
                            <p className="admin-qual-modal__note">
                                {(detail.note || '').trim() || 'No note provided.'}
                            </p>
                        </section>

                        <div className="admin-qual-modal__divider" />

                        <section className="admin-qual-modal__section">
                            <h3 className="admin-qual-modal__section-label">Documents</h3>
                            {pdfUrl ? (
                                <div className="admin-qual-modal__pdf-wrap">
                                    <iframe
                                        title="Qualification PDF preview"
                                        className="admin-qual-modal__pdf"
                                        src={pdfUrl}
                                    />
                                </div>
                            ) : (
                                <p className="admin-qual-modal__no-doc">No PDF uploaded.</p>
                            )}
                            {documentError ? (
                                <p className="admin-qual-modal__doc-error" role="alert">
                                    {documentError}
                                </p>
                            ) : null}
                            {detail.document ? (
                                <p className="admin-qual-modal__filename">
                                    <i className="fas fa-file-pdf" aria-hidden /> document.pdf
                                </p>
                            ) : null}
                        </section>

                        {actionError ? (
                            <p className="talent-jobs__error" role="alert">
                                {actionError}
                            </p>
                        ) : null}

                        {showActions ? (
                            <>
                                <div className="admin-qual-modal__divider" />
                                <div className="admin-qual-modal__actions">
                                    <button
                                        type="button"
                                        className="admin-qual-modal__btn admin-qual-modal__btn--approve"
                                        disabled={acting}
                                        onClick={() => handleDecision('approved')}
                                    >
                                        Approve
                                    </button>
                                    <button
                                        type="button"
                                        className="admin-qual-modal__btn admin-qual-modal__btn--reject"
                                        disabled={acting}
                                        onClick={() => handleDecision('rejected')}
                                    >
                                        Reject
                                    </button>
                                </div>
                            </>
                        ) : null}
                    </>
                ) : null}
            </div>
        </div>
    );
}
