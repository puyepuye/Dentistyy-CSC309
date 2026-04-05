import { useEffect } from 'react';

export default function ProfileModalShell({
    title,
    children,
    footer,
    onClose,
    wide = false,
    nested = false,
    closeOnEscape = true,
}) {
    useEffect(() => {
        if (!closeOnEscape) return undefined;
        function onKey(e) {
            if (e.key === 'Escape') onClose();
        }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose, closeOnEscape]);

    return (
        <div
            className={`profile-modal-backdrop${nested ? ' profile-modal-backdrop--nested' : ''}`}
            role="presentation"
            onClick={onClose}
        >
            <div
                className={`profile-modal${wide ? ' profile-modal--wide' : ''}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="profile-modal-title"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="profile-modal__head">
                    <h2 className="profile-modal__title" id="profile-modal-title">
                        {title}
                    </h2>
                    <button type="button" className="profile-modal__close" onClick={onClose} aria-label="Close">
                        ×
                    </button>
                </div>
                <div className="profile-modal__body">{children}</div>
                {footer ? <div className="profile-modal__footer">{footer}</div> : null}
            </div>
        </div>
    );
}
