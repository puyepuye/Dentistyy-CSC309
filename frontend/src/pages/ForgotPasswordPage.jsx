import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthFormSection from '../components/marketing/AuthFormSection.jsx';
import FormTextField from '../components/marketing/FormTextField.jsx';
import styles from '../styles/MarketingForms.module.css';
import { isValidPassword, PASSWORD_HINT } from '../lib/passwordValidation.js';
import { requestPasswordReset, activateWithResetToken } from '../lib/api.js';

function ForgotPasswordPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [step, setStep] = useState(1); // 1 = enter email, 2 = enter token + new password
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleRequestToken(event) {
        event.preventDefault();
        setError('');
        setLoading(true);
        try {
            const data = await requestPasswordReset(email.trim());
            setResetToken(data.resetToken ?? '');
            setStep(2);
        } catch (err) {
            const msg = err.message || 'Request failed';
            if (err.status === 404) {
                setError('No account found with that email.');
            } else if (err.status === 429) {
                setError('Too many requests. Please wait before trying again.');
            } else {
                setError(msg);
            }
        } finally {
            setLoading(false);
        }
    }

    async function handleResetPassword(event) {
        event.preventDefault();
        setError('');
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (!isValidPassword(newPassword)) {
            setError(`Password does not meet requirements. ${PASSWORD_HINT}`);
            return;
        }
        setLoading(true);
        try {
            await activateWithResetToken(resetToken, { email: email.trim(), password: newPassword });
            navigate('/login', {
                replace: true,
                state: {
                    postActivationMessage: 'Password reset successful. You can now log in with your new password.',
                },
            });
        } catch (err) {
            const msg = err.message || 'Reset failed';
            if (err.status === 401) {
                setError('Email does not match the reset token.');
            } else if (err.status === 410) {
                setError('This reset link has expired. Please request a new one.');
            } else {
                setError(msg);
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthFormSection
            title="Reset password"
            intro={
                step === 1
                    ? 'Enter your email and we will generate a reset token for you.'
                    : 'A reset token has been generated. Enter your new password below.'
            }
            footer={
                <p className={styles.formHint}>
                    <Link to="/login">Back to login</Link>
                </p>
            }
        >
            {step === 1 ? (
                <form className={styles.authForm} onSubmit={handleRequestToken}>
                    <FormTextField
                        label="Email"
                        name="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                    />
                    {error ? <p className={styles.error}>{error}</p> : null}
                    <button className={`${styles.btn} ${styles.btnPrimary}`} type="submit" disabled={loading}>
                        {loading ? 'Sending…' : 'Get reset token'}
                    </button>
                </form>
            ) : (
                <form className={styles.authForm} onSubmit={handleResetPassword}>
                    <FormTextField
                        label="New password"
                        name="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        maxLength={20}
                        autoComplete="new-password"
                    />
                    <FormTextField
                        label="Confirm new password"
                        name="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        maxLength={20}
                        autoComplete="new-password"
                    />
                    <p className={styles.formHint}>{PASSWORD_HINT}</p>
                    {error ? <p className={styles.error}>{error}</p> : null}
                    <button className={`${styles.btn} ${styles.btnPrimary}`} type="submit" disabled={loading}>
                        {loading ? 'Resetting…' : 'Reset password'}
                    </button>
                </form>
            )}
        </AuthFormSection>
    );
}

export default ForgotPasswordPage;