import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { assetUrl, getBusinessMe } from '../../lib/api.js';

export default function EmployerProfilePage() {
    const { token } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!token) return;
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const me = await getBusinessMe(token);
                if (!cancelled) setProfile(me);
            } catch (e) {
                if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load profile');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [token]);

    if (loading) {
        return (
            <div className="talent-profile">
                <p className="talent-profile__loading">Loading practice profile…</p>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="talent-profile">
                <p className="talent-profile__error" role="alert">
                    {error || 'No profile data.'}
                </p>
            </div>
        );
    }

    const avatarSrc = assetUrl(profile.avatar);

    return (
        <div className="talent-profile">
            <section className="talent-card" aria-labelledby="practice-heading">
                <div className="talent-card__head">
                    <h2 className="talent-card__title" id="practice-heading">
                        Practice profile
                    </h2>
                    <button type="button" className="talent-card__action" disabled>
                        <span>Edit</span>
                        <i className="fas fa-pencil-alt" aria-hidden />
                    </button>
                </div>
                <div className="talent-profile-personal">
                    <div className="talent-avatar" aria-hidden>
                        {avatarSrc ? (
                            <img className="talent-avatar__img" src={avatarSrc} alt="" />
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
                            <span className="talent-field__label">Owner</span>
                            <p className="talent-field__value">{profile.owner_name}</p>
                        </div>
                        <div>
                            <span className="talent-field__label">Email</span>
                            <p className="talent-field__value">{profile.email}</p>
                        </div>
                        <div>
                            <span className="talent-field__label">Phone</span>
                            <p className="talent-field__value">{profile.phone_number}</p>
                        </div>
                        <div>
                            <span className="talent-field__label">Address</span>
                            <p className="talent-field__value">{profile.postal_address}</p>
                        </div>
                        <div>
                            <span className="talent-field__label">Verified</span>
                            <p className="talent-field__value">{profile.verified ? 'Yes' : 'No'}</p>
                        </div>
                        <div>
                            <span className="talent-field__label">Location</span>
                            <p className="talent-field__value">
                                {profile.location
                                    ? `${profile.location.lat.toFixed(4)}, ${profile.location.lon.toFixed(4)}`
                                    : '—'}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="talent-bio__body talent-bio__body--spaced">
                    {profile.biography?.trim() ? profile.biography : 'No biography yet.'}
                </div>
            </section>
        </div>
    );
}
