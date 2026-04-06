import { useEffect, useState } from 'react';
import ProfileModalShell from '../talent/profile/ProfileModalShell.jsx';
import { patchBusinessMe } from '../../lib/api.js';

export default function EditBusinessProfileModal({ open, onClose, profile, token, onSaved }) {
    const [businessName, setBusinessName] = useState('');
    const [ownerName, setOwnerName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [postalAddress, setPostalAddress] = useState('');
    const [lat, setLat] = useState('');
    const [lon, setLon] = useState('');
    const [biography, setBiography] = useState('');
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState(null);

    useEffect(() => {
        if (!open || !profile) return;
        setBusinessName(profile.business_name || '');
        setOwnerName(profile.owner_name || '');
        setPhoneNumber(profile.phone_number || '');
        setPostalAddress(profile.postal_address || '');
        setLat(profile.location != null ? String(profile.location.lat) : '');
        setLon(profile.location != null ? String(profile.location.lon) : '');
        setBiography(profile.biography || '');
        setErr(null);
    }, [open, profile]);

    if (!open || !profile) return null;

    async function handleSave(e) {
        e.preventDefault();
        setErr(null);
        const latNum = Number(lat);
        const lonNum = Number(lon);
        if (Number.isNaN(latNum) || Number.isNaN(lonNum)) {
            setErr('Latitude and longitude must be valid numbers.');
            return;
        }
        setSaving(true);
        try {
            await patchBusinessMe(token, {
                business_name: businessName.trim(),
                owner_name: ownerName.trim(),
                phone_number: phoneNumber,
                postal_address: postalAddress,
                location: { lat: latNum, lon: lonNum },
                biography,
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
            title="Edit practice profile"
            onClose={onClose}
            wide
            footer={
                <>
                    <button type="button" className="profile-modal__btn-ghost" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="edit-business-form"
                        className="profile-modal__btn-primary"
                        disabled={saving}
                    >
                        {saving ? 'Saving…' : 'Save changes'}
                    </button>
                </>
            }
        >
            <form id="edit-business-form" onSubmit={handleSave}>
                {err ? (
                    <p className="profile-modal__error" role="alert">
                        {err}
                    </p>
                ) : null}
                <div className="pm-field-row">
                    <div className="pm-field">
                        <label className="pm-field__label" htmlFor="eb-name">
                            Business name
                        </label>
                        <input
                            id="eb-name"
                            className="pm-field__input"
                            value={businessName}
                            onChange={(ev) => setBusinessName(ev.target.value)}
                            required
                            autoComplete="organization"
                        />
                    </div>
                    <div className="pm-field">
                        <label className="pm-field__label" htmlFor="eb-owner">
                            Owner name
                        </label>
                        <input
                            id="eb-owner"
                            className="pm-field__input"
                            value={ownerName}
                            onChange={(ev) => setOwnerName(ev.target.value)}
                            required
                        />
                    </div>
                </div>
                <div className="pm-field-row">
                    <div className="pm-field">
                        <label className="pm-field__label" htmlFor="eb-phone">
                            Phone
                        </label>
                        <input
                            id="eb-phone"
                            className="pm-field__input"
                            value={phoneNumber}
                            onChange={(ev) => setPhoneNumber(ev.target.value)}
                            autoComplete="tel"
                        />
                    </div>
                    <div className="pm-field">
                        <label className="pm-field__label" htmlFor="eb-postal">
                            Address
                        </label>
                        <input
                            id="eb-postal"
                            className="pm-field__input"
                            value={postalAddress}
                            onChange={(ev) => setPostalAddress(ev.target.value)}
                            autoComplete="street-address"
                        />
                    </div>
                </div>
                <div className="pm-field-row">
                    <div className="pm-field">
                        <label className="pm-field__label" htmlFor="eb-lat">
                            Latitude
                        </label>
                        <input
                            id="eb-lat"
                            className="pm-field__input"
                            value={lat}
                            onChange={(ev) => setLat(ev.target.value)}
                            inputMode="decimal"
                            required
                        />
                    </div>
                    <div className="pm-field">
                        <label className="pm-field__label" htmlFor="eb-lon">
                            Longitude
                        </label>
                        <input
                            id="eb-lon"
                            className="pm-field__input"
                            value={lon}
                            onChange={(ev) => setLon(ev.target.value)}
                            inputMode="decimal"
                            required
                        />
                    </div>
                </div>
                <div className="pm-field">
                    <label className="pm-field__label" htmlFor="eb-bio">
                        Biography
                    </label>
                    <textarea
                        id="eb-bio"
                        className="pm-field__input pm-field__textarea"
                        rows={5}
                        value={biography}
                        onChange={(ev) => setBiography(ev.target.value)}
                    />
                </div>
            </form>
        </ProfileModalShell>
    );
}
