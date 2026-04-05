import { useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useTalentProfile } from '../../contexts/TalentProfileContext.jsx';
import EditBiographyModal from '../../components/talent/profile/EditBiographyModal.jsx';
import EditPersonalInfoModal from '../../components/talent/profile/EditPersonalInfoModal.jsx';
import ManageQualificationsModal from '../../components/talent/profile/ManageQualificationsModal.jsx';
import { assetUrl, uploadUserResume } from '../../lib/api.js';

export default function StaffProfilePage() {
    const { token } = useAuth();
    const { profile, qualifications, loading, error, refetch } = useTalentProfile();

    const [personalOpen, setPersonalOpen] = useState(false);
    const [bioOpen, setBioOpen] = useState(false);
    const [qualsOpen, setQualsOpen] = useState(false);
    const [resumeUploading, setResumeUploading] = useState(false);
    const resumeInputRef = useRef(null);

    if (loading && !profile) {
        return (
            <div className="talent-profile">
                <p className="talent-profile__loading">Loading profile…</p>
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

    if (!profile || !token) {
        return null;
    }

    const avatarSrc = assetUrl(profile.avatar);
    const resumeHref = assetUrl(profile.resume);

    async function handleResumeChange(e) {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        setResumeUploading(true);
        try {
            await uploadUserResume(token, file);
            await refetch();
        } catch {
            /* surface via alert minimal */
            window.alert('Could not upload resume. Use a PDF file.');
        } finally {
            setResumeUploading(false);
        }
    }

    return (
        <div className="talent-profile">
            <section className="talent-card" aria-labelledby="personal-heading">
                <div className="talent-card__head">
                    <h2 className="talent-card__title" id="personal-heading">
                        Personal Information
                    </h2>
                    <button
                        type="button"
                        className="talent-card__action"
                        onClick={() => setPersonalOpen(true)}
                    >
                        <span>Edit</span>
                        <i className="fas fa-pencil-alt" aria-hidden />
                    </button>
                </div>
                <div className="talent-profile-personal">
                    <div className="talent-avatar" aria-hidden>
                        {avatarSrc ? (
                            <img
                                className="talent-avatar__img"
                                src={avatarSrc}
                                alt=""
                            />
                        ) : (
                            <div className="talent-avatar__placeholder" />
                        )}
                        <span className="talent-avatar__camera">
                            <i className="fas fa-camera" aria-hidden />
                        </span>
                    </div>
                    <div className="talent-field-grid">
                        <div>
                            <span className="talent-field__label">First name</span>
                            <p className="talent-field__value">{profile.first_name}</p>
                        </div>
                        <div>
                            <span className="talent-field__label">Last name</span>
                            <p className="talent-field__value">{profile.last_name}</p>
                        </div>
                        <div>
                            <span className="talent-field__label">Postal address</span>
                            <p className="talent-field__value">{profile.postal_address || '—'}</p>
                        </div>
                        <div>
                            <span className="talent-field__label">Email address</span>
                            <p className="talent-field__value">{profile.email}</p>
                        </div>
                        <div>
                            <span className="talent-field__label">Phone number</span>
                            <p className="talent-field__value">{profile.phone_number || '—'}</p>
                        </div>
                        <div>
                            <span className="talent-field__label">Birthday</span>
                            <p className="talent-field__value">{profile.birthday || '—'}</p>
                        </div>
                    </div>
                </div>
            </section>

            <div className="talent-profile-split">
                <section className="talent-card" aria-labelledby="bio-heading">
                    <div className="talent-card__head">
                        <h2 className="talent-card__title" id="bio-heading">
                            Biography
                        </h2>
                        <button
                            type="button"
                            className="talent-card__action"
                            onClick={() => setBioOpen(true)}
                        >
                            <span>Edit</span>
                            <i className="fas fa-pencil-alt" aria-hidden />
                        </button>
                    </div>
                    <p className="talent-bio__body">
                        {profile.biography?.trim() ? profile.biography : 'No biography yet.'}
                    </p>
                    <div className="talent-bio__footer">
                        <span>
                            Resume:{' '}
                            {resumeHref ? (
                                <a
                                    href={resumeHref}
                                    className="talent-bio__resume-link"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Open / download
                                </a>
                            ) : (
                                <span className="talent-bio__resume-missing">Not uploaded</span>
                            )}
                        </span>
                        <input
                            ref={resumeInputRef}
                            type="file"
                            accept="application/pdf"
                            className="talent-bio__file-input"
                            aria-hidden
                            tabIndex={-1}
                            onChange={handleResumeChange}
                        />
                        <button
                            type="button"
                            className="talent-bio__upload"
                            disabled={resumeUploading}
                            onClick={() => resumeInputRef.current?.click()}
                        >
                            {resumeUploading ? 'Uploading…' : 'Upload new resume'}
                            <i className="fas fa-upload" aria-hidden />
                        </button>
                    </div>
                </section>

                <section className="talent-card" aria-labelledby="quals-heading">
                    <div className="talent-card__head">
                        <h2 className="talent-card__title" id="quals-heading">
                            Approved qualifications
                        </h2>
                        <button
                            type="button"
                            className="talent-card__action"
                            onClick={() => setQualsOpen(true)}
                        >
                            <span>Manage</span>
                            <i className="fas fa-plus-circle" aria-hidden />
                        </button>
                    </div>
                    {qualifications.length === 0 ? (
                        <p className="talent-quals__empty">No approved qualifications yet.</p>
                    ) : (
                        <ul className="talent-quals__list">
                            {qualifications.map((q) => (
                                <li key={q.id}>{q.position_type?.name ?? `Qualification #${q.id}`}</li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>

            {personalOpen ? (
                <EditPersonalInfoModal
                    open
                    profile={profile}
                    token={token}
                    onClose={() => setPersonalOpen(false)}
                    onSaved={refetch}
                />
            ) : null}

            {bioOpen ? (
                <EditBiographyModal
                    open
                    profile={profile}
                    token={token}
                    onClose={() => setBioOpen(false)}
                    onSaved={refetch}
                />
            ) : null}

            {qualsOpen ? (
                <ManageQualificationsModal
                    open
                    token={token}
                    onClose={() => setQualsOpen(false)}
                    onSaved={refetch}
                />
            ) : null}
        </div>
    );
}
