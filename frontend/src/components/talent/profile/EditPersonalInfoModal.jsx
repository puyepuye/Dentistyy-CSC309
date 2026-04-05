import { useEffect, useState } from 'react';
import ProfileModalShell from './ProfileModalShell.jsx';
import { patchRegularMe } from '../../../lib/api.js';

export default function EditPersonalInfoModal({ open, onClose, profile, token, onSaved }) {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [postalAddress, setPostalAddress] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [birthday, setBirthday] = useState('');
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState(null);

    useEffect(() => {
        if (!open || !profile) return;
        setFirstName(profile.first_name || '');
        setLastName(profile.last_name || '');
        setPostalAddress(profile.postal_address || '');
        setPhoneNumber(profile.phone_number || '');
        setBirthday(profile.birthday || '');
        setErr(null);
    }, [open, profile]);

    if (!open || !profile) return null;

    async function handleSave(e) {
        e.preventDefault();
        setErr(null);
        setSaving(true);
        try {
            await patchRegularMe(token, {
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                postal_address: postalAddress.trim(),
                phone_number: phoneNumber.trim(),
                birthday: birthday.trim(),
            });
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
            title="Edit Personal Information"
            onClose={onClose}
            footer={
                <>
                    <button type="button" className="profile-modal__btn-ghost" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="edit-personal-form"
                        className="profile-modal__btn-primary"
                        disabled={saving}
                    >
                        {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                </>
            }
        >
            <form id="edit-personal-form" onSubmit={handleSave}>
                {err ? (
                    <p className="profile-modal__error" role="alert">
                        {err}
                    </p>
                ) : null}
                <div className="pm-field-row">
                    <div className="pm-field">
                        <label className="pm-field__label" htmlFor="pm-first">
                            First Name
                        </label>
                        <input
                            id="pm-first"
                            className="pm-field__input"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            required
                            autoComplete="given-name"
                        />
                    </div>
                    <div className="pm-field">
                        <label className="pm-field__label" htmlFor="pm-last">
                            Last Name
                        </label>
                        <input
                            id="pm-last"
                            className="pm-field__input"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            required
                            autoComplete="family-name"
                        />
                    </div>
                </div>
                <div className="pm-field">
                    <label className="pm-field__label" htmlFor="pm-email">
                        Email Address
                    </label>
                    <input
                        id="pm-email"
                        className="pm-field__input"
                        value={profile.email}
                        readOnly
                        aria-readonly="true"
                    />
                </div>
                <div className="pm-field">
                    <label className="pm-field__label" htmlFor="pm-postal">
                        Postal address
                    </label>
                    <input
                        id="pm-postal"
                        className="pm-field__input"
                        value={postalAddress}
                        onChange={(e) => setPostalAddress(e.target.value)}
                        autoComplete="street-address"
                    />
                </div>
                <div className="pm-field">
                    <label className="pm-field__label" htmlFor="pm-phone">
                        Phone Number
                    </label>
                    <input
                        id="pm-phone"
                        className="pm-field__input"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        autoComplete="tel"
                    />
                </div>
                <div className="pm-field">
                    <label className="pm-field__label" htmlFor="pm-bday">
                        Birthday
                    </label>
                    <input
                        id="pm-bday"
                        type="date"
                        className="pm-field__input"
                        value={birthday}
                        onChange={(e) => setBirthday(e.target.value)}
                    />
                </div>
            </form>
        </ProfileModalShell>
    );
}
