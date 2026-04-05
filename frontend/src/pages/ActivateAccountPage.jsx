import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { activateWithResetToken } from '../lib/api.js';
import { isValidPassword, PASSWORD_HINT } from '../lib/passwordValidation.js';
import AuthFormSection from '../components/marketing/AuthFormSection.jsx';
import FormTextField from '../components/marketing/FormTextField.jsx';
import styles from '../styles/MarketingForms.module.css';

function ActivateAccountPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [changePassword, setChangePassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const s = location.state;
        if (s?.email) setEmail(s.email);
        if (s?.resetToken) setResetToken(s.resetToken);
    }, [location.state]);

    async function handleSubmit(event) {
        event.preventDefault();
        setError('');
        setLoading(true);

        const trimmedEmail = email.trim();
        const trimmedToken = resetToken.trim();
        if (!trimmedEmail || !trimmedToken) {
            setError('Enter the email you registered with and the activation token.');
            setLoading(false);
            return;
        }

        if (changePassword) {
            if (!isValidPassword(newPassword)) {
                setError(`Password does not meet requirements. ${PASSWORD_HINT}`);
                setLoading(false);
                return;
            }
        }

        try {
            const body = changePassword
                ? { email: trimmedEmail, password: newPassword }
                : { email: trimmedEmail };
            await activateWithResetToken(trimmedToken, body);
            navigate('/login', {
                replace: true,
                state: {
                    postActivationMessage:
                        'Your account is activated. Sign in with the same email and password you used when registering (unless you set a new one above).',
                },
            });
        } catch (err) {
            setError(err.message || 'Activation failed.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthFormSection
            title="Activate your account"
            intro="New talent and practice accounts stay inactive until you confirm this step once. Use the activation token shown after signup (check the success message if you still have that page open)."
            footer={
                <p className={styles.formHint}>
                    <Link to="/login">Back to login</Link> · <Link to="/signup">Talent signup</Link> ·{' '}
                    <Link to="/signup/business">Practice signup</Link>
                </p>
            }
        >
            <form className={styles.authForm} onSubmit={handleSubmit}>
                <FormTextField
                    label="Email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <FormTextField
                    label="Activation token"
                    name="resetToken"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    required
                />
                <label className={styles.checkboxRow}>
                    <input
                        type="checkbox"
                        checked={changePassword}
                        onChange={(e) => setChangePassword(e.target.checked)}
                    />
                    <span>Set a new password (optional)</span>
                </label>
                {changePassword ? (
                    <>
                        <FormTextField
                            label="New password"
                            name="newPassword"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                        />
                        <p className={styles.formHint}>{PASSWORD_HINT}</p>
                    </>
                ) : null}
                {error ? <p className={styles.error}>{error}</p> : null}
                <button className={`${styles.btn} ${styles.btnPrimary}`} type="submit" disabled={loading}>
                    {loading ? 'Activating…' : 'Activate account'}
                </button>
            </form>
        </AuthFormSection>
    );
}

export default ActivateAccountPage;
