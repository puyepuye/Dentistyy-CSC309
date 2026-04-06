import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signupRegularUser } from '../lib/api.js';
import { isValidPassword, PASSWORD_HINT } from '../lib/passwordValidation.js';
import AuthFormSection from '../components/marketing/AuthFormSection.jsx';
import FormTextField from '../components/marketing/FormTextField.jsx';
import styles from '../styles/MarketingForms.module.css';

function SignupPage() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone_number: '',
        postal_address: '',
        birthday: '',
        password: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [activationToken, setActivationToken] = useState('');
    const [activationExpiresAt, 
        setActivationExpiresAt] = useState('');


    function updateField(event) {
        const { name, value } = event.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setLoading(true);
        setError('');
        setSuccessMessage('');
        setActivationToken('');
        setActivationExpiresAt('');

        if (formData.password !== passwordConfirm) {
            setError('Passwords do not match.');
            setLoading(false);
            return;
        }

        if (!formData.first_name.trim() || !formData.last_name.trim()) {
            setError('Please enter your first and last name.');
            setLoading(false);
            return;
        }
        if (!formData.birthday || !/^\d{4}-\d{2}-\d{2}$/.test(formData.birthday)) {
            setError('Please choose a valid birthday (YYYY-MM-DD).');
            setLoading(false);
            return;
        }
        if (!isValidPassword(formData.password)) {
            setError(`Password does not meet requirements. ${PASSWORD_HINT}`);
            setLoading(false);
            return;
        }
        const payload = {
            first_name: formData.first_name.trim(),
            last_name: formData.last_name.trim(),
            email: formData.email.trim(),
            phone_number: formData.phone_number.trim(),
            postal_address: formData.postal_address.trim(),
            birthday: formData.birthday.trim(),
            password: formData.password,
        };


        try {
            const result = await signupRegularUser(payload);
            navigate('/activate', {
                replace: true,
                state: {
                    email: formData.email.trim(),
                    resetToken: result.resetToken,
                },
            });
            setActivationToken(result.resetToken ?? '');
            setActivationExpiresAt(result.expiresAt ?? '');
        } catch (err) {
            const msg = err.message || 'Sign up failed';
            if (msg === 'Conflict') {
                setError('An account with this email already exists. Try logging in instead.');
            } else if (msg === 'Invalid payload') {
                setError('Please check all fields. Password must meet the strength rules below.');
            } else {
                setError(msg);
            }
        } finally {
            setLoading(false);
        }
    }
    const created = Boolean(successMessage);

    return (
        <AuthFormSection
            title="Sign up as talent"
            intro="Create a professional account to browse and apply to shifts."
            footer={
                <p className={styles.formHint}>
                    Already registered? <Link to="/login">Login</Link> · Listing a practice?{' '}
                    <Link to="/signup/business">Business signup</Link>
                </p>
            }
        >
            <form className={styles.authForm} onSubmit={handleSubmit}>
                <FormTextField
                    label="First name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={updateField}
                    required
                    autoComplete="given-name"
                    disabled={created}
                />
                <FormTextField
                    label="Last name"
                    name="last_name"
                    value={formData.last_name}
                    onChange={updateField}
                    required
                    disabled={created}
                    autoComplete="family-name"
                />
                <FormTextField
                    label="Email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={updateField}
                    required
                    disabled={created}
                    autoComplete="email"
                />
                <FormTextField
                    label="Phone number"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={updateField}
                    disabled={created}
                    autoComplete="tel"
                />
                <FormTextField
                    label="Postal address"
                    name="postal_address"
                    value={formData.postal_address}
                    onChange={updateField}
                    disabled={created}
                    autoComplete="street-address"
                />
                <FormTextField
                    label="Birthday"
                    name="birthday"
                    type="date"
                    value={formData.birthday}
                    onChange={updateField}
                    required
                    disabled={created}
                    autoComplete="bday"
                />
                <FormTextField
                    label="Password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={updateField}
                    required
                    disabled={created}
                    autoComplete="new-password"
                    // minLength={8}
                    maxLength={20}
                />
                <label>
                    Confirm password
                    <input
                        name="password_confirm"
                        type="password"
                        value={passwordConfirm}
                        onChange={(e) => setPasswordConfirm(e.target.value)}
                        required
                        autoComplete="new-password"
                        disabled={created}
                        // minLength={8}
                        maxLength={20}
                    />
                </label>
                <p className={styles.formHint} id="signup-password-hint">
                    {PASSWORD_HINT}
                </p>
                {error && <p className={styles.error}>{error}</p>}
                <button className={`${styles.btn} ${styles.btnPrimary}`} type="submit" disabled={loading}>
                    {loading ? 'Creating account...' : 'Create account'}
                </button>
            </form>
        </AuthFormSection>
    );
}

export default SignupPage;
