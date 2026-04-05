import { useEffect, useState } from 'react';
import ProfileModalShell from './ProfileModalShell.jsx';
import { patchRegularMe } from '../../../lib/api.js';

export default function EditBiographyModal({ open, onClose, profile, token, onSaved }) {
    const [biography, setBiography] = useState('');
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState(null);

    useEffect(() => {
        if (!open || !profile) return;
        setBiography(profile.biography || '');
        setErr(null);
    }, [open, profile]);

    if (!open || !profile) return null;

    async function handleSave(e) {
        e.preventDefault();
        setErr(null);
        setSaving(true);
        try {
            await patchRegularMe(token, { biography: biography });
            if (onSaved) await onSaved();
            onClose();
        } catch (error) {
            setErr(error instanceof Error ? error.message : 'Could not save.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <ProfileModalShell
            title="Edit Profile"
            onClose={onClose}
            footer={
                <>
                    <button type="button" className="profile-modal__btn-ghost" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="edit-bio-form"
                        className="profile-modal__btn-primary"
                        disabled={saving}
                    >
                        {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                </>
            }
        >
            <form id="edit-bio-form" onSubmit={handleSave}>
                {err ? (
                    <p className="profile-modal__error" role="alert">
                        {err}
                    </p>
                ) : null}
                <div className="pm-field">
                    <label className="pm-field__label" htmlFor="pm-bio">
                        Biography
                    </label>
                    <textarea
                        id="pm-bio"
                        className="pm-field__textarea"
                        value={biography}
                        onChange={(e) => setBiography(e.target.value)}
                        placeholder="Tell practices about your experience and goals."
                    />
                </div>
            </form>
        </ProfileModalShell>
    );
}
