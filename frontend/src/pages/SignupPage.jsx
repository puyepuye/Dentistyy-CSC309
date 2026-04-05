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

    function updateField(event) {
        const { name, value } = event.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setLoading(true);
        setError('');
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

        try {
            const result = await signupRegularUser(formData);
            navigate('/activate', {
                replace: true,
                state: {
                    email: formData.email.trim(),
                    resetToken: result.resetToken,
                },
            });
        } catch (err) {
            const base = err.message || 'Request failed';
            setError(
                base === 'Invalid payload'
                    ? `${base}. ${PASSWORD_HINT} Also check that your email looks valid.`
                    : base
            );
        } finally {
            setLoading(false);
        }
    }

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
                />
                <FormTextField
                    label="Last name"
                    name="last_name"
                    value={formData.last_name}
                    onChange={updateField}
                    required
                />
                <FormTextField
                    label="Email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={updateField}
                    required
                />
                <FormTextField
                    label="Phone number"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={updateField}
                />
                <FormTextField
                    label="Postal address"
                    name="postal_address"
                    value={formData.postal_address}
                    onChange={updateField}
                />
                <FormTextField
                    label="Birthday"
                    name="birthday"
                    type="date"
                    value={formData.birthday}
                    onChange={updateField}
                    required
                />
                <FormTextField
                    label="Password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={updateField}
                    required
                />
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
