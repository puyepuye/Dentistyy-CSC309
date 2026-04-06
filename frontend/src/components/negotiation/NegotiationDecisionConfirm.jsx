/**
 * Safe-confirm before accept / reject on negotiation (talent + business).
 * @param {{ open: boolean, variant: 'accept' | 'reject', busy: boolean, onConfirm: () => void, onCancel: () => void, otherPartyLabel?: string }} props
 */
export default function NegotiationDecisionConfirm({
    open,
    variant,
    busy,
    onConfirm,
    onCancel,
    otherPartyLabel = 'the other party',
}) {
    if (!open) return null;

    const isAccept = variant === 'accept';
    const title = isAccept ? 'Accept this negotiation?' : 'Reject this negotiation?';
    const body = isAccept
        ? `You’re about to accept. If ${otherPartyLabel} accepts too, the shift will be filled. This can’t be undone from here.`
        : `You’re about to reject. The negotiation will end and interests for this match may be cleared.`;

    return (
        <div
            className="profile-modal-backdrop"
            role="dialog"
            aria-modal="true"
            aria-labelledby="neg-decision-confirm-title"
            onClick={() => !busy && onCancel()}
        >
            <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
                <div className="profile-modal__head">
                    <h2 id="neg-decision-confirm-title" className="profile-modal__title">
                        {title}
                    </h2>
                    <button
                        type="button"
                        className="profile-modal__close"
                        aria-label="Close"
                        disabled={busy}
                        onClick={onCancel}
                    >
                        ×
                    </button>
                </div>
                <div className="profile-modal__body">
                    <p className="talent-job-detail__rail-text" style={{ marginTop: 0 }}>
                        {body}
                    </p>
                    <div className="business-stack" style={{ marginTop: '1rem' }}>
                        <button
                            type="button"
                            className="talent-job-detail__btn talent-job-detail__btn--ghost"
                            disabled={busy}
                            onClick={onCancel}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className={
                                isAccept
                                    ? 'talent-job-detail__btn talent-job-detail__btn--primary'
                                    : 'business-btn business-btn--danger'
                            }
                            style={isAccept ? undefined : { width: '100%', justifyContent: 'center' }}
                            disabled={busy}
                            onClick={onConfirm}
                        >
                            {busy ? 'Saving…' : isAccept ? 'Yes, accept' : 'Yes, reject'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
