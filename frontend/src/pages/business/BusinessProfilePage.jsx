import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useBusinessProfile } from '../../contexts/BusinessProfileContext.jsx';
import EditBusinessProfileModal from '../../components/business/EditBusinessProfileModal.jsx';
import { assetUrl, patchBusinessMe, uploadBusinessAvatar } from '../../lib/api.js';

export default function BusinessProfilePage() {
    const { token } = useAuth();
    const { profile, loading, error, refetch } = useBusinessProfile();
    const [editOpen, setEditOpen] = useState(false);
    const [publicEditing, setPublicEditing] = useState(false);
    const [avatarBusy, setAvatarBusy] = useState(false);
    const [publicSaveBusy, setPublicSaveBusy] = useState(false);
    const [publicSaveErr, setPublicSaveErr] = useState(null);
    const [businessName, setBusinessName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [postalAddress, setPostalAddress] = useState('');
    const [lat, setLat] = useState('');
    const [lon, setLon] = useState('');
    const [biography, setBiography] = useState('');
    const fileRef = useRef(null);
    const publicAvatarRef = useRef(null);

    useEffect(() => {
        if (!profile || publicEditing) return;
        setBusinessName(profile.business_name || '');
        setPhoneNumber(profile.phone_number || '');
        setPostalAddress(profile.postal_address || '');
        setLat(profile.location != null ? String(profile.location.lat) : '');
        setLon(profile.location != null ? String(profile.location.lon) : '');
        setBiography(profile.biography || '');
        setPublicSaveErr(null);
    }, [profile, publicEditing]);

    function syncPublicFormFromProfile() {
        if (!profile) return;
        setBusinessName(profile.business_name || '');
        setPhoneNumber(profile.phone_number || '');
        setPostalAddress(profile.postal_address || '');
        setLat(profile.location != null ? String(profile.location.lat) : '');
        setLon(profile.location != null ? String(profile.location.lon) : '');
        setBiography(profile.biography || '');
    }

    function beginPublicEdit() {
        syncPublicFormFromProfile();
        setPublicSaveErr(null);
        setPublicEditing(true);
    }

    function cancelPublicEdit() {
        syncPublicFormFromProfile();
        setPublicSaveErr(null);
        setPublicEditing(false);
    }

    async function onAvatarPick(e) {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file || !token) return;
        setAvatarBusy(true);
        try {
            await uploadBusinessAvatar(token, file);
            await refetch();
        } catch {
            window.alert('Upload a PNG or JPEG image.');
        } finally {
            setAvatarBusy(false);
        }
    }

    async function onPublicPracticeSave(e) {
        e.preventDefault();
        setPublicSaveErr(null);
        const name = businessName.trim();
        if (!name) {
            setPublicSaveErr('Business name is required.');
            return;
        }
        const latNum = Number(lat);
        const lonNum = Number(lon);
        if (Number.isNaN(latNum) || Number.isNaN(lonNum)) {
            setPublicSaveErr('Latitude and longitude must be valid numbers.');
            return;
        }
        if (latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180) {
            setPublicSaveErr('Latitude must be between -90 and 90, longitude between -180 and 180.');
            return;
        }
        if (!token) return;
        setPublicSaveBusy(true);
        try {
            await patchBusinessMe(token, {
                business_name: name,
                phone_number: phoneNumber,
                postal_address: postalAddress,
                location: { lat: latNum, lon: lonNum },
                biography,
            });
            await refetch();
            setPublicEditing(false);
        } catch (err) {
            setPublicSaveErr(err instanceof Error ? err.message : 'Could not save.');
        } finally {
            setPublicSaveBusy(false);
        }
    }

    if (loading && !profile) {
        return (
            <div className="talent-profile">
                <p className="talent-profile__loading">Loading practice profile…</p>
            </div>
        );
    }

    if (error && !profile) {
        return (
            <div className="talent-profile">
                <p className="talent-profile__error" role="alert">
                    {error}
                </p>
            </div>
        );
    }

    if (!profile || !token) return null;

    const fullAvatar = assetUrl(profile.avatar);

    return (
        <div className="talent-profile">
            <section className="talent-card" aria-labelledby="public-heading">
                <div className="talent-card__head">
                    <div className="business-card__head-text">
                        <h2 className="talent-card__title" id="public-heading">
                            Public practice view
                        </h2>
                        <p className="business-card__hint">What talent sees when browsing your practice.</p>
                    </div>
                </div>
                {publicEditing ? (
                    <form className="business-public-practice" onSubmit={onPublicPracticeSave} noValidate>
                        {publicSaveErr ? (
                            <p className="talent-profile__error business-public-practice__error" role="alert">
                                {publicSaveErr}
                            </p>
                        ) : null}
                        <div className="talent-profile-personal">
                            <div>
                                <button
                                    type="button"
                                    className="talent-avatar talent-avatar--btn"
                                    onClick={() => publicAvatarRef.current?.click()}
                                    disabled={avatarBusy || publicSaveBusy}
                                    aria-label="Replace practice logo shown to talent"
                                >
                                    {fullAvatar ? (
                                        <img className="talent-avatar__img" src={fullAvatar} alt="" />
                                    ) : (
                                        <div className="talent-avatar__placeholder" />
                                    )}
                                    <span className="talent-avatar__camera">
                                        <i className="fas fa-camera" aria-hidden />
                                    </span>
                                </button>
                                <input
                                    ref={publicAvatarRef}
                                    type="file"
                                    accept="image/png,image/jpeg"
                                    className="business-visually-hidden"
                                    onChange={onAvatarPick}
                                />
                            </div>
                            <div className="talent-field-grid business-public-practice__grid">
                                <div className="business-public-practice__field">
                                    <label className="talent-field__label" htmlFor="bp-business-name">
                                        Business name
                                    </label>
                                    <input
                                        id="bp-business-name"
                                        className="pm-field__input business-public-practice__input"
                                        value={businessName}
                                        onChange={(ev) => setBusinessName(ev.target.value)}
                                        autoComplete="organization"
                                        required
                                    />
                                </div>
                                <div className="business-public-practice__field">
                                    <span className="talent-field__label">Email</span>
                                    <input
                                        className="pm-field__input business-public-practice__input"
                                        value={profile.email || ''}
                                        readOnly
                                        aria-readonly="true"
                                        title="Email is tied to your account and cannot be changed here."
                                    />
                                    <p className="business-public-practice__readonly-hint">
                                        Sign-in email — not editable in the app.
                                    </p>
                                </div>
                                <div className="business-public-practice__field">
                                    <label className="talent-field__label" htmlFor="bp-phone">
                                        Phone
                                    </label>
                                    <input
                                        id="bp-phone"
                                        className="pm-field__input business-public-practice__input"
                                        value={phoneNumber}
                                        onChange={(ev) => setPhoneNumber(ev.target.value)}
                                        autoComplete="tel"
                                    />
                                </div>
                                <div className="business-public-practice__field">
                                    <label className="talent-field__label" htmlFor="bp-address">
                                        Address
                                    </label>
                                    <input
                                        id="bp-address"
                                        className="pm-field__input business-public-practice__input"
                                        value={postalAddress}
                                        onChange={(ev) => setPostalAddress(ev.target.value)}
                                        autoComplete="street-address"
                                    />
                                </div>
                                <div className="business-public-practice__field business-public-practice__field--coords">
                                    <span className="talent-field__label">Location (latitude, longitude)</span>
                                    <div className="business-public-practice__coords">
                                        <label className="business-visually-hidden" htmlFor="bp-lat">
                                            Latitude
                                        </label>
                                        <input
                                            id="bp-lat"
                                            className="pm-field__input business-public-practice__input"
                                            value={lat}
                                            onChange={(ev) => setLat(ev.target.value)}
                                            inputMode="decimal"
                                            placeholder="Latitude"
                                            aria-label="Latitude"
                                        />
                                        <label className="business-visually-hidden" htmlFor="bp-lon">
                                            Longitude
                                        </label>
                                        <input
                                            id="bp-lon"
                                            className="pm-field__input business-public-practice__input"
                                            value={lon}
                                            onChange={(ev) => setLon(ev.target.value)}
                                            inputMode="decimal"
                                            placeholder="Longitude"
                                            aria-label="Longitude"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="business-public-practice__bio">
                            <label className="talent-field__label" htmlFor="bp-bio">
                                Biography
                            </label>
                            <textarea
                                id="bp-bio"
                                className="pm-field__input pm-field__textarea business-public-practice__textarea"
                                rows={4}
                                value={biography}
                                onChange={(ev) => setBiography(ev.target.value)}
                                placeholder="Tell talent about your practice…"
                            />
                        </div>
                        <div className="business-public-practice__actions">
                            <button
                                type="submit"
                                className="business-btn business-btn--primary"
                                disabled={publicSaveBusy || avatarBusy}
                            >
                                {publicSaveBusy ? 'Saving…' : 'Save changes'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <>
                        <div className="talent-profile-personal">
                            <div className="talent-avatar" aria-hidden>
                                {fullAvatar ? (
                                    <img className="talent-avatar__img" src={fullAvatar} alt="" />
                                ) : (
                                    <div className="talent-avatar__placeholder" />
                                )}
                            </div>
                            <div className="talent-field-grid">
                                <div>
                                    <span className="talent-field__label">Business name</span>
                                    <p className="talent-field__value">{profile.business_name}</p>
                                </div>
                                <div>
                                    <span className="talent-field__label">Email</span>
                                    <p className="talent-field__value">{profile.email}</p>
                                </div>
                                <div>
                                    <span className="talent-field__label">Phone</span>
                                    <p className="talent-field__value">{profile.phone_number || '—'}</p>
                                </div>
                                <div>
                                    <span className="talent-field__label">Address</span>
                                    <p className="talent-field__value">{profile.postal_address || '—'}</p>
                                </div>
                                <div>
                                    <span className="talent-field__label">Location</span>
                                    <p className="talent-field__value">
                                        {profile.location
                                            ? `${Number(profile.location.lat).toFixed(4)}, ${Number(profile.location.lon).toFixed(4)}`
                                            : '—'}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="talent-bio__body talent-bio__body--spaced business-public-practice__read-bio">
                            {profile.biography?.trim() ? profile.biography : 'No biography yet.'}
                        </div>
                    </>
                )}
            </section>

            <section className="talent-card" aria-labelledby="manage-heading">
                <div className="talent-card__head">
                    <h2 className="talent-card__title" id="manage-heading">
                        Manage practice
                    </h2>
                    <button type="button" className="talent-card__action" onClick={() => setEditOpen(true)}>
                        <span>Edit details</span>
                        <i className="fas fa-pencil-alt" aria-hidden />
                    </button>
                </div>
                <div className="talent-profile-personal">
                    <div>
                        <button
                            type="button"
                            className="talent-avatar talent-avatar--btn"
                            onClick={() => fileRef.current?.click()}
                            disabled={avatarBusy}
                            aria-label="Replace practice logo"
                        >
                            {fullAvatar ? (
                                <img className="talent-avatar__img" src={fullAvatar} alt="" />
                            ) : (
                                <div className="talent-avatar__placeholder" />
                            )}
                            <span className="talent-avatar__camera">
                                <i className="fas fa-camera" aria-hidden />
                            </span>
                        </button>
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/png,image/jpeg"
                            className="business-visually-hidden"
                            onChange={onAvatarPick}
                        />
                    </div>
                    <div className="talent-field-grid">
                        <div>
                            <span className="talent-field__label">Owner</span>
                            <p className="talent-field__value">{profile.owner_name}</p>
                        </div>
                        <div>
                            <span className="talent-field__label">Verified</span>
                            <p className="talent-field__value">{profile.verified ? 'Yes' : 'No'}</p>
                        </div>
                        <div>
                            <span className="talent-field__label">Activated</span>
                            <p className="talent-field__value">{profile.activated ? 'Yes' : 'No'}</p>
                        </div>
                    </div>
                </div>
                <p className="business-card__hint">
                    Logo: PNG or JPEG. Use “Edit details” here to update practice information.
                </p>
            </section>

            {editOpen ? (
                <EditBusinessProfileModal
                    open={editOpen}
                    onClose={() => setEditOpen(false)}
                    profile={profile}
                    token={token}
                    onSaved={refetch}
                />
            ) : null}
        </div>
    );
}
